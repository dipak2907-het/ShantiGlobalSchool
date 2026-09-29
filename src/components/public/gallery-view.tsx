"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Photo = { id: string; storage_path: string; alt_text: string; display_order: number; url: string };
type AlbumRecord = { id: string; heading: string; event_name: string; event_date: string; gallery_photos: Omit<Photo, "url">[] | null };
type GalleryAlbum = { id: string; heading: string; event_name: string; event_date: string; photos: Photo[] };
type SelectedPhoto = Photo & { albumHeading: string; eventName: string; eventDate: string };

export function GalleryView() {
  const [year, setYear] = useState("All");
  const [event, setEvent] = useState("All");
  const [selected, setSelected] = useState<SelectedPhoto | null>(null);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadGallery() {
      const supabase = createSupabaseBrowserClient();
      const { data, error: queryError } = await supabase
        .from("gallery_albums")
        .select("id, heading, event_name, event_date, gallery_photos(id, storage_path, alt_text, display_order)")
        .order("event_date", { ascending: false });
      if (queryError) {
        if (active) {
          setError(`The gallery could not be loaded: ${queryError.message}`);
          setLoading(false);
        }
        return;
      }

      const records = (data ?? []) as unknown as AlbumRecord[];
      const publishedAlbums = records.filter((album) => (album.gallery_photos ?? []).length > 0);
      const resolvedAlbums = await Promise.all(publishedAlbums.map(async (album) => {
        const resolvedPhotos = await Promise.all((album.gallery_photos ?? [])
          .sort((left, right) => left.display_order - right.display_order)
          .map(async (photo) => {
            const { data: signed, error: signedError } = await supabase.storage.from("school-media").createSignedUrl(photo.storage_path, 60 * 60);
            if (signedError) {
              console.error("Gallery photo could not be loaded:", signedError.message);
              return null;
            }
            return { ...photo, url: signed.signedUrl };
          }));
        return {
          id: album.id,
          heading: album.heading,
          event_name: album.event_name,
          event_date: album.event_date,
          photos: resolvedPhotos.filter((photo): photo is Photo => photo !== null),
        };
      }));

      if (active) {
        setAlbums(resolvedAlbums.filter((album) => album.photos.length > 0));
        setLoading(false);
      }
    }

    void loadGallery();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const years = ["All", ...new Set(albums.map((album) => album.event_date.slice(0, 4)))];
  const events = ["All", ...new Set(albums.map((album) => album.event_name))];
  const filteredAlbums = useMemo(
    () => albums.filter((album) => (year === "All" || album.event_date.startsWith(year)) && (event === "All" || album.event_name === event)),
    [albums, event, year],
  );
  const allFilteredPhotos = filteredAlbums.flatMap((album) => album.photos.map((photo) => ({
    ...photo,
    albumHeading: album.heading,
    eventName: album.event_name,
    eventDate: album.event_date,
  })));

  function moveSelected(direction: -1 | 1) {
    if (!selected || !allFilteredPhotos.length) return;
    const currentIndex = allFilteredPhotos.findIndex((photo) => photo.id === selected.id);
    const nextIndex = (currentIndex + direction + allFilteredPhotos.length) % allFilteredPhotos.length;
    setSelected(allFilteredPhotos[nextIndex]);
  }

  return <>
    <div className="mb-6 flex flex-wrap gap-4">
      <label>Year<select value={year} onChange={(event) => setYear(event.target.value)} className="ml-2 rounded border p-2">{years.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Event<select value={event} onChange={(event) => setEvent(event.target.value)} className="ml-2 rounded border p-2">{events.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    {loading ? <p>Loading gallery…</p>
      : error ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>
        : filteredAlbums.length ? <div className="space-y-10">
          {filteredAlbums.map((album) => <section key={album.id} aria-labelledby={`album-${album.id}`}>
            <div className="mb-4">
              <h2 id={`album-${album.id}`} className="text-2xl font-bold">{album.heading}</h2>
              <p className="mt-1 text-sm text-slate-600">{album.event_name} · {album.event_date.slice(0, 4)} · {album.event_date} · {album.photos.length} photo{album.photos.length === 1 ? "" : "s"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {album.photos.map((photo) => <button key={photo.id} type="button" onClick={() => setSelected({ ...photo, albumHeading: album.heading, eventName: album.event_name, eventDate: album.event_date })} className="overflow-hidden rounded-xl border bg-white text-left shadow-sm hover:shadow-md focus:outline-2 focus:outline-blue-700">
                <Image src={photo.url} alt={photo.alt_text} width={800} height={600} unoptimized className="aspect-video w-full object-cover" />
                {photo.alt_text && <span className="block p-3 text-sm text-slate-700">{photo.alt_text}</span>}
              </button>)}
            </div>
          </section>)}
        </div>
          : <p className="text-slate-600">No public photos are available for these filters.</p>}
    {selected && <div role="dialog" aria-modal="true" aria-label={`${selected.albumHeading} photo viewer`} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setSelected(null)}>
      <div className="flex max-h-full w-full max-w-6xl flex-col items-center gap-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex w-full items-center justify-between gap-4 text-white">
          <div><h2 className="font-bold">{selected.albumHeading}</h2><p className="text-sm text-slate-300">{selected.eventName} · {selected.eventDate}</p></div>
          <button type="button" onClick={() => setSelected(null)} aria-label="Close photo viewer" className="rounded border border-white/60 px-3 py-2">Close</button>
        </div>
        <Image src={selected.url} alt={selected.alt_text} width={1600} height={1200} unoptimized className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain" />
        <div className="flex items-center gap-4 text-white">
          <button type="button" onClick={() => moveSelected(-1)} className="rounded border border-white/60 px-4 py-2">Previous</button>
          <p className="text-sm">{allFilteredPhotos.findIndex((photo) => photo.id === selected.id) + 1} of {allFilteredPhotos.length}</p>
          <button type="button" onClick={() => moveSelected(1)} className="rounded border border-white/60 px-4 py-2">Next</button>
        </div>
      </div>
    </div>}
  </>;
}
