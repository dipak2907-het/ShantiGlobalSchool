"use client";

import { FormEvent, useState } from "react";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { useSiteContent } from "@/components/public/site-content-provider";

type SubmissionState = "idle" | "submitting" | "success" | "error";

export default function AdmissionPage() {
  const content = useSiteContent();
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSubmissionState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.get("name"),
          phone: values.get("phone"),
          email: values.get("email"),
          standard: values.get("standard"),
          message: values.get("message"),
          website: values.get("website"),
        }),
      });
      const result: { error?: string; message?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We could not send your inquiry. Please try again.");

      form.reset();
      setSubmissionState("success");
      setMessage(result.message ?? "Thank you. Your inquiry has been sent to the school office.");
    } catch (error) {
      setSubmissionState("error");
      setMessage(error instanceof Error ? error.message : "We could not send your inquiry. Please try again.");
    }
  }

  return <PageShell>
    <PageHeading title={content.admission_title} description={content.admission_description} />
    <form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-xl border p-6">
      <label>Full name<input required name="name" maxLength={120} autoComplete="name" className="mt-1 w-full rounded border p-3" /></label>
      <label>Phone<input required name="phone" inputMode="tel" autoComplete="tel" maxLength={30} pattern="[0-9+() -]{7,30}" title="Enter a phone number containing 7 to 30 digits or phone symbols." className="mt-1 w-full rounded border p-3" /></label>
      <label>Email<input required name="email" type="email" maxLength={254} autoComplete="email" className="mt-1 w-full rounded border p-3" /></label>
      <label>Class<select required name="standard" defaultValue="" className="mt-1 w-full rounded border p-3"><option value="">Select</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
      <label>Message<textarea required name="message" minLength={1} maxLength={3000} rows={5} className="mt-1 w-full rounded border p-3" /></label>
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button disabled={submissionState === "submitting"} className="rounded-md bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{submissionState === "submitting" ? "Sending..." : "Send inquiry"}</button>
      {message && <p role={submissionState === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm ${submissionState === "error" ? "text-red-700" : "text-slate-600"}`}>{message}</p>}
    </form>
  </PageShell>;
}
