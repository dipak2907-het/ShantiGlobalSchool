"use client";

import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { useSiteContent } from "@/components/public/site-content-provider";

export default function ContactPage() {
  const content = useSiteContent();
  return <PageShell><PageHeading title="Contact" description={content.contact_description} /><div className="grid gap-8 lg:grid-cols-2"><section className="rounded-xl bg-slate-100 p-6"><h2 className="text-2xl font-bold">{content.contact_heading}</h2><dl className="mt-6 space-y-4"><div><dt className="font-semibold">Address</dt><dd className="text-slate-600">{content.address}</dd></div><div><dt className="font-semibold">Phone</dt><dd><a className="text-blue-700 hover:underline" href={`tel:${content.phone}`}>{content.phone}</a></dd></div><div><dt className="font-semibold">Email</dt><dd><a className="text-blue-700 hover:underline" href={`mailto:${content.email}`}>{content.email}</a></dd></div></dl></section><section><iframe title="School location" src={content.map_embed_url} className="h-96 w-full rounded-xl border" loading="lazy" /><a className="mt-3 inline-block font-semibold text-blue-700 hover:underline" href={content.google_maps_url} target="_blank" rel="noreferrer">Open in Google Maps →</a></section></div></PageShell>;
}
