"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { school } from "@/config/school";

type Role = "principal_admin" | "staff";
type Profile = { full_name: string; role: Role };

const adminLinks: { href: string; label: string; roles: readonly Role[] }[] = [
  { href: "/admin/dashboard", label: "Dashboard", roles: ["principal_admin", "staff"] },
  { href: "/admin/notices", label: "Notices", roles: ["principal_admin", "staff"] },
  { href: "/admin/gallery", label: "Gallery", roles: ["principal_admin", "staff"] },
  { href: "/admin/teachers", label: "Teachers", roles: ["principal_admin"] },
  { href: "/admin/students", label: "Students", roles: ["principal_admin"] },
  { href: "/admin/timetables", label: "Timetables", roles: ["principal_admin"] },
  { href: "/admin/events", label: "Events & holidays", roles: ["principal_admin"] },
  { href: "/admin/inquiries", label: "Inquiries", roles: ["principal_admin"] },
  { href: "/admin/live", label: "Go live", roles: ["principal_admin"] },
  { href: "/admin/activity", label: "Activity log", roles: ["principal_admin"] },
  { href: "/admin/settings", label: "Settings", roles: ["principal_admin", "staff"] },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/admin/login"); return; }
      const { data, error } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
      if (error || !data) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
      setProfile(data as Profile);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/admin/login");
  }

  if (loading || !profile) return <main className="grid min-h-screen place-items-center">Loading secure workspace…</main>;
  return <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[16rem_1fr]">
    <aside className="bg-slate-950 p-5 text-slate-200"><Link href="/admin/dashboard" className="font-bold text-white">{school.name}<span className="block text-xs font-normal text-slate-400">Admin workspace</span></Link>
      <p className="mt-8 text-sm font-semibold">{profile.full_name}</p><p className="text-xs uppercase tracking-wide text-slate-400">{profile.role === "principal_admin" ? "Principal / admin" : "Staff"}</p>
      <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin navigation">{adminLinks.filter((link) => link.roles.includes(profile.role)).map((link) => <Link key={link.href} href={link.href} className={`whitespace-nowrap rounded px-3 py-2 text-sm ${pathname === link.href ? "bg-blue-700 text-white" : "hover:bg-slate-800"}`}>{link.label}</Link>)}</nav>
      <button onClick={signOut} className="mt-8 rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">Sign out</button>
    </aside>
    <main className="p-5 sm:p-8">{children}</main>
  </div>;
}
