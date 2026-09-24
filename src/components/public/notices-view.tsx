"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Notice = { id: string; title: string; body: string; published_at: string; is_urgent: boolean };

export function NoticesView() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotices() {
      const { data } = await createSupabaseBrowserClient().from("notices").select("id, title, body, published_at, is_urgent").order("published_at", { ascending: false });
      setItems((data ?? []) as Notice[]);
      setLoading(false);
    }
    void loadNotices();
  }, []);

  const notices = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((notice) => `${notice.title} ${notice.body}`.toLowerCase().includes(search));
  }, [items, query]);

  return <><label className="block max-w-lg"><span className="sr-only">Search notices</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notices" className="w-full rounded-md border p-3" /></label><div className="mt-6 grid gap-4">{loading ? <p>Loading notices...</p> : notices.length ? notices.map((notice) => <article key={notice.id} className="rounded-xl border p-5"><p className="text-sm text-slate-500">{new Date(notice.published_at).toLocaleDateString()}</p><h2 className="mt-1 text-xl font-bold">{notice.is_urgent && <span className="mr-2 rounded bg-red-700 px-2 py-1 text-xs text-white">Urgent</span>}{notice.title}</h2><p className="mt-2 text-slate-600">{notice.body}</p></article>) : <p className="text-slate-600">No notices are available.</p>}</div></>;
}
