"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Holiday = { id: string; title: string; starts_on: string; ends_on: string; description: string | null };

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadHolidays() {
      const { data } = await createSupabaseBrowserClient().from("holidays").select("id, title, starts_on, ends_on, description").order("starts_on");
      setHolidays((data ?? []) as Holiday[]);
      setLoading(false);
    }
    void loadHolidays();
  }, []);
  return <PageShell><div className="flex flex-wrap items-center justify-between gap-4"><PageHeading title="Holiday list" description="School holiday calendar." /><button onClick={() => window.print()} className="rounded-md border px-4 py-2 font-semibold print:hidden">Print</button></div><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="p-4">Date</th><th className="p-4">Holiday</th><th className="p-4">Details</th></tr></thead><tbody>{loading ? <tr><td colSpan={3} className="p-4">Loading holidays...</td></tr> : holidays.length ? holidays.map((holiday) => <tr key={holiday.id}><td className="border-t p-4">{holiday.starts_on}{holiday.ends_on !== holiday.starts_on ? ` to ${holiday.ends_on}` : ""}</td><td className="border-t p-4 font-semibold">{holiday.title}</td><td className="border-t p-4">{holiday.description ?? "—"}</td></tr>) : <tr><td colSpan={3} className="p-4 text-slate-600">No holidays are available.</td></tr>}</tbody></table></div></PageShell>;
}
