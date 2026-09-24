"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Photo = { id: string; storage_path: string; alt_text: string; display_order: number };
type Album = { id: string; heading: string; event_name: string; event_date: string; gallery_photos: Photo[] | null };
type GalleryPhoto = Photo & { heading: string; event_name: string; event_date: string; url: string };

export function GalleryView() {
  const [year, setYear] = useState("All");
  const [event, setEvent] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadGallery() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("gallery_albums").select("id, heading, event_name, event_date, gallery_photos(id, storage_path, alt_text, display_order)").order("event_date", { ascending: false });
      const albums = (data ?? []) as unknown as Album[];
      const sourcePhotos = albums.flatMap((album) => (album.gallery_photos ?? []).map((photo) => ({ ...photo, heading: album.heading, event_name: album.event_name, event_date: album.event_date })));
      const withUrls = await Promise.all(sourcePhotos.map(async (photo) => {
        const { data: signed } = await supabase.storage.from("school-media").createSignedUrl(photo.storage_path, 60 * 60);
        return { ...photo, url: signed?.signedUrl ?? "" };
      }));
      setPhotos(withUrls.filter((photo) => photo.url));
      setLoading(false);
    }
    void loadGallery();
  }, []);
  const years = ["All", ...new Set(photos.map((photo) => photo.event_date.slice(0, 4)))];
  const events = ["All", ...new Set(photos.map((photo) => photo.event_name))];
  const filteredPhotos = useMemo(() => photos.filter((photo) => (year === "All" || photo.event_date.startsWith(year)) && (event === "All" || photo.event_name === event)), [event, photos, year]);
  const selectedPhoto = photos.find((photo) => photo.id === selected);
  return <><div className="mb-6 flex flex-wrap gap-3"><label>Year<select value={year} onChange={(e) => setYear(e.target.value)} className="ml-2 rounded border p-2">{years.map((value) => <option key={value}>{value}</option>)}</select></label><label>Event<select value={event} onChange={(e) => setEvent(e.target.value)} className="ml-2 rounded border p-2">{events.map((value) => <option key={value}>{value}</option>)}</select></label></div>{loading ? <p>Loading gallery...</p> : filteredPhotos.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredPhotos.map((photo) => <article key={photo.id} className="overflow-hidden rounded-xl border"><button className="block w-full" onClick={() => setSelected(photo.id)}><img src={photo.url} alt={photo.alt_text} className="aspect-video w-full object-cover" /></button><div className="p-4"><p className="text-sm text-slate-500">{photo.event_date.slice(0, 4)} · {photo.event_name} · {photo.event_date}</p><h2 className="mt-1 font-bold">{photo.heading}</h2></div></article>)}</div> : <p className="text-slate-600">No public photos are available.</p>}{selectedPhoto && <div role="dialog" aria-modal="true" aria-label="Image preview" className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setSelected(null)}><img src={selectedPhoto.url} alt={selectedPhoto.alt_text} className="max-h-[85vh] w-auto rounded-lg object-contain" /></div>}</>;
}
