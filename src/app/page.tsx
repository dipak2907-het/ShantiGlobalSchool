import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/public/page-shell";
import { LiveEvent } from "@/components/public/live-event";
import { HomeHighlights } from "@/components/public/home-highlights";
import { school, schoolContent } from "@/config/school";

export default function Home() {
  return <PageShell>
    <section className="grid overflow-hidden rounded-2xl bg-blue-950 text-white lg:grid-cols-2">
      <div className="p-8 sm:p-12"><p className="font-semibold text-amber-300">{school.name} · {school.session}</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{schoolContent.home.heroTitle}</h1><p className="mt-5 max-w-xl text-blue-100">{schoolContent.home.heroText}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/admission" className="rounded-md bg-amber-400 px-5 py-3 font-bold text-slate-950">Admission inquiry</Link><Link href="/about" className="rounded-md border border-white/50 px-5 py-3 font-bold">Discover more</Link></div></div>
      <Image src={schoolContent.home.heroImage} alt="" width={1200} height={650} priority className="h-full min-h-64 w-full object-cover" />
    </section>
    <HomeHighlights variant="notice" />
    <section className="mt-12 grid items-center gap-8 lg:grid-cols-2"><div><p className="font-semibold text-blue-700">Principal&apos;s message</p><h2 className="mt-2 text-3xl font-bold">{school.principal.name}</h2><p className="mt-4 text-slate-600">{school.principal.message}</p></div><Image className="max-h-72 w-full rounded-xl object-cover sm:max-w-sm" src={schoolContent.home.principalImage} alt="" width={400} height={400} /></section>
    <section className="mt-12"><h2 className="text-3xl font-bold">Quick links</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{schoolContent.home.quickLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-lg border p-4 font-semibold hover:border-blue-700 hover:text-blue-700">{link.label} →</Link>)}</div></section>
    <section className="mt-12 grid gap-6 md:grid-cols-2"><HomeHighlights variant="event" /><LiveEvent variant="banner" /></section>
  </PageShell>;
}
