"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SchoolEvent = { id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; location: string | null; is_public: boolean };
type Holiday = { id: string; title: string; starts_on: string; ends_on: string; description: string | null; is_public: boolean };

export default function EventsAdminPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [editEvent, setEditEvent] = useState<SchoolEvent | null>(null);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const db = createSupabaseBrowserClient();
    const [eventResult, holidayResult] = await Promise.all([
      db.from("events").select("id,title,description,starts_at,ends_at,location,is_public").order("starts_at", { ascending: false }),
      db.from("holidays").select("id,title,starts_on,ends_on,description,is_public").order("starts_on", { ascending: false }),
    ]);

    if (eventResult.error || holidayResult.error) {
      setStatus(eventResult.error?.message ?? holidayResult.error?.message ?? "Unable to load events and holidays.");
      return;
    }

    setEvents((eventResult.data ?? []) as SchoolEvent[]);
    setHolidays((holidayResult.data ?? []) as Holiday[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const db = createSupabaseBrowserClient();
    const { data: { user } } = await db.auth.getUser();
    const row = {
      title: values.get("title"),
      description: values.get("description") || null,
      starts_at: values.get("starts"),
      ends_at: values.get("ends") || null,
      location: values.get("location") || null,
      is_public: values.get("public") === "on",
    };
    const { error } = editEvent
      ? await db.from("events").update(row).eq("id", editEvent.id)
      : await db.from("events").insert({ ...row, created_by: user?.id });
    if (error) { setStatus(error.message); return; }

    setEditEvent(null);
    form.reset();
    await load();
    setStatus("Event saved.");
  }

  async function saveHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const db = createSupabaseBrowserClient();
    const { data: { user } } = await db.auth.getUser();
    const row = {
      title: values.get("title"),
      description: values.get("description") || null,
      starts_on: values.get("starts"),
      ends_on: values.get("ends"),
      is_public: values.get("public") === "on",
    };
    const { error } = editHoliday
      ? await db.from("holidays").update(row).eq("id", editHoliday.id)
      : await db.from("holidays").insert({ ...row, created_by: user?.id });
    if (error) { setStatus(error.message); return; }

    setEditHoliday(null);
    form.reset();
    await load();
    setStatus("Holiday saved.");
  }

  async function remove(table: "events" | "holidays", id: string) {
    if (!window.confirm("Delete this item?")) return;
    const { error } = await createSupabaseBrowserClient().from(table).delete().eq("id", id);
    if (error) { setStatus(error.message); return; }
    await load();
    setStatus("Deleted.");
  }

  return <AdminPage title="Events and holidays" description="Manage all events and holidays shown to parents.">
    <p role="status" className="mb-4">{status}</p>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <form key={editEvent?.id ?? "new-event"} onSubmit={saveEvent} className="grid gap-2">
          <h2 className="font-bold">{editEvent ? "Edit event" : "New event"}</h2>
          <input required name="title" placeholder="Title" defaultValue={editEvent?.title} className="rounded border p-2" />
          <textarea name="description" placeholder="Description" defaultValue={editEvent?.description ?? ""} className="rounded border p-2" />
          <input required name="starts" type="datetime-local" defaultValue={editEvent?.starts_at.slice(0, 16)} className="rounded border p-2" />
          <input name="ends" type="datetime-local" defaultValue={editEvent?.ends_at?.slice(0, 16)} className="rounded border p-2" />
          <input name="location" placeholder="Location" defaultValue={editEvent?.location ?? ""} className="rounded border p-2" />
          <label><input name="public" type="checkbox" defaultChecked={editEvent?.is_public ?? true} /> Public</label>
          <button className="rounded bg-blue-700 p-2 font-bold text-white">Save event</button>
        </form>
        <table className="mt-5 w-full text-sm"><tbody>{events.map((item) => <tr key={item.id}><td className="border-t p-2">{item.title}</td><td><button onClick={() => setEditEvent(item)} className="text-blue-700">Edit</button> <button onClick={() => remove("events", item.id)} className="text-red-700">Delete</button></td></tr>)}</tbody></table>
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <form key={editHoliday?.id ?? "new-holiday"} onSubmit={saveHoliday} className="grid gap-2">
          <h2 className="font-bold">{editHoliday ? "Edit holiday" : "New holiday"}</h2>
          <input required name="title" placeholder="Title" defaultValue={editHoliday?.title} className="rounded border p-2" />
          <textarea name="description" placeholder="Description" defaultValue={editHoliday?.description ?? ""} className="rounded border p-2" />
          <input required name="starts" type="date" defaultValue={editHoliday?.starts_on} className="rounded border p-2" />
          <input required name="ends" type="date" defaultValue={editHoliday?.ends_on} className="rounded border p-2" />
          <label><input name="public" type="checkbox" defaultChecked={editHoliday?.is_public ?? true} /> Public</label>
          <button className="rounded bg-blue-700 p-2 font-bold text-white">Save holiday</button>
        </form>
        <table className="mt-5 w-full text-sm"><tbody>{holidays.map((item) => <tr key={item.id}><td className="border-t p-2">{item.title}</td><td><button onClick={() => setEditHoliday(item)} className="text-blue-700">Edit</button> <button onClick={() => remove("holidays", item.id)} className="text-red-700">Delete</button></td></tr>)}</tbody></table>
      </section>
    </div>
  </AdminPage>;
}
