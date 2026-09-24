"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Photo = { id: string; storage_path: string; alt_text: string; display_order: number; is_public: boolean; has_publication_consent: boolean };
type Album = { id: string; heading: string; event_name: string; event_date: string; is_public: boolean; gallery_photos: Photo[] | null };
type AlbumDraft = Pick<Album, "heading" | "event_name" | "event_date" | "is_public">;
type NewPhoto = Omit<Photo, "id"> & { album_id: string };

const emptyAlbum: AlbumDraft = { heading: "", event_name: "", event_date: "", is_public: false };
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(emptyAlbum);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createSupabaseBrowserClient()
      .from("gallery_albums")
      .select("id, heading, event_name, event_date, is_public, gallery_photos(id, storage_path, alt_text, display_order, is_public, has_publication_consent)")
      .order("event_date", { ascending: false });
    if (error) setStatus(error.message);
    else setAlbums((data ?? []) as unknown as Album[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  async function uploadPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
    const published = form.get("publishPhotos") === "on";
    const consent = form.get("consent") === "on";
    if (!files.length) { setStatus("Select at least one image."); return; }
    if (published && !consent) { setStatus("Public photos require confirmed consent."); return; }
    const invalidFile = files.find((file) => !allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalidFile) { setStatus(`${invalidFile.name}: use JPEG, PNG, or WebP below 5 MB.`); return; }

    setUploading(true);
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: album, error: albumError } = await supabase.from("gallery_albums").insert({
      heading: String(form.get("heading") ?? "").trim(),
      event_name: String(form.get("eventName") ?? "").trim(),
      event_date: form.get("eventDate"),
      is_public: form.get("publishAlbum") === "on",
      created_by: user?.id,
    }).select("id").single();
    if (albumError || !album) { setStatus(albumError?.message ?? "Could not create album."); setUploading(false); return; }

    const uploadedPaths: string[] = [];
    try {
      const rows: NewPhoto[] = [];
      for (const [index, file] of files.entries()) {
        const path = `${album.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("school-media").upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        rows.push({ album_id: album.id, storage_path: path, alt_text: String(form.get("altText") ?? "").trim(), display_order: index, is_public: published, has_publication_consent: consent });
      }
      const { error } = await supabase.from("gallery_photos").insert(rows);
      if (error) throw error;
      formElement.reset();
      setStatus("Photos uploaded.");
      await loadAlbums();
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from("school-media").remove(uploadedPaths);
      await supabase.from("gallery_albums").delete().eq("id", album.id);
      setStatus(error instanceof Error ? error.message : "Could not upload photos. Uploaded files were removed.");
    } finally {
      setUploading(false);
    }
  }

  function beginEdit(album: Album) {
    setEditingAlbum(album);
    setAlbumDraft({ heading: album.heading, event_name: album.event_name, event_date: album.event_date, is_public: album.is_public });
    setStatus("");
  }

  async function saveAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAlbum) return;
    const { error } = await createSupabaseBrowserClient().from("gallery_albums").update({
      heading: albumDraft.heading.trim(), event_name: albumDraft.event_name.trim(), event_date: albumDraft.event_date, is_public: albumDraft.is_public,
    }).eq("id", editingAlbum.id);
    if (error) { setStatus(error.message); return; }
    setEditingAlbum(null);
    setAlbumDraft(emptyAlbum);
    setStatus("Album updated. Photo visibility and consent remain unchanged.");
    await loadAlbums();
  }

  async function removeAlbum(album: Album) {
    const photos = album.gallery_photos ?? [];
    if (!window.confirm(`Delete "${album.heading}" and its ${photos.length} photo record(s)? Files are removed before the album record.`)) return;
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: currentPhotos, error: photoError } = await supabase.from("gallery_photos").select("storage_path").eq("album_id", album.id);
    if (photoError) { setStatus(photoError.message); return; }
    const paths = (currentPhotos ?? []).map((photo) => (photo as { storage_path: string }).storage_path);
    for (let index = 0; index < paths.length; index += 100) {
      const { error: storageError } = await supabase.storage.from("school-media").remove(paths.slice(index, index + 100));
      if (storageError) { setStatus(`Album was not deleted because its stored files could not be removed: ${storageError.message}`); return; }
    }
    const { error } = await supabase.from("gallery_albums").delete().eq("id", album.id);
    if (error) { setStatus(`Stored files were removed, but the album could not be deleted: ${error.message}`); return; }
    if (editingAlbum?.id === album.id) { setEditingAlbum(null); setAlbumDraft(emptyAlbum); }
    setStatus("Album, photo records, and stored files deleted.");
    await loadAlbums();
  }

  return <AdminPage title="Gallery" description="Upload JPEG, PNG, or WebP files up to 5 MB each. Public photos require consent.">
    <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
      <div className="space-y-6">
        <form onSubmit={uploadPhotos} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Upload a new album</h2>
          <label>Heading<input required name="heading" maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Event<input required name="eventName" maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Event date<input required name="eventDate" type="date" className="mt-1 w-full rounded border p-3" /></label>
          <label>Image description<input required name="altText" maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Photos<input required name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block" /></label>
          <label className="flex gap-2"><input name="publishAlbum" type="checkbox" /> Publish album</label>
          <label className="flex gap-2"><input name="publishPhotos" type="checkbox" /> Publish photos</label>
          <label className="flex gap-2"><input name="consent" type="checkbox" /> I confirm photo publication consent</label>
          <button disabled={uploading} className="rounded bg-blue-700 p-3 font-bold text-white disabled:opacity-60">{uploading ? "Uploading…" : "Upload photos"}</button>
        </form>
        {editingAlbum && <form onSubmit={saveAlbum} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Edit album</h2>
          <label>Heading<input required value={albumDraft.heading} onChange={(event) => setAlbumDraft((current) => ({ ...current, heading: event.target.value }))} maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Event<input required value={albumDraft.event_name} onChange={(event) => setAlbumDraft((current) => ({ ...current, event_name: event.target.value }))} maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Event date<input required type="date" value={albumDraft.event_date} onChange={(event) => setAlbumDraft((current) => ({ ...current, event_date: event.target.value }))} className="mt-1 w-full rounded border p-3" /></label>
          <label className="flex gap-2"><input checked={albumDraft.is_public} onChange={(event) => setAlbumDraft((current) => ({ ...current, is_public: event.target.checked }))} type="checkbox" /> Publish album</label>
          <div className="flex gap-3"><button className="rounded bg-blue-700 px-4 py-3 font-bold text-white">Save album</button><button type="button" onClick={() => { setEditingAlbum(null); setAlbumDraft(emptyAlbum); }} className="rounded border px-4 py-3 font-semibold">Cancel</button></div>
        </form>}
      </div>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Albums and photos</h2>
        {status && <p role="status" className="mt-3 text-sm text-slate-700">{status}</p>}
        {loading ? <p className="mt-4">Loading…</p> : <div className="mt-4 space-y-4">{albums.length ? albums.map((album) => <article key={album.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{album.heading}</h3><p className="text-sm text-slate-600">{album.event_name} · {album.event_date} · {album.is_public ? "Public album" : "Private album"}</p></div><div className="flex gap-3"><button type="button" onClick={() => beginEdit(album)} className="font-semibold text-blue-700">Edit</button><button type="button" onClick={() => removeAlbum(album)} className="font-semibold text-red-700">Delete</button></div></div><ul className="mt-3 divide-y text-sm">{(album.gallery_photos ?? []).length ? [...(album.gallery_photos ?? [])].sort((a, b) => a.display_order - b.display_order).map((photo) => <li key={photo.id} className="py-2"><strong>{photo.alt_text}</strong><span className="ml-2 text-slate-500">{photo.is_public ? "Public" : "Private"}{photo.has_publication_consent ? " · Consent confirmed" : ""}</span><span className="block break-all text-xs text-slate-500">{photo.storage_path}</span></li>) : <li className="py-2 text-slate-600">No photos in this album.</li>}</ul></article>) : <p className="text-slate-600">No albums saved yet.</p>}</div>}
      </section>
    </div>
  </AdminPage>;
}
