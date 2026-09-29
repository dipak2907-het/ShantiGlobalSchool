"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Photo = { id: string; storage_path: string; alt_text: string; display_order: number; is_public: boolean; has_publication_consent: boolean; previewUrl: string };
type Album = { id: string; heading: string; event_name: string; event_date: string; is_public: boolean; gallery_photos: Photo[] | null };
type AlbumDraft = Pick<Album, "heading" | "event_name" | "event_date" | "is_public">;
type NewPhoto = Omit<Photo, "id" | "previewUrl"> & { album_id: string };

const emptyAlbum: AlbumDraft = { heading: "", event_name: "", event_date: "", is_public: false };
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_UPLOAD = 20;

async function removeStoredPhotos(paths: string[]) {
  const supabase = createSupabaseBrowserClient();
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage.from("school-media").remove(paths.slice(index, index + 100));
    if (error) return error;
  }
  return null;
}

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumDraft, setAlbumDraft] = useState<AlbumDraft>(emptyAlbum);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [photoDescriptions, setPhotoDescriptions] = useState<Record<string, string>>({});
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("gallery_albums")
      .select("id, heading, event_name, event_date, is_public, gallery_photos(id, storage_path, alt_text, display_order, is_public, has_publication_consent)")
      .order("event_date", { ascending: false });
    if (error) setStatus(error.message);
    else {
      const albumsWithUrls = await Promise.all(((data ?? []) as unknown as Album[]).map(async (album) => ({
        ...album,
        gallery_photos: await Promise.all((album.gallery_photos ?? []).map(async (photo) => {
          const { data: signed, error: imageError } = await supabase.storage.from("school-media").createSignedUrl(photo.storage_path, 60 * 60);
          if (imageError) setStatus(`Could not load a photo preview: ${imageError.message}`);
          return { ...photo, previewUrl: signed?.signedUrl ?? "" };
        })),
      })));
      setAlbums(albumsWithUrls);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  function validateFiles(files: File[]) {
    if (!files.length) return "Select at least one photo.";
    if (files.length > MAX_PHOTOS_PER_UPLOAD) return `Choose no more than ${MAX_PHOTOS_PER_UPLOAD} photos at a time.`;
    const invalidFile = files.find((file) => !allowedTypes.includes(file.type) || file.size > MAX_PHOTO_SIZE);
    if (invalidFile) return `${invalidFile.name}: use JPEG, PNG, or WebP images no larger than 5 MB each.`;
    return "";
  }

  async function uploadPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
    const published = form.get("publish") === "on";
    const consent = form.get("consent") === "on";
    const validation = validateFiles(files);
    if (validation) { setStatus(validation); return; }
    if (published && !consent) { setStatus("Confirm that you have permission to publish these photos."); return; }

    setUploading(true);
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const uploadedPaths: string[] = [];
    let albumId: string | null = null;
    try {
      const { data: album, error: albumError } = await supabase.from("gallery_albums").insert({
        heading: String(form.get("heading") ?? "").trim(),
        event_name: String(form.get("eventName") ?? "").trim(),
        event_date: form.get("eventDate"),
        is_public: published,
        created_by: user?.id,
      }).select("id").single();
      if (albumError || !album) throw new Error(albumError?.message ?? "Could not create album.");
      albumId = album.id;
      const rows: NewPhoto[] = [];
      for (const [index, file] of files.entries()) {
        const path = `${album.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("school-media").upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        rows.push({ album_id: album.id, storage_path: path, alt_text: String(form.get("altText") ?? "").trim(), display_order: index, is_public: published, has_publication_consent: published && consent });
      }
      const { error } = await supabase.from("gallery_photos").insert(rows);
      if (error) throw error;
      formElement.reset();
      setStatus(`${files.length} photo${files.length === 1 ? "" : "s"} added to the ${published ? "public" : "private"} album.`);
      await loadAlbums();
    } catch (error) {
      let cleanupFailure = "";
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from("school-media").remove(uploadedPaths);
        if (cleanupError) cleanupFailure = ` Uploaded files could not be cleaned up: ${cleanupError.message}`;
      }
      if (albumId) {
        const { error: deleteError } = await supabase.from("gallery_albums").delete().eq("id", albumId);
        if (deleteError) setStatus(`Upload failed (${error instanceof Error ? error.message : "unknown error"}); the album could not be removed: ${deleteError.message}${cleanupFailure}`);
        else setStatus(`${error instanceof Error ? error.message : "Could not upload photos; the album was removed."}${cleanupFailure}`);
      } else {
        setStatus(`${error instanceof Error ? error.message : "Could not create the album."}${cleanupFailure}`);
      }
    } finally {
      setUploading(false);
    }
  }

  function beginEdit(album: Album) {
    setEditingAlbum(album);
    setAlbumDraft({ heading: album.heading, event_name: album.event_name, event_date: album.event_date, is_public: album.is_public });
    setAdditionalPhotos([]);
    setPhotoDescriptions(Object.fromEntries((album.gallery_photos ?? []).map((photo) => [photo.id, photo.alt_text])));
    setRemovedPhotoIds([]);
    setConsentConfirmed(false);
    setStatus("");
  }

  function cancelEdit() {
    setEditingAlbum(null);
    setAlbumDraft(emptyAlbum);
    setAdditionalPhotos([]);
    setPhotoDescriptions({});
    setRemovedPhotoIds([]);
    setConsentConfirmed(false);
  }

  function selectAdditionalPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > MAX_PHOTOS_PER_UPLOAD) {
      setStatus(`Choose no more than ${MAX_PHOTOS_PER_UPLOAD} photos at a time.`);
      event.target.value = "";
      return;
    }
    const validation = files.length ? validateFiles(files) : "";
    if (validation) {
      setStatus(validation);
      event.target.value = "";
      return;
    }
    setAdditionalPhotos(files);
    setStatus("");
  }

  async function saveAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAlbum) return;
    const existingPhotos = editingAlbum.gallery_photos ?? [];
    const keptPhotos = existingPhotos.filter((photo) => !removedPhotoIds.includes(photo.id));
    const needsConsentConfirmation = albumDraft.is_public && (
      !editingAlbum.is_public
      || additionalPhotos.length > 0
      || keptPhotos.some((photo) => !photo.has_publication_consent)
    );
    if (keptPhotos.length + additionalPhotos.length === 0) {
      setStatus("An album must contain at least one photo. Add a photo or cancel removing the last one.");
      return;
    }
    const validation = additionalPhotos.length ? validateFiles(additionalPhotos) : "";
    if (validation) { setStatus(validation); return; }
    if (needsConsentConfirmation && !consentConfirmed) {
      setStatus("Confirm that you have permission to publish all photos remaining in this album.");
      return;
    }

    setUploading(true);
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const uploadedPaths: string[] = [];
    const insertedPhotoPaths: string[] = [];
    try {
      for (const [index, file] of additionalPhotos.entries()) {
        const path = `${editingAlbum.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("school-media").upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);
        uploadedPaths.push(path);
        const { error: insertError } = await supabase.from("gallery_photos").insert({
          album_id: editingAlbum.id,
          storage_path: path,
          alt_text: albumDraft.heading.trim(),
          display_order: existingPhotos.length + index,
          is_public: albumDraft.is_public,
          has_publication_consent: albumDraft.is_public && consentConfirmed,
        });
        if (insertError) throw new Error(`Photo uploaded but could not be added to the album: ${insertError.message}`);
        insertedPhotoPaths.push(path);
      }

      const { error: albumError } = await supabase.from("gallery_albums").update({
        heading: albumDraft.heading.trim(),
        event_name: albumDraft.event_name.trim(),
        event_date: albumDraft.event_date,
        is_public: albumDraft.is_public,
      }).eq("id", editingAlbum.id);
      if (albumError) throw new Error(`Photos were added, but album details could not be saved: ${albumError.message}`);

      for (const photo of keptPhotos) {
        const { error: photoUpdateError } = await supabase.from("gallery_photos").update({
          alt_text: photoDescriptions[photo.id]?.trim() || albumDraft.heading.trim(),
          display_order: photo.display_order,
          is_public: albumDraft.is_public && (photo.has_publication_consent || consentConfirmed),
          has_publication_consent: consentConfirmed || photo.has_publication_consent,
        }).eq("id", photo.id).eq("album_id", editingAlbum.id);
        if (photoUpdateError) throw new Error(`Album saved, but a photo could not be updated: ${photoUpdateError.message}`);
      }

      if (removedPhotoIds.length) {
        const removalRows = existingPhotos.filter((photo) => removedPhotoIds.includes(photo.id));
        const { error: deletePhotoError } = await supabase.from("gallery_photos").delete().in("id", removedPhotoIds).eq("album_id", editingAlbum.id);
        if (deletePhotoError) throw new Error(`Album saved, but selected photo records could not be removed: ${deletePhotoError.message}`);
        const storageError = await removeStoredPhotos(removalRows.map((photo) => photo.storage_path));
        if (storageError) throw new Error(`Photo records were removed, but their stored files could not be removed: ${storageError.message}`);
      }

      setStatus("Album, photos, and publication settings saved.");
      cancelEdit();
      await loadAlbums();
    } catch (error) {
      const cleanupPaths: string[] = [];
      for (const path of uploadedPaths) {
        if (insertedPhotoPaths.includes(path)) {
          const { error: deleteError } = await supabase.from("gallery_photos").delete().eq("storage_path", path);
          if (deleteError) {
            setStatus(`Save failed and a newly added photo record could not be rolled back: ${deleteError.message}`);
            continue;
          }
        }
        cleanupPaths.push(path);
      }
      if (cleanupPaths.length) {
        const cleanupError = await removeStoredPhotos(cleanupPaths);
        if (cleanupError) setStatus(`Save failed and temporary uploads could not be cleaned up: ${cleanupError.message}`);
        else setStatus(error instanceof Error ? error.message : "Could not save album changes.");
      } else {
        setStatus(error instanceof Error ? error.message : "Could not save album changes.");
      }
      await loadAlbums();
    } finally {
      setUploading(false);
    }
  }

  async function removeAlbum(album: Album) {
    const photos = album.gallery_photos ?? [];
    if (!window.confirm(`Delete "${album.heading}" and all ${photos.length} photo(s)? This cannot be undone.`)) return;
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const { data: currentPhotos, error: photoError } = await supabase.from("gallery_photos").select("storage_path").eq("album_id", album.id);
    if (photoError) { setStatus(photoError.message); return; }
    const paths = (currentPhotos ?? []).map((photo) => (photo as { storage_path: string }).storage_path);
    const { error } = await supabase.from("gallery_albums").delete().eq("id", album.id);
    if (error) { setStatus(`Album was not deleted: ${error.message}`); return; }
    if (editingAlbum?.id === album.id) cancelEdit();
    const storageError = await removeStoredPhotos(paths);
    if (storageError) {
      setStatus(`Album and photo records were deleted, but some stored image files may remain unused: ${storageError.message}`);
      await loadAlbums();
      return;
    }
    setStatus("Album, photo records, and stored files deleted.");
    await loadAlbums();
  }

  return <AdminPage title="Gallery" description="Create a one-photo album or group multiple photos from one event. Choose whether the album is public.">
    <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
      <div className="space-y-6">
        <form onSubmit={uploadPhotos} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Add photos</h2>
          <p className="text-sm text-slate-600">One selected image makes a one-photo album. Select several photos to group them together.</p>
          <label>Album heading<input required name="heading" maxLength={180} placeholder="e.g. Class 5 nature trip" className="mt-1 w-full rounded border p-3" /></label>
          <label>Event<input required name="eventName" maxLength={180} placeholder="e.g. Nature trip" className="mt-1 w-full rounded border p-3" /></label>
          <label>Event date<input required name="eventDate" type="date" className="mt-1 w-full rounded border p-3" /></label>
          <label>Photo description<input required name="altText" maxLength={180} placeholder="Briefly describe the selected photos" className="mt-1 w-full rounded border p-3" /></label>
          <label>Choose photo(s)<input required name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block w-full" /></label>
          <p className="text-sm text-slate-600">JPEG, PNG, or WebP; up to 5 MB each, maximum {MAX_PHOTOS_PER_UPLOAD} per upload.</p>
          <label className="flex gap-2"><input name="publish" type="checkbox" /> Publish this album and its photos on the public Gallery</label>
          <label className="flex gap-2"><input name="consent" type="checkbox" /> I confirm we have permission to publish every selected photo</label>
          <button disabled={uploading} className="rounded bg-blue-700 p-3 font-bold text-white disabled:opacity-60">{uploading ? "Saving photos…" : "Save album"}</button>
          {status && <p role="status" aria-live="polite" className="text-sm">{status}</p>}
        </form>
        {editingAlbum && <form onSubmit={saveAlbum} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Edit album and photos</h2>
          <label>Heading<input required value={albumDraft.heading} onChange={(event) => setAlbumDraft((current) => ({ ...current, heading: event.target.value }))} maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Event<input required value={albumDraft.event_name} onChange={(event) => setAlbumDraft((current) => ({ ...current, event_name: event.target.value }))} maxLength={180} className="mt-1 w-full rounded border p-3" /></label>
          <label>Event date<input required type="date" value={albumDraft.event_date} onChange={(event) => setAlbumDraft((current) => ({ ...current, event_date: event.target.value }))} className="mt-1 w-full rounded border p-3" /></label>
          <div><h3 className="font-semibold">Photos in this album</h3><div className="mt-2 grid gap-3 sm:grid-cols-2">{(editingAlbum.gallery_photos ?? []).map((photo) => <div key={photo.id} className={`rounded border p-3 ${removedPhotoIds.includes(photo.id) ? "opacity-50" : ""}`}>{photo.previewUrl && <Image src={photo.previewUrl} alt="" width={640} height={360} unoptimized className="mb-2 aspect-video w-full rounded object-cover" />}<label className="block text-sm">Description<input disabled={removedPhotoIds.includes(photo.id)} value={photoDescriptions[photo.id] ?? ""} onChange={(event) => setPhotoDescriptions((current) => ({ ...current, [photo.id]: event.target.value }))} maxLength={180} className="mt-1 w-full rounded border p-2" /></label><p className="mt-1 text-xs text-slate-600">{photo.is_public ? "Currently public" : "Currently private"}{photo.has_publication_consent ? " · consent confirmed" : ""}</p><button type="button" disabled={removedPhotoIds.includes(photo.id)} onClick={() => setRemovedPhotoIds((current) => [...current, photo.id])} className="mt-2 text-sm font-semibold text-red-700">Remove this photo</button>{removedPhotoIds.includes(photo.id) && <button type="button" onClick={() => setRemovedPhotoIds((current) => current.filter((id) => id !== photo.id))} className="ml-3 text-sm font-semibold text-blue-700">Undo</button>}</div>)}</div></div>
          <label>Add more photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectAdditionalPhotos} className="mt-1 block w-full" /></label>
          {additionalPhotos.length > 0 && <p className="text-sm text-slate-600">{additionalPhotos.length} additional photo(s) selected. Their description will use the album heading.</p>}
          <label className="flex gap-2"><input checked={albumDraft.is_public} onChange={(event) => setAlbumDraft((current) => ({ ...current, is_public: event.target.checked }))} type="checkbox" /> Publish this album and its photos on the public Gallery</label>
          {albumDraft.is_public && <label className="flex gap-2"><input checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} type="checkbox" /> I confirm we have permission to publish every photo remaining in this album</label>}
          <div className="flex gap-3"><button disabled={uploading} className="rounded bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-60">{uploading ? "Saving…" : "Save changes"}</button><button type="button" onClick={cancelEdit} className="rounded border px-4 py-3 font-semibold">Cancel</button></div>
          {status && <p role="status" aria-live="polite" className="text-sm">{status}</p>}
        </form>}
      </div>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Albums and photos</h2>
        {status && <p role="status" className="mt-3 text-sm text-slate-700">{status}</p>}
        {loading ? <p className="mt-4">Loading…</p> : <div className="mt-4 space-y-4">{albums.length ? albums.map((album) => <article key={album.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{album.heading}</h3><p className="text-sm text-slate-600">{album.event_name} · {album.event_date} · {album.is_public ? "Public album" : "Private album"} · {(album.gallery_photos ?? []).length} photo(s)</p></div><div className="flex gap-3"><button type="button" onClick={() => beginEdit(album)} className="font-semibold text-blue-700">Edit</button><button type="button" onClick={() => removeAlbum(album)} className="font-semibold text-red-700">Delete</button></div></div>{(album.gallery_photos ?? []).length ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{[...(album.gallery_photos ?? [])].sort((a, b) => a.display_order - b.display_order).map((photo) => <div key={photo.id} title={photo.alt_text} className="overflow-hidden rounded border">{photo.previewUrl ? <Image src={photo.previewUrl} alt={photo.alt_text} width={240} height={240} unoptimized className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-xs text-slate-500">Preview unavailable</div>}</div>)}</div> : <p className="mt-3 text-sm text-slate-600">No photos in this album.</p>}</article>) : <p className="text-slate-600">No albums saved yet.</p>}</div>}
      </section>
    </div>
  </AdminPage>;
}
