"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Teacher = { id: string; full_name: string; qualification: string; experience_years: number; biography: string | null; photo_path: string | null; is_public: boolean };
type TeacherDraft = Omit<Teacher, "id" | "photo_path">;
const emptyDraft: TeacherDraft = { full_name: "", qualification: "", experience_years: 0, biography: "", is_public: false };

export default function TeachersAdminPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [draft, setDraft] = useState<TeacherDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const loadTeachers = useCallback(async () => {
    const { data, error } = await createSupabaseBrowserClient().from("teachers").select("id, full_name, qualification, experience_years, biography, photo_path, is_public").order("full_name");
    if (error) setStatus(error.message); else setTeachers((data ?? []) as Teacher[]);
    setLoading(false);
  }, []);
  useEffect(() => { void loadTeachers(); }, [loadTeachers]);

  function change(field: keyof TeacherDraft, value: string | number | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }
  function beginEdit(teacher: Teacher) {
    setEditingId(teacher.id);
    setDraft({ full_name: teacher.full_name, qualification: teacher.qualification, experience_years: teacher.experience_years, biography: teacher.biography ?? "", is_public: teacher.is_public });
    setPhoto(null);
    setPhotoInputKey((current) => current + 1);
    setStatus("");
  }
  function cancelEdit() { setEditingId(null); setDraft(emptyDraft); setPhoto(null); setPhotoInputKey((current) => current + 1); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("");
    if (photo && !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) { setStatus("Use a JPEG, PNG, or WebP photo."); return; }
    if (photo && photo.size > 5 * 1024 * 1024) { setStatus("Teacher photos must be 5 MB or smaller."); return; }
    const supabase = createSupabaseBrowserClient();
    const currentTeacher = editingId ? teachers.find((teacher) => teacher.id === editingId) : null;
    let photoPath = currentTeacher?.photo_path ?? null;
    let uploadedPath: string | null = null;
    if (photo) {
      uploadedPath = `teachers/${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from("school-media").upload(uploadedPath, photo, { contentType: photo.type });
      if (uploadError) { setStatus(`Could not upload photo: ${uploadError.message}`); return; }
      photoPath = uploadedPath;
    }
    const record = { ...draft, biography: draft.biography || null, photo_path: photoPath };
    const { error } = editingId ? await supabase.from("teachers").update(record).eq("id", editingId) : await supabase.from("teachers").insert(record);
    if (error) {
      if (uploadedPath) await supabase.storage.from("school-media").remove([uploadedPath]);
      setStatus(error.message);
      return;
    }
    if (uploadedPath && currentTeacher?.photo_path) {
      const { error: removeError } = await supabase.storage.from("school-media").remove([currentTeacher.photo_path]);
      if (removeError) { setStatus(`Teacher saved, but the previous photo could not be removed: ${removeError.message}`); await loadTeachers(); return; }
    }
    setStatus(editingId ? "Teacher updated." : "Teacher added."); cancelEdit(); await loadTeachers();
  }
  async function removeTeacher(teacher: Teacher) {
    if (!window.confirm(`Delete ${teacher.full_name}? This cannot be undone.`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("teachers").delete().eq("id", teacher.id);
    if (error) { setStatus(`Cannot delete this teacher: ${error.message}`); return; }
    if (teacher.photo_path) {
      const { error: removeError } = await supabase.storage.from("school-media").remove([teacher.photo_path]);
      if (removeError) { setStatus(`Teacher deleted, but their photo could not be removed: ${removeError.message}`); await loadTeachers(); return; }
    }
    if (editingId === teacher.id) cancelEdit();
    setStatus("Teacher deleted."); await loadTeachers();
  }

  return <AdminPage title="Teachers" description="Add, edit, or delete teacher records. Teachers saved here appear in the timetable editor.">
    <div className="grid gap-6 xl:grid-cols-[24rem_1fr]"><form onSubmit={submit} className="grid h-fit gap-4 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{editingId ? "Edit teacher" : "Add teacher"}</h2><label>Name<input required value={draft.full_name} onChange={(event) => change("full_name", event.target.value)} className="mt-1 w-full rounded border p-3" /></label><label>Qualification<input required value={draft.qualification} onChange={(event) => change("qualification", event.target.value)} className="mt-1 w-full rounded border p-3" /></label><label>Experience (years)<input required type="number" min="0" max="80" value={draft.experience_years} onChange={(event) => change("experience_years", Number(event.target.value))} className="mt-1 w-full rounded border p-3" /></label><label>Biography<textarea value={draft.biography ?? ""} onChange={(event) => change("biography", event.target.value)} className="mt-1 w-full rounded border p-3" /></label><label>Photo<input key={photoInputKey} onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" /></label><p className="text-xs text-slate-600">JPEG, PNG, or WebP; maximum 5 MB. Leave blank to keep the current photo.</p><label className="flex gap-2"><input checked={draft.is_public} onChange={(event) => change("is_public", event.target.checked)} type="checkbox" /> Show publicly</label><div className="flex gap-3"><button className="rounded bg-blue-700 px-4 py-3 font-bold text-white">{editingId ? "Update teacher" : "Save teacher"}</button>{editingId && <button type="button" onClick={cancelEdit} className="rounded border px-4 py-3 font-semibold">Cancel</button>}</div>{status && <p role="status" className="text-sm text-slate-700">{status}</p>}</form>
      <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Saved teachers</h2>{loading ? <p className="mt-4">Loading…</p> : <table className="mt-4 w-full min-w-175 text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Name</th><th className="p-3">Qualification</th><th className="p-3">Experience</th><th className="p-3">Public</th><th className="p-3">Actions</th></tr></thead><tbody>{teachers.length ? teachers.map((teacher) => <tr key={teacher.id}><td className="border-t p-3 font-semibold">{teacher.full_name}</td><td className="border-t p-3">{teacher.qualification}</td><td className="border-t p-3">{teacher.experience_years} years</td><td className="border-t p-3">{teacher.is_public ? "Yes" : "No"}</td><td className="border-t p-3"><div className="flex gap-3"><button onClick={() => beginEdit(teacher)} className="font-semibold text-blue-700">Edit</button><button onClick={() => removeTeacher(teacher)} className="font-semibold text-red-700">Delete</button></div></td></tr>) : <tr><td colSpan={5} className="border-t p-4 text-slate-600">No teachers saved yet.</td></tr>}</tbody></table>}</section>
    </div>
  </AdminPage>;
}
