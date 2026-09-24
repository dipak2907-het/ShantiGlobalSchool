"use client";

import { FormEvent, useState } from "react";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { schoolContent } from "@/config/school";

export default function AdmissionPage() {
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage("PLACEHOLDER: Form submission will be connected securely in the admin/API step."); }
  return <PageShell><PageHeading title={schoolContent.admission.title} description={schoolContent.admission.description} /><form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-xl border p-6"><label>Full name<input required name="name" className="mt-1 w-full rounded border p-3" /></label><label>Phone<input required name="phone" inputMode="tel" className="mt-1 w-full rounded border p-3" /></label><label>Email<input required name="email" type="email" className="mt-1 w-full rounded border p-3" /></label><label>Class<select required name="standard" className="mt-1 w-full rounded border p-3"><option value="">Select</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label><label>Message<textarea required name="message" rows={5} className="mt-1 w-full rounded border p-3" /></label><div className="hidden" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div><button className="rounded-md bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800">Send inquiry</button>{message && <p role="status" className="text-sm text-slate-600">{message}</p>}</form></PageShell>;
}
