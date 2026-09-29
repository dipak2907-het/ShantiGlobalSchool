"use client";

import Link from "next/link";
import { schoolContent } from "@/config/school";
import { useSiteContent } from "./site-content-provider";

export function SiteFooter() {
  const content = useSiteContent();
  return <footer className="mt-auto bg-slate-950 text-slate-200"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
    <div><h2 className="font-bold">{content.school_name}</h2><p className="mt-2 text-sm text-slate-400">{content.address}</p></div>
    <div><h2 className="font-bold">Explore</h2><div className="mt-2 grid gap-1 text-sm">{schoolContent.nav.map((item) => <Link key={item.href} href={item.href} className="text-slate-400 hover:text-white">{item.label}</Link>)}</div></div>
    <div><h2 className="font-bold">Contact</h2><p className="mt-2 text-sm text-slate-400">{content.phone}<br />{content.email}</p></div>
  </div><div className="border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-400">© {content.session} {content.school_name}</div></footer>;
}
