"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Notice = { title: string; published_at: string };
type Event = { title: string; description: string | null };

export function HomeHighlights({ variant }: { variant: "notice" | "event" }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  useEffect(() => {
    async function loadHighlights() {
      const supabase = createSupabaseBrowserClient();
      const [{ data: noticeData }, { data: eventData }] = await Promise.all([
        supabase.from("notices").select("title, published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("events").select("title, description").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
      ]);
      setNotice(noticeData as Notice | null);
      setEvent(eventData as Event | null);
    }
    void loadHighlights();
  }, []);
  if (variant === "notice") return <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4" aria-label="Latest notice"><p className="text-sm font-bold text-blue-800">Latest notice{notice ? ` · ${new Date(notice.published_at).toLocaleDateString()}` : ""}</p>{notice ? <Link href="/notices" className="mt-1 block font-semibold hover:underline">{notice.title}</Link> : <p className="mt-1">No notices are available.</p>}</section>;
  return <article className="rounded-xl bg-slate-100 p-6"><p className="text-sm font-bold text-blue-700">Upcoming event</p><h2 className="mt-2 text-2xl font-bold">{event?.title ?? "No upcoming events"}</h2>{event?.description && <p className="mt-2 text-slate-600">{event.description}</p>}<Link href="/events" className="mt-4 inline-block font-semibold text-blue-700">View events →</Link></article>;
}
