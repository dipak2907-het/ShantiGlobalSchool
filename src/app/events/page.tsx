"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type EventItem = { id: string; title: string; description: string | null; starts_at: string; location: string | null };

function EventList({ events }: { events: EventItem[] }) {
  return <div className="grid gap-4">{events.map((event) => <article key={event.id} className="rounded-xl border p-5"><p className="text-sm font-semibold text-blue-700">{new Date(event.starts_at).toLocaleString()}</p><h2 className="mt-1 text-xl font-bold">{event.title}</h2>{event.description && <p className="mt-2 text-slate-600">{event.description}</p>}{event.location && <p className="mt-2 text-sm text-slate-500">{event.location}</p>}</article>)}</div>;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadEvents() {
      const { data } = await createSupabaseBrowserClient().from("events").select("id, title, description, starts_at, location").order("starts_at", { ascending: true });
      setEvents((data ?? []) as EventItem[]);
      setLoading(false);
    }
    void loadEvents();
  }, []);
  const { upcoming, past } = useMemo(() => ({ upcoming: events.filter((event) => new Date(event.starts_at) >= new Date()), past: events.filter((event) => new Date(event.starts_at) < new Date()).reverse() }), [events]);
  return <PageShell><PageHeading title="Events" />{loading ? <p>Loading events...</p> : <><h2 className="mb-4 text-2xl font-bold">Upcoming</h2>{upcoming.length ? <EventList events={upcoming} /> : <p className="text-slate-600">No upcoming events to display.</p>}<h2 className="mb-4 mt-10 text-2xl font-bold">Past</h2>{past.length ? <EventList events={past} /> : <p className="text-slate-600">No past events to display.</p>}</>}</PageShell>;
}
