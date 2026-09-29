"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { defaultSiteContent, SiteContentRecord } from "@/lib/site-content";

type ImageField = "logo" | "principalImage" | "heroImage";
type ImageFiles = Record<ImageField, File | null>;
type ImagePreviews = Record<ImageField, string>;

const emptyImages: ImageFiles = { logo: null, principalImage: null, heroImage: null };
const emptyPreviews: ImagePreviews = { logo: "", principalImage: "", heroImage: "" };

function isValidImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024;
}

function safeFileName(file: File) {
  return file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export default function WebsiteContentAdminPage() {
  const [content, setContent] = useState(defaultSiteContent);
  const [images, setImages] = useState(emptyImages);
  const [previews, setPreviews] = useState(emptyPreviews);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const loadContent = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setStatus(authError?.message ?? "Please sign in again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "principal_admin") {
      setAllowed(false);
      setStatus("Only the Principal/Admin can edit website content.");
      setLoading(false);
      return;
    }
    setAllowed(true);

    const { data, error } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();
    if (error) {
      setStatus(`Could not load website content: ${error.message}`);
      setLoading(false);
      return;
    }
    if (!data) {
      setContent(defaultSiteContent);
      setPreviews(emptyPreviews);
      setLoading(false);
      return;
    }

    const record = data as SiteContentRecord;
    setContent(record);
    const paths = [record.logo_path, record.principal_image_path, record.home_hero_image_path];
    const urls = await Promise.all(paths.map(async (path) => {
      if (!path) return "";
      const { data: signed, error: imageError } = await supabase.storage.from("school-media").createSignedUrl(path, 3600);
      if (imageError) {
        setStatus(`Could not load an existing website image: ${imageError.message}`);
        return "";
      }
      return signed.signedUrl;
    }));
    setPreviews({ logo: urls[0], principalImage: urls[1], heroImage: urls[2] });
    setLoading(false);
  }, []);

  useEffect(() => { void loadContent(); }, [loadContent]);

  function changeImage(field: ImageField, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setStatus("");
    if (file && !isValidImage(file)) {
      event.target.value = "";
      setStatus("Choose a JPEG, PNG, or WebP image no larger than 5 MB.");
      return;
    }
    setImages((current) => ({ ...current, [field]: file }));
    setPreviews((current) => ({ ...current, [field]: file ? URL.createObjectURL(file) : "" }));
  }

  async function uploadImage(field: ImageField, file: File, uploadedPaths: string[]) {
    const path = `website-content/${field}-${crypto.randomUUID()}-${safeFileName(file)}`;
    const { error } = await createSupabaseBrowserClient().storage.from("school-media").upload(path, file, { contentType: file.type });
    if (error) throw new Error(`Could not upload ${field} image: ${error.message}`);
    uploadedPaths.push(path);
    return path;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const nextContent: SiteContentRecord = {
      ...content,
      id: true,
      school_name: String(form.get("school_name") ?? "").trim(),
      session: String(form.get("session") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      principal_name: String(form.get("principal_name") ?? "").trim(),
      principal_message: String(form.get("principal_message") ?? "").trim(),
      home_hero_title: String(form.get("home_hero_title") ?? "").trim(),
      home_hero_text: String(form.get("home_hero_text") ?? "").trim(),
      about_vision: String(form.get("about_vision") ?? "").trim(),
      about_mission: String(form.get("about_mission") ?? "").trim(),
      about_history: String(form.get("about_history") ?? "").trim(),
      about_facilities: String(form.get("about_facilities") ?? "").split("\n").map((value) => value.trim()).filter(Boolean),
      contact_heading: String(form.get("contact_heading") ?? "").trim(),
      contact_description: String(form.get("contact_description") ?? "").trim(),
      google_maps_url: String(form.get("google_maps_url") ?? "").trim(),
      map_embed_url: String(form.get("map_embed_url") ?? "").trim(),
      admission_title: String(form.get("admission_title") ?? "").trim(),
      admission_description: String(form.get("admission_description") ?? "").trim(),
      updated_at: content.updated_at || new Date().toISOString(),
    };

    if (nextContent.about_facilities.length < 1 || nextContent.about_facilities.length > 20) {
      setStatus("Enter between 1 and 20 facilities, one per line.");
      setSaving(false);
      return;
    }
    if (![nextContent.google_maps_url, nextContent.map_embed_url].every((value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    })) {
      setStatus("Both Google Maps addresses must be valid HTTPS links.");
      setSaving(false);
      return;
    }

    const uploadedPaths: string[] = [];
    try {
      const supabase = createSupabaseBrowserClient();
      if (images.logo) nextContent.logo_path = await uploadImage("logo", images.logo, uploadedPaths);
      if (images.principalImage) nextContent.principal_image_path = await uploadImage("principalImage", images.principalImage, uploadedPaths);
      if (images.heroImage) nextContent.home_hero_image_path = await uploadImage("heroImage", images.heroImage, uploadedPaths);

      const { data, error } = await supabase.from("site_settings").upsert(nextContent, { onConflict: "id" }).select("*").single();
      if (error || !data) throw new Error(`Could not save website content: ${error?.message ?? "No saved row was returned."}`);

      const previousPaths = [
        content.logo_path !== nextContent.logo_path ? content.logo_path : null,
        content.principal_image_path !== nextContent.principal_image_path ? content.principal_image_path : null,
        content.home_hero_image_path !== nextContent.home_hero_image_path ? content.home_hero_image_path : null,
      ].filter((path): path is string => Boolean(path));
      if (previousPaths.length) {
        const { error: removeError } = await supabase.storage.from("school-media").remove(previousPaths);
        if (removeError) {
          setStatus(`Website content saved, but an old image could not be removed: ${removeError.message}`);
        } else {
          setStatus("Website content saved and published.");
        }
      } else {
        setStatus("Website content saved and published.");
      }
      setContent(data as SiteContentRecord);
      setImages(emptyImages);
      await loadContent();
    } catch (error) {
      if (uploadedPaths.length) {
        const { error: cleanupError } = await createSupabaseBrowserClient().storage.from("school-media").remove(uploadedPaths);
        if (cleanupError) console.error("Temporary website image cleanup failed:", cleanupError.message);
      }
      setStatus(error instanceof Error ? error.message : "Could not save website content.");
    } finally {
      setSaving(false);
    }
  }

  function field(name: keyof SiteContentRecord, label: string, maxLength: number, multiline = false, type = "text") {
    const value = content[name];
    if (typeof value !== "string") return null;
    return <label>{label}{multiline
      ? <textarea required name={name} value={value} onChange={(event) => setContent((current) => ({ ...current, [name]: event.target.value }))} maxLength={maxLength} rows={4} className="mt-1 w-full rounded border p-3" />
      : <input required name={name} type={type} value={value} onChange={(event) => setContent((current) => ({ ...current, [name]: event.target.value }))} maxLength={maxLength} className="mt-1 w-full rounded border p-3" />}
    </label>;
  }

  function imageField(fieldName: ImageField, label: string) {
    return <label className="block">{label}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => changeImage(fieldName, event)} className="mt-1 block w-full" /><span className="mt-1 block text-sm text-slate-600">JPEG, PNG, or WebP; maximum 5 MB.</span>{previews[fieldName] && <Image src={previews[fieldName]} alt={`${label} preview`} width={640} height={360} unoptimized className="mt-3 max-h-48 max-w-full rounded border object-contain" />}</label>;
  }

  return <AdminPage title="Website content" description="Update the school details and public page text. Saved changes appear on the website without a code deployment.">
    {loading ? <p>Loading website content…</p> : !allowed ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{status}</p> : <form onSubmit={save} className="grid max-w-4xl gap-6">
      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2"><h2 className="text-xl font-bold sm:col-span-2">School details</h2>{field("school_name", "School name", 120)}{field("session", "Session", 40)}{field("address", "Address", 500, true)}{field("phone", "Phone", 30, false, "tel")}{field("email", "Email", 254, false, "email")}{imageField("logo", "School logo")}</section>
      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Home page</h2>{field("home_hero_title", "Main heading", 180, true)}{field("home_hero_text", "Introduction", 1000, true)}{imageField("heroImage", "Hero image")}</section>
      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Principal&apos;s message</h2>{field("principal_name", "Principal name", 120)}{field("principal_message", "Message", 2000, true)}{imageField("principalImage", "Principal photo")}</section>
      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">About page</h2>{field("about_vision", "Vision", 2000, true)}{field("about_mission", "Mission", 2000, true)}{field("about_history", "History", 3000, true)}<label>Facilities (one per line)<textarea required name="about_facilities" value={content.about_facilities.join("\n")} onChange={(event) => setContent((current) => ({ ...current, about_facilities: event.target.value.split("\n") }))} maxLength={2000} rows={5} className="mt-1 w-full rounded border p-3" /></label></section>
      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Contact and admission</h2>{field("contact_heading", "Contact heading", 120)}{field("contact_description", "Contact description", 1000, true)}{field("admission_title", "Admission form heading", 120)}{field("admission_description", "Admission form description", 1000, true)}{field("google_maps_url", "Google Maps link", 2000, false, "url")}{field("map_embed_url", "Google Maps embed URL", 2000, false, "url")}</section>
      <button disabled={saving} className="rounded bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save and publish website content"}</button>
      {status && <p role="status" aria-live="polite">{status}</p>}
    </form>}
  </AdminPage>;
}
