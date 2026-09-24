import Image from "next/image";
import Link from "next/link";
import { school, schoolContent } from "@/config/school";

export function SiteHeader() {
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
    <Link href="/" className="flex items-center gap-3 font-bold text-slate-900"><Image src={school.logoPath} alt="" width={42} height={42} /><span>{school.name}<small className="block font-normal text-slate-500">{school.session}</small></span></Link>
    <nav aria-label="Main navigation" className="hidden gap-4 text-sm font-medium md:flex">{schoolContent.nav.map((item) => <Link key={item.href} href={item.href} className="hover:text-blue-700">{item.label}</Link>)}</nav>
    <Link href="/admission" className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Inquiry</Link>
  </div></header>;
}
