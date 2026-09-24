"use client";

import { FormEvent, useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SettingsPage() {
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password: String(form.get("password")) });
    setStatus(error ? error.message : "Password changed.");
    if (!error) formElement.reset();
  }
  return <AdminPage title="Settings" description="Change your own password. School content is configured in src/config/school.ts."><form onSubmit={submit} className="grid max-w-xl gap-4 rounded-xl bg-white p-6 shadow-sm"><label>New password<input required name="password" type="password" minLength={12} autoComplete="new-password" className="mt-1 w-full rounded border p-3" /></label><button className="rounded bg-blue-700 p-3 font-bold text-white">Change password</button>{status && <p role="status">{status}</p>}</form></AdminPage>;
}
