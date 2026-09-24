"use client";

import { useEffect, useState } from "react";
import { school } from "@/config/school";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type ClassRecord = { id: string; standard: number; section: string };
type TimetableEntry = { day: string; period: number; subject: { name: string } | null };

export function TimetableView() {
  const [standard, setStandard] = useState("");
  const [section, setSection] = useState("");
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadClasses() {
      const { data, error } = await createSupabaseBrowserClient().from("classes").select("id, standard, section").eq("is_active", true).order("standard").order("section");
      if (error) { setMessage("Timetable data is not available yet."); setLoading(false); return; }
      const nextClasses = (data ?? []) as ClassRecord[];
      setClasses(nextClasses);
      if (nextClasses.length) { setStandard(String(nextClasses[0].standard)); setSection(nextClasses[0].section); }
      setLoading(false);
    }
    loadClasses();
  }, []);

  useEffect(() => {
    if (loading) return;
    async function loadTimetable() {
      const selectedClass = classes.find((item) => item.standard === Number(standard) && item.section === section);
      if (!selectedClass) { setEntries([]); setMessage("No timetable has been published for this class and section."); return; }
      const { data, error } = await createSupabaseBrowserClient().from("class_timetables").select("day, period, subject:subjects(name)").eq("class_id", selectedClass.id);
      if (error) { setMessage("Timetable data is not available yet."); return; }
      setEntries((data ?? []) as unknown as TimetableEntry[]); setMessage(data?.length ? "" : "No timetable has been published for this class and section.");
    }
    loadTimetable();
  }, [classes, loading, section, standard]);

  const availableStandards = [...new Set(classes.map((item) => item.standard))];
  const availableSections = classes.filter((item) => item.standard === Number(standard)).map((item) => item.section);
  const subjectFor = (day: string, period: number) => entries.find((entry) => entry.day === day.toLowerCase() && entry.period === period)?.subject?.name ?? "—";

  if (!loading && !classes.length) return <p role="status" className="rounded bg-slate-100 p-4 text-slate-600">No class timetables have been published yet.</p>;

  return <><div className="mb-6 flex flex-wrap gap-3"><label>Standard<select value={standard} onChange={(event) => { const nextStandard = event.target.value; setStandard(nextStandard); setSection(classes.find((item) => item.standard === Number(nextStandard))?.section ?? ""); }} className="ml-2 rounded border p-2">{availableStandards.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Section<select value={section} onChange={(event) => setSection(event.target.value)} className="ml-2 rounded border p-2">{availableSections.map((value) => <option key={value}>{value}</option>)}</select></label></div>{message && <p role="status" className="mb-4 rounded bg-slate-100 p-3 text-slate-600">{message}</p>}<section className="overflow-x-auto rounded-xl border"><div className="min-w-175 p-5"><h2 className="text-xl font-bold">Time table – STD {standard}{section ? ` · Section ${section}` : ""}</h2><p className="text-sm text-slate-600">{school.name} · {school.session}</p><table className="mt-5 w-full border-collapse text-left text-sm"><thead><tr className="bg-slate-100"><th className="border p-3">Period</th>{days.map((day) => <th key={day} className="border p-3">{day}</th>)}</tr></thead><tbody>{Array.from({ length: 8 }, (_, index) => <tr key={index + 1}><th className="border p-3">Period {index + 1}</th>{days.map((day) => <td key={day} className="border p-3">{day === "Saturday" && index > 3 ? "—" : subjectFor(day, index + 1)}</td>)}</tr>)}</tbody></table></div></section></>;
}
