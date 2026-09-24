"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type Day = (typeof days)[number];
type Subject = { id: string; name: string };
type Teacher = { id: string; full_name: string };
type ClassRecord = { id: string; standard: number; section: string; is_published: boolean };
type Slot = { subjectId: string; teacherId: string };
type TimetableRow = { day: Day; period: number; subject_id: string | null; teacher_id: string | null };

function cellKey(day: Day, period: number) {
  return `${day}-${period}`;
}

function blankGrid() {
  return Object.fromEntries(days.flatMap((day) => Array.from({ length: 8 }, (_, index) => [cellKey(day, index + 1), { subjectId: "", teacherId: "" }]))) as Record<string, Slot>;
}

export default function TimetablesAdminPage() {
  const [standard, setStandard] = useState("1");
  const [section, setSection] = useState("A");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grid, setGrid] = useState<Record<string, Slot>>(blankGrid);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const loadOptions = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const [{ data: subjectData, error: subjectError }, { data: teacherData, error: teacherError }] = await Promise.all([
      supabase.from("subjects").select("id, name").eq("is_active", true).order("name"),
      supabase.from("teachers").select("id, full_name").order("full_name"),
    ]);
    if (subjectError || teacherError) { setStatus(subjectError?.message ?? teacherError?.message ?? "Unable to load setup data."); return; }
    setSubjects((subjectData ?? []) as Subject[]); setTeachers((teacherData ?? []) as Teacher[]); setLoading(false);
  }, []);

  const loadTimetable = useCallback(async () => {
    setLoading(true); setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: classData, error: classError } = await supabase.from("classes").select("id, standard, section, is_published").eq("standard", Number(standard)).eq("section", section.trim()).maybeSingle();
    if (classError) { setStatus(classError.message); setLoading(false); return; }
    if (!classData) { setGrid(blankGrid()); setIsPublished(false); setStatus("This class/section has no saved timetable yet. Fill the grid and click Save."); setLoading(false); return; }
    const { data, error } = await supabase.from("class_timetables").select("day, period, subject_id, teacher_id").eq("class_id", (classData as ClassRecord).id);
    if (error) { setStatus(error.message); setLoading(false); return; }
    const nextGrid = blankGrid();
    ((data ?? []) as TimetableRow[]).forEach((row) => { nextGrid[cellKey(row.day, row.period)] = { subjectId: row.subject_id ?? "", teacherId: row.teacher_id ?? "" }; });
    setGrid(nextGrid); setIsPublished((classData as ClassRecord).is_published); setStatus(`Saved timetable loaded. It is currently ${(classData as ClassRecord).is_published ? "public" : "private"}.`); setLoading(false);
  }, [section, standard]);

  useEffect(() => { loadOptions(); }, [loadOptions]);
  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  function updateSlot(key: string, field: keyof Slot, value: string) {
    setGrid((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    const { data, error } = await createSupabaseBrowserClient().from("subjects").insert({ name }).select("id, name").single();
    if (error || !data) { setStatus(error?.message ?? "Unable to add subject."); return; }
    setSubjects((current) => [...current, data as Subject].sort((left, right) => left.name.localeCompare(right.name)));
    setNewSubjectName(""); setStatus(`Subject "${name}" added.`);
  }

  function beginSubjectEdit(subject: Subject) {
    setEditingSubjectId(subject.id); setEditingSubjectName(subject.name);
  }
  async function saveSubjectEdit(subjectId: string) {
    const name = editingSubjectName.trim();
    if (!name) { setStatus("A subject name is required."); return; }
    const { data, error } = await createSupabaseBrowserClient().from("subjects").update({ name }).eq("id", subjectId).select("id, name").single();
    if (error || !data) { setStatus(error?.message ?? "Unable to update subject."); return; }
    setSubjects((current) => current.map((subject) => subject.id === subjectId ? data as Subject : subject).sort((left, right) => left.name.localeCompare(right.name)));
    setEditingSubjectId(null); setEditingSubjectName(""); setStatus("Subject updated.");
  }
  async function removeSubject(subject: Subject) {
    if (!window.confirm(`Delete ${subject.name}? This cannot be undone.`)) return;
    const { error } = await createSupabaseBrowserClient().from("subjects").delete().eq("id", subject.id);
    if (error) { setStatus(`Cannot delete this subject: ${error.message}`); return; }
    setSubjects((current) => current.filter((item) => item.id !== subject.id));
    setGrid((current) => Object.fromEntries(Object.entries(current).map(([key, slot]) => [key, slot.subjectId === subject.id ? { ...slot, subjectId: "" } : slot])));
    setStatus("Subject deleted.");
  }

  async function saveTimetable() {
    const normalizedSection = section.trim();
    if (!normalizedSection) { setStatus("Enter a section, such as A or B."); return; }
    setSaving(true); setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: classData, error: classError } = await supabase.from("classes").upsert({ standard: Number(standard), section: normalizedSection, is_active: true, is_published: isPublished }, { onConflict: "standard,section" }).select("id").single();
    if (classError || !classData) { setStatus(classError?.message ?? "Unable to save class section."); setSaving(false); return; }
    const classId = (classData as { id: string }).id;
    const rows = days.flatMap((day) => Array.from({ length: 8 }, (_, index) => {
      const period = index + 1; const slot = grid[cellKey(day, period)];
      return { class_id: classId, day, period, subject_id: day === "saturday" && period > 4 ? null : slot.subjectId || null, teacher_id: day === "saturday" && period > 4 ? null : slot.teacherId || null, created_by: user?.id };
    }));
    const { error: saveError } = await supabase.from("class_timetables").upsert(rows, { onConflict: "class_id,day,period" });
    if (saveError) {
      const conflict = saveError.code === "23505" ? "A teacher is already scheduled for another class at the same day and period. Change that teacher assignment and save again." : saveError.message;
      setStatus(`Timetable was not saved: ${conflict}`); setSaving(false); return;
    }
    setStatus(`Timetable saved successfully and is ${isPublished ? "published publicly" : "private"}.`); setSaving(false);
  }

  return <AdminPage title="Class timetable editor" description="Choose a class and section, fill each subject/teacher cell, then save. Saturday periods 5–8 are intentionally unavailable.">
    <div className="grid gap-6 xl:grid-cols-[1fr_19rem]"><section className="min-w-0 rounded-xl bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-end gap-4"><label>Standard<select value={standard} onChange={(event) => setStandard(event.target.value)} className="mt-1 block rounded border p-2">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><label>Section<input value={section} onChange={(event) => setSection(event.target.value.toUpperCase())} maxLength={20} className="mt-1 block w-24 rounded border p-2" /></label><label className="flex items-center gap-2"><input checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} type="checkbox" /> Publish timetable</label><button onClick={loadTimetable} className="rounded border px-4 py-2 font-semibold">Load timetable</button><button onClick={saveTimetable} disabled={saving || loading} className="rounded bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save timetable"}</button></div>
      {status && <p role="status" className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-900">{status}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-300 border-collapse text-left text-sm"><thead><tr className="bg-slate-100"><th className="border p-2">Period</th>{days.map((day) => <th key={day} className="border p-2 capitalize">{day}</th>)}</tr></thead><tbody>{Array.from({ length: 8 }, (_, index) => { const period = index + 1; return <tr key={period}><th className="border p-2">Period {period}</th>{days.map((day) => { const locked = day === "saturday" && period > 4; const key = cellKey(day, period); const slot = grid[key]; return <td key={day} className="min-w-44 border p-2">{locked ? <span className="text-slate-400">—</span> : <div className="grid gap-2"><label className="sr-only" htmlFor={`${key}-subject`}>Subject for {day} period {period}</label><select id={`${key}-subject`} value={slot.subjectId} onChange={(event) => updateSlot(key, "subjectId", event.target.value)} className="w-full rounded border p-2"><option value="">No subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><label className="sr-only" htmlFor={`${key}-teacher`}>Teacher for {day} period {period}</label><select id={`${key}-teacher`} value={slot.teacherId} onChange={(event) => updateSlot(key, "teacherId", event.target.value)} className="w-full rounded border p-2"><option value="">No teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></div>}</td>; })}</tr>; })}</tbody></table></div></section>
      <aside className="rounded-xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Subjects</h2><p className="mt-2 text-sm text-slate-600">Add, edit, or delete subjects used in every timetable.</p><form onSubmit={addSubject} className="mt-4 grid gap-3"><label>New subject<input required name="subject" value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} maxLength={80} className="mt-1 w-full rounded border p-2" placeholder="e.g. Maths" /></label><button className="rounded border border-blue-700 p-2 font-semibold text-blue-700">Add subject</button></form><div className="mt-6 max-h-100 overflow-y-auto border-t pt-3">{subjects.length ? subjects.map((subject) => <div key={subject.id} className="flex items-center gap-2 border-b py-2 text-sm">{editingSubjectId === subject.id ? <><input autoFocus value={editingSubjectName} onChange={(event) => setEditingSubjectName(event.target.value)} maxLength={80} className="min-w-0 flex-1 rounded border p-1" /><button onClick={() => saveSubjectEdit(subject.id)} className="font-semibold text-blue-700">Save</button><button onClick={() => { setEditingSubjectId(null); setEditingSubjectName(""); }} className="font-semibold">Cancel</button></> : <><span className="min-w-0 flex-1 truncate">{subject.name}</span><button onClick={() => beginSubjectEdit(subject)} className="font-semibold text-blue-700">Edit</button><button onClick={() => removeSubject(subject)} className="font-semibold text-red-700">Delete</button></>}</div>) : <p className="text-sm text-slate-600">No subjects saved yet.</p>}</div><p className="mt-6 text-sm text-slate-600">Add teachers in the Teachers area. If the same teacher is selected for two classes at the same day/period, saving is blocked.</p></aside>
    </div>
  </AdminPage>;
}
