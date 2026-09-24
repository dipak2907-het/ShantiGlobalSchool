"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { downloadCsv } from "@/lib/csv";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type InquiryStatus = "new" | "contacted" | "closed";
type Inquiry = {
  id: string; full_name: string; phone: string; email: string; requested_standard: number | null;
  message: string; status: InquiryStatus; contacted_at: string | null; created_at: string;
};

export default function InquiriesAdminPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InquiryStatus>("all");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createSupabaseBrowserClient()
      .from("inquiries")
      .select("id, full_name, phone, email, requested_standard, message, status, contacted_at, created_at")
      .order("created_at", { ascending: false });
    if (error) setStatus(error.message);
    else setInquiries((data ?? []) as Inquiry[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadInquiries(); }, [loadInquiries]);

  const filteredInquiries = useMemo(() => {
    const term = query.trim().toLowerCase();
    return inquiries.filter((inquiry) => (statusFilter === "all" || inquiry.status === statusFilter)
      && (!term || [inquiry.full_name, inquiry.phone, inquiry.email, inquiry.message, String(inquiry.requested_standard ?? "")]
        .some((value) => value.toLowerCase().includes(term))));
  }, [inquiries, query, statusFilter]);

  async function updateStatus(inquiry: Inquiry, nextStatus: InquiryStatus) {
    setStatus("");
    const update = nextStatus === "contacted" && inquiry.status !== "contacted"
      ? { status: nextStatus, contacted_at: new Date().toISOString() }
      : { status: nextStatus };
    const { error } = await createSupabaseBrowserClient().from("inquiries").update(update).eq("id", inquiry.id);
    if (error) { setStatus(error.message); return; }
    setStatus(`Inquiry marked ${nextStatus}.`);
    await loadInquiries();
  }

  async function removeInquiry(inquiry: Inquiry) {
    if (!window.confirm(`Delete the inquiry from ${inquiry.full_name}? This cannot be undone.`)) return;
    const { error } = await createSupabaseBrowserClient().from("inquiries").delete().eq("id", inquiry.id);
    if (error) { setStatus(`Cannot delete this inquiry: ${error.message}`); return; }
    setStatus("Inquiry deleted.");
    await loadInquiries();
  }

  function exportInquiries() {
    downloadCsv("admission-inquiries.csv",
      ["Received", "Name", "Phone", "Email", "Requested standard", "Message", "Status", "Contacted at"],
      filteredInquiries.map((inquiry) => [inquiry.created_at, inquiry.full_name, inquiry.phone, inquiry.email, inquiry.requested_standard ?? "", inquiry.message, inquiry.status, inquiry.contacted_at ?? ""]));
  }

  return <AdminPage title="Admission inquiries" description="Review private admission submissions, update their status, and export records.">
    <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Submissions</h2><p className="text-sm text-slate-600">{filteredInquiries.length} shown</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inquiries…" className="rounded border p-2" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | InquiryStatus)} className="rounded border p-2"><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><button type="button" onClick={exportInquiries} className="rounded border border-blue-700 px-3 py-2 font-semibold text-blue-700">Export CSV</button></div></div>
      {status && <p role="status" className="mt-3 text-sm text-slate-700">{status}</p>}
      {loading ? <p className="mt-4">Loading…</p> : <table className="mt-4 w-full min-w-[70rem] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Received</th><th className="p-3">Applicant</th><th className="p-3">Class</th><th className="p-3">Message</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{filteredInquiries.length ? filteredInquiries.map((inquiry) => <tr key={inquiry.id}><td className="border-t p-3 whitespace-nowrap">{new Date(inquiry.created_at).toLocaleDateString()}</td><td className="border-t p-3"><strong>{inquiry.full_name}</strong><a className="block text-blue-700 hover:underline" href={`tel:${inquiry.phone}`}>{inquiry.phone}</a><a className="block text-blue-700 hover:underline" href={`mailto:${inquiry.email}`}>{inquiry.email}</a></td><td className="border-t p-3">{inquiry.requested_standard ?? "—"}</td><td className="border-t p-3 max-w-xs whitespace-pre-wrap">{inquiry.message}</td><td className="border-t p-3"><select aria-label={`Status for ${inquiry.full_name}`} value={inquiry.status} onChange={(event) => updateStatus(inquiry, event.target.value as InquiryStatus)} className="rounded border p-2"><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>{inquiry.contacted_at && <span className="mt-1 block text-xs text-slate-500">Contacted {new Date(inquiry.contacted_at).toLocaleDateString()}</span>}</td><td className="border-t p-3"><button type="button" onClick={() => removeInquiry(inquiry)} className="font-semibold text-red-700">Delete</button></td></tr>) : <tr><td colSpan={6} className="border-t p-4 text-slate-600">No inquiries match these filters.</td></tr>}</tbody></table>}
    </section>
  </AdminPage>;
}
