import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { school, schoolSeed } from "@/config/school";

const MAX_MESSAGE_LENGTH = 500;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

type LiveData = {
  holidays: { title: string; starts_on: string; ends_on: string }[];
  timetables: { day: string; period: number; subject: { name: string } | null }[];
};

function unknownAnswer() {
  return `Please contact the school office at ${school.phone} or ${school.email}.`;
}

function findFaqAnswer(message: string) {
  const normalized = message.toLowerCase();
  return schoolSeed.faqs.find((faq) =>
    faq.question.toLowerCase().split(/\W+/).some((word) => word.length > 3 && normalized.includes(word)),
  )?.answer;
}

async function getLiveData(message: string): Promise<LiveData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const normalized = message.toLowerCase();
  if (normalized.includes("holiday")) {
    const { data } = await supabase.from("holidays").select("title, starts_on, ends_on").eq("is_public", true).gte("ends_on", new Date().toISOString().slice(0, 10)).order("starts_on").limit(5);
    return { holidays: data ?? [], timetables: [] };
  }
  if (normalized.includes("timetable") || normalized.includes("time table")) {
    const standard = Number(normalized.match(/\b(?:std|standard|class)\s*(\d{1,2})\b/)?.[1]);
    if (!Number.isInteger(standard) || standard < 1 || standard > 12) return { holidays: [], timetables: [] };
    const { data: classData } = await supabase.from("classes").select("id").eq("standard", standard).eq("is_active", true).limit(1).maybeSingle();
    if (!classData) return { holidays: [], timetables: [] };
    const { data } = await supabase.from("class_timetables").select("day, period, subject:subjects(name)").eq("class_id", classData.id).order("period").limit(48);
    return { holidays: [], timetables: (data ?? []) as unknown as LiveData["timetables"] };
  }
  return null;
}

function formatLiveAnswer(data: LiveData) {
  if (data.holidays.length) return `Upcoming holidays: ${data.holidays.map((holiday) => `${holiday.title} (${holiday.starts_on}${holiday.ends_on !== holiday.starts_on ? ` to ${holiday.ends_on}` : ""})`).join("; ")}.`;
  if (data.timetables.length) return `Timetable entries: ${data.timetables.map((entry) => `${entry.day}, period ${entry.period}: ${entry.subject?.name ?? "—"}`).join("; ")}.`;
  return null;
}

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null);
  const message = typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ answer: unknownAnswer() }, { status: 400 });
  }

  const faqAnswer = findFaqAnswer(message);
  if (faqAnswer) return NextResponse.json({ answer: faqAnswer, source: "faq" });

  const liveData = await getLiveData(message);
  const liveAnswer = liveData && formatLiveAnswer(liveData);
  if (liveAnswer) return NextResponse.json({ answer: liveAnswer, source: "live-data" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ answer: unknownAnswer(), source: "fallback" });

  const prompt = `You are the public website assistant for ${school.name}. Answer only using the approved facts below. Do not invent policies, fees, dates, contact details, or personal information. If the answer is unavailable, reply exactly: "${unknownAnswer()}".

Approved school information:
School session: ${school.session}
Address: ${school.address}
Phone: ${school.phone}
Email: ${school.email}
FAQs:
${schoolSeed.faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n")}

Visitor question: ${message}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 250 } }),
    });
    if (!response.ok) return NextResponse.json({ answer: unknownAnswer(), source: "fallback" });
    const data: unknown = await response.json();
    const answer = typeof data === "object" && data && "candidates" in data && Array.isArray(data.candidates)
      ? data.candidates[0]?.content?.parts?.[0]?.text
      : null;
    if (typeof answer !== "string" || !answer.trim()) return NextResponse.json({ answer: unknownAnswer(), source: "fallback" });
    return NextResponse.json({ answer: answer.trim(), source: "gemini" });
  } catch {
    return NextResponse.json({ answer: unknownAnswer(), source: "fallback" });
  }
}
