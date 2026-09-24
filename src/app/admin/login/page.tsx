"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { school } from "@/config/school";

export default function AdminLoginPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    if (signInError) { setError("Unable to sign in. Check your email and password."); setBusy(false); return; }
    router.replace("/admin/dashboard");
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-7 shadow-sm"><h1 className="text-2xl font-bold">{school.name}</h1><p className="mt-1 text-slate-600">Admin sign in</p><label className="mt-6 block">Email<input required name="email" type="email" autoComplete="email" className="mt-1 w-full rounded border p-3" /></label><label className="mt-4 block">Password<input required name="password" type="password" autoComplete="current-password" className="mt-1 w-full rounded border p-3" /></label>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<button disabled={busy} className="mt-6 w-full rounded bg-blue-700 p-3 font-bold text-white disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button></form></main>;
}
