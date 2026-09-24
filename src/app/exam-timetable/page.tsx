"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Exam = { id: string; standard: number; exam_name: string; subject_label: string | null; exam_date: string; starts_at: string | null; ends_at: string | null; instructions: string | null; subject: { name: string } | null };

export default function ExamTimetablePage() {
  const [standard, setStandard] = useState("1");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      const { data } = await createSupabaseBrowserClient().from("exam_timetables").select("id, standard, exam_name, subject_label, exam_date, starts_at, ends_at, instructions, subject:subjects(name)").eq("standard", Number(standard)).order("exam_date");
      setExams((data ?? []) as unknown as Exam[]);
      setLoading(false);
    }
    void loadExams();
  }, [standard]);
  return <PageShell><PageHeading title="Exam timetable" description="Select a standard to see the examination timetable." /><label>Standard<select value={standard} onChange={(event) => setStandard(event.target.value)} className="ml-2 rounded border p-2">{Array.from({ length: 12 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label><div className="mt-6 overflow-x-auto rounded-xl border"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="p-4">Exam</th><th className="p-4">Subject</th><th className="p-4">Date</th><th className="p-4">Time</th><th className="p-4">Instructions</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-4">Loading timetable...</td></tr> : exams.length ? exams.map((exam) => <tr key={exam.id}><td className="border-t p-4">{exam.exam_name}</td><td className="border-t p-4">{exam.subject?.name ?? exam.subject_label ?? "—"}</td><td className="border-t p-4">{exam.exam_date}</td><td className="border-t p-4">{exam.starts_at ?? "—"}{exam.ends_at ? ` - ${exam.ends_at}` : ""}</td><td className="border-t p-4">{exam.instructions ?? "—"}</td></tr>) : <tr><td colSpan={5} className="p-4 text-slate-600">No exam timetable has been published for Standard {standard}.</td></tr>}</tbody></table></div></PageShell>;
}
