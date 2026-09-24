"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LiveEvent = { id: string; title: string; embed_url: string; recording_url: string | null; is_live: boolean; started_at: string | null; ended_at: string | null };
type LiveDraft = Pick<LiveEvent, "title" | "embed_url" | "recording_url">;

const emptyDraft: LiveDraft = { title: "", embed_url: "", recording_url: "" };

function validateUrls(embedUrl: string, recordingUrl: string | null) {
  try {
    const embed = new URL(embedUrl);
    if (embed.protocol !== "https:" || !["www.youtube.com", "www.youtube-nocookie.com"].includes(embed.hostname) || !embed.pathname.startsWith("/embed/")) {
      return "Use a valid HTTPS YouTube embed URL, such as https://www.youtube.com/embed/VIDEO_ID.";
    }
    if (recordingUrl) {
      const recording = new URL(recordingUrl);
      if (recording.protocol !== "https:") return "Recording URL must use HTTPS.";
    }
    return "";
  } catch {
    return "Use valid HTTPS URLs.";
  }
}

export default function LiveAdminPage() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<LiveEvent | null>(null);
  const [draft, setDraft] = useState<LiveDraft>(emptyDraft);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createSupabaseBrowserClient()
      .from("live_events")
      .select("id, title, embed_url, recording_url, is_live, started_at, ended_at")
      .order("started_at", { ascending: false, nullsFirst: false });
    if (error) setStatus(error.message);
    else setEvents((data ?? []) as LiveEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") ?? "").trim();
    const embedUrl = String(form.get("embedUrl") ?? "").trim();
    const recordingUrl = String(form.get("recordingUrl") ?? "").trim() || null;
    const validation = validateUrls(embedUrl, recordingUrl);
    if (validation) { setStatus(validation); return; }
    setSaving(true);
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { error: endError } = await supabase.from("live_events").update({ is_live: false, ended_at: new Date().toISOString() }).eq("is_live", true);
    if (endError) { setStatus(endError.message); setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("live_events").insert({ title, embed_url: embedUrl, recording_url: recordingUrl, is_live: true, started_at: new Date().toISOString(), started_by: user?.id });
    if (error) setStatus(error.message);
    else { formElement.reset(); setStatus("Live event started. Any previous live event was ended."); await loadEvents(); }
    setSaving(false);
  }

  async function endEvent(event: LiveEvent) {
    if (!event.is_live) return;
    const { error } = await createSupabaseBrowserClient().from("live_events").update({ is_live: false, ended_at: new Date().toISOString() }).eq("id", event.id).eq("is_live", true);
    if (error) { setStatus(error.message); return; }
    setStatus("Live event ended.");
    await loadEvents();
  }

  function beginEdit(event: LiveEvent) {
    setEditingEvent(event);
    setDraft({ title: event.title, embed_url: event.embed_url, recording_url: event.recording_url ?? "" });
    setStatus("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvent) return;
    const recordingUrl = draft.recording_url?.trim() || null;
    const validation = validateUrls(draft.embed_url.trim(), recordingUrl);
    if (validation) { setStatus(validation); return; }
    const { error } = await createSupabaseBrowserClient().from("live_events").update({
      title: draft.title.trim(), embed_url: draft.embed_url.trim(), recording_url: recordingUrl,
    }).eq("id", editingEvent.id);
    if (error) { setStatus(error.message); return; }
    setEditingEvent(null);
    setDraft(emptyDraft);
    setStatus("Live event updated.");
    await loadEvents();
  }

  async function removeEvent(event: LiveEvent) {
    if (!window.confirm(`Delete "${event.title}"${event.is_live ? " and end its live stream" : ""}? This cannot be undone.`)) return;
    const { error } = await createSupabaseBrowserClient().from("live_events").delete().eq("id", event.id);
    if (error) { setStatus(`Cannot delete this event: ${error.message}`); return; }
    if (editingEvent?.id === event.id) { setEditingEvent(null); setDraft(emptyDraft); }
    setStatus("Live event record deleted.");
    await loadEvents();
  }

  return <AdminPage title="Go live" description="Use a YouTube embed URL. Start and end live events, then maintain historical records.">
    <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
      <div className="space-y-6">
        <form onSubmit={start} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Start live event</h2>
          <label>Event title<input required name="title" maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>YouTube embed URL<input required name="embedUrl" type="url" placeholder="https://www.youtube.com/embed/VIDEO_ID" className="mt-1 w-full rounded border p-3" /></label>
          <label>Optional recording URL<input name="recordingUrl" type="url" placeholder="https://www.youtube.com/watch?v=VIDEO_ID" className="mt-1 w-full rounded border p-3" /></label>
          <button disabled={saving} className="rounded bg-red-700 p-3 font-bold text-white disabled:opacity-60">{saving ? "Starting…" : "Start live"}</button>
        </form>
        {editingEvent && <form onSubmit={saveEdit} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Edit event</h2>
          <label>Event title<input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>YouTube embed URL<input required type="url" value={draft.embed_url} onChange={(event) => setDraft((current) => ({ ...current, embed_url: event.target.value }))} className="mt-1 w-full rounded border p-3" /></label>
          <label>Recording URL<input type="url" value={draft.recording_url ?? ""} onChange={(event) => setDraft((current) => ({ ...current, recording_url: event.target.value }))} className="mt-1 w-full rounded border p-3" /></label>
          <div className="flex gap-3"><button className="rounded bg-blue-700 px-4 py-3 font-bold text-white">Save event</button><button type="button" onClick={() => { setEditingEvent(null); setDraft(emptyDraft); }} className="rounded border px-4 py-3 font-semibold">Cancel</button></div>
        </form>}
      </div>
      <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Live event records</h2>
        {status && <p role="status" className="mt-3 text-sm text-slate-700">{status}</p>}
        {loading ? <p className="mt-4">Loading…</p> : <table className="mt-4 w-full min-w-[52rem] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Event</th><th className="p-3">Started</th><th className="p-3">Ended</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{events.length ? events.map((event) => <tr key={event.id}><td className="border-t p-3"><strong>{event.title}</strong>{event.recording_url && <a href={event.recording_url} target="_blank" rel="noreferrer" className="block text-blue-700 hover:underline">Recording</a>}</td><td className="border-t p-3">{event.started_at ? new Date(event.started_at).toLocaleString() : "—"}</td><td className="border-t p-3">{event.ended_at ? new Date(event.ended_at).toLocaleString() : "—"}</td><td className="border-t p-3">{event.is_live ? <span className="font-bold text-red-700">● LIVE</span> : "Ended"}</td><td className="border-t p-3"><div className="flex gap-3">{event.is_live && <button type="button" onClick={() => endEvent(event)} className="font-semibold text-red-700">End</button>}<button type="button" onClick={() => beginEdit(event)} className="font-semibold text-blue-700">Edit</button><button type="button" onClick={() => removeEvent(event)} className="font-semibold text-red-700">Delete</button></div></td></tr>) : <tr><td colSpan={5} className="border-t p-4 text-slate-600">No live event records saved yet.</td></tr>}</tbody></table>}
      </section>
    </div>
  </AdminPage>;
}
