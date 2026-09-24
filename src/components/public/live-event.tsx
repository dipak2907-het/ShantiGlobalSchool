"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LiveEvent = { id: string; title: string; embed_url: string; started_at: string };

function isSafeYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["www.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname) && url.pathname.startsWith("/embed/");
  } catch {
    return false;
  }
}

export function LiveEvent({ variant }: { variant: "banner" | "page" }) {
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    async function loadLiveEvent() {
      const { data, error: queryError } = await supabase.from("live_events").select("id, title, embed_url, started_at").eq("is_live", true).maybeSingle();
      if (queryError) { setError(true); return; }
      setLiveEvent(data as LiveEvent | null);
    }

    loadLiveEvent();
    const channel = supabase.channel("public-live-event")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_events" }, loadLiveEvent)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (error) return null;
  if (variant === "banner") {
    if (!liveEvent || !isSafeYouTubeEmbedUrl(liveEvent.embed_url)) return <article className="rounded-xl bg-amber-50 p-6"><p className="text-sm font-bold text-amber-800">Live event</p><h2 className="mt-2 text-2xl font-bold">No live event now</h2><Link href="/live" className="mt-4 inline-block font-semibold text-blue-700">Go to live event →</Link></article>;
    return <article className="rounded-xl bg-red-700 p-6 text-white"><p className="text-sm font-bold text-red-100">● LIVE NOW</p><h2 className="mt-2 text-2xl font-bold">{liveEvent.title}</h2><Link href="/live" className="mt-4 inline-block font-semibold underline">Watch live →</Link></article>;
  }

  if (!liveEvent || !isSafeYouTubeEmbedUrl(liveEvent.embed_url)) return <section className="rounded-xl bg-slate-100 p-10 text-center"><h2 className="text-2xl font-bold">No live event now</h2><p className="mt-3 text-slate-600">Please check back when the school starts a live event.</p></section>;
  return <section><div className="mb-4 flex items-center gap-2 font-bold text-red-700"><span aria-hidden="true">●</span> LIVE NOW</div><h2 className="mb-4 text-2xl font-bold">{liveEvent.title}</h2><iframe title={liveEvent.title} src={liveEvent.embed_url} className="aspect-video w-full rounded-xl border" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></section>;
}
