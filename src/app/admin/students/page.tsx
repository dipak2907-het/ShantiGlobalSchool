"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { downloadCsv } from "@/lib/csv";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ClassRecord = { id: string; standard: number; section: string; is_active: boolean };
type Student = {
  id: string; full_name: string; date_of_birth: string; gender: string; class_id: string; roll_number: string;
  parent_name: string; parent_phone: string; address: string; admission_date: string; classes: ClassRecord | null;
};
type StudentDraft = Omit<Student, "id" | "classes">;

const emptyDraft: StudentDraft = {
  full_name: "", date_of_birth: "", gender: "female", class_id: "", roll_number: "",
  parent_name: "", parent_phone: "", address: "", admission_date: "",
};

export default function StudentsAdminPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [draft, setDraft] = useState<StudentDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const [studentResult, classResult] = await Promise.all([
      supabase.from("students").select("id, full_name, date_of_birth, gender, class_id, roll_number, parent_name, parent_phone, address, admission_date, classes(id, standard, section, is_active)").order("full_name"),
      supabase.from("classes").select("id, standard, section, is_active").order("standard").order("section"),
    ]);
    if (studentResult.error || classResult.error) {
      setStatus(studentResult.error?.message ?? classResult.error?.message ?? "Unable to load student records.");
    } else {
      setStudents((studentResult.data ?? []) as unknown as Student[]);
      setClasses((classResult.data ?? []) as ClassRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => [student.full_name, student.roll_number, student.parent_name, student.parent_phone, student.classes ? `${student.classes.standard} ${student.classes.section}` : ""]
      .some((value) => value.toLowerCase().includes(term)));
  }, [query, students]);

  function change(field: keyof StudentDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function beginEdit(student: Student) {
    setEditingId(student.id);
    setDraft({
      full_name: student.full_name, date_of_birth: student.date_of_birth, gender: student.gender, class_id: student.class_id,
      roll_number: student.roll_number, parent_name: student.parent_name, parent_phone: student.parent_phone,
      address: student.address, admission_date: student.admission_date,
    });
    setStatus("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.class_id) { setStatus("Select a class and section."); return; }
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const record = { ...draft, full_name: draft.full_name.trim(), roll_number: draft.roll_number.trim(), parent_name: draft.parent_name.trim(), parent_phone: draft.parent_phone.trim(), address: draft.address.trim() };
    const { error } = editingId
      ? await supabase.from("students").update(record).eq("id", editingId)
      : await supabase.from("students").insert({ ...record, created_by: user?.id });
    if (error) { setStatus(error.message); return; }
    setStatus(editingId ? "Student updated." : "Student saved privately.");
    cancelEdit();
    await loadData();
  }

  async function removeStudent(student: Student) {
    if (!window.confirm(`Delete ${student.full_name}'s student record? This cannot be undone.`)) return;
    const { error } = await createSupabaseBrowserClient().from("students").delete().eq("id", student.id);
    if (error) { setStatus(`Cannot delete this student: ${error.message}`); return; }
    if (editingId === student.id) cancelEdit();
    setStatus("Student deleted.");
    await loadData();
  }

  function exportStudents() {
    downloadCsv("students.csv",
      ["Name", "Date of birth", "Gender", "Standard", "Section", "Roll number", "Parent", "Phone", "Address", "Admission date"],
      filteredStudents.map((student) => [
        student.full_name, student.date_of_birth, student.gender, student.classes?.standard ?? "", student.classes?.section ?? "",
        student.roll_number, student.parent_name, student.parent_phone, student.address, student.admission_date,
      ]));
  }

  return <AdminPage title="Students" description="Private records: only principal/admin accounts can access these details.">
    <div className="grid gap-6 xl:grid-cols-[25rem_1fr]">
      <form onSubmit={submit} className="grid h-fit gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-xl font-bold">{editingId ? "Edit student" : "Add student"}</h2>
        <label className="sm:col-span-2">Student name<input required value={draft.full_name} onChange={(event) => change("full_name", event.target.value)} maxLength={120} className="mt-1 w-full rounded border p-3" /></label>
        <label>Date of birth<input required type="date" value={draft.date_of_birth} onChange={(event) => change("date_of_birth", event.target.value)} className="mt-1 w-full rounded border p-3" /></label>
        <label>Gender<select required value={draft.gender} onChange={(event) => change("gender", event.target.value)} className="mt-1 w-full rounded border p-3"><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
        <label className="sm:col-span-2">Class and section<select required value={draft.class_id} onChange={(event) => change("class_id", event.target.value)} className="mt-1 w-full rounded border p-3"><option value="">Select a class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.standard} {item.section}{item.is_active ? "" : " (inactive)"}</option>)}</select></label>
        <label>Roll number<input required value={draft.roll_number} onChange={(event) => change("roll_number", event.target.value)} maxLength={30} className="mt-1 w-full rounded border p-3" /></label>
        <label>Admission date<input required type="date" value={draft.admission_date} onChange={(event) => change("admission_date", event.target.value)} className="mt-1 w-full rounded border p-3" /></label>
        <label>Parent name<input required value={draft.parent_name} onChange={(event) => change("parent_name", event.target.value)} maxLength={120} className="mt-1 w-full rounded border p-3" /></label>
        <label>Parent phone<input required value={draft.parent_phone} onChange={(event) => change("parent_phone", event.target.value)} inputMode="tel" maxLength={30} className="mt-1 w-full rounded border p-3" /></label>
        <label className="sm:col-span-2">Address<textarea required value={draft.address} onChange={(event) => change("address", event.target.value)} maxLength={1000} className="mt-1 w-full rounded border p-3" /></label>
        <div className="flex gap-3 sm:col-span-2"><button className="rounded bg-blue-700 px-4 py-3 font-bold text-white">{editingId ? "Update student" : "Save student"}</button>{editingId && <button type="button" onClick={cancelEdit} className="rounded border px-4 py-3 font-semibold">Cancel</button>}</div>
        {status && <p role="status" className="sm:col-span-2 text-sm text-slate-700">{status}</p>}
      </form>
      <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Student records</h2><p className="text-sm text-slate-600">{filteredStudents.length} shown</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, class, parent…" className="rounded border p-2" /><button type="button" onClick={exportStudents} className="rounded border border-blue-700 px-3 py-2 font-semibold text-blue-700">Export CSV</button></div></div>
        {loading ? <p className="mt-4">Loading…</p> : <table className="mt-4 w-full min-w-[58rem] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Roll</th><th className="p-3">Parent</th><th className="p-3">Phone</th><th className="p-3">Actions</th></tr></thead><tbody>{filteredStudents.length ? filteredStudents.map((student) => <tr key={student.id}><td className="border-t p-3 font-semibold">{student.full_name}<span className="block font-normal text-slate-500">{student.admission_date}</span></td><td className="border-t p-3">{student.classes ? `${student.classes.standard} ${student.classes.section}` : "—"}</td><td className="border-t p-3">{student.roll_number}</td><td className="border-t p-3">{student.parent_name}</td><td className="border-t p-3">{student.parent_phone}</td><td className="border-t p-3"><div className="flex gap-3"><button type="button" onClick={() => beginEdit(student)} className="font-semibold text-blue-700">Edit</button><button type="button" onClick={() => removeStudent(student)} className="font-semibold text-red-700">Delete</button></div></td></tr>) : <tr><td colSpan={6} className="border-t p-4 text-slate-600">No students match this search.</td></tr>}</tbody></table>}
      </section>
    </div>
  </AdminPage>;
}
