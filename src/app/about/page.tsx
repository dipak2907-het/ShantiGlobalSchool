import Image from "next/image";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { schoolContent } from "@/config/school";

export default function AboutPage() {
  return <PageShell><PageHeading title="About" /><div className="grid gap-8 lg:grid-cols-2"><section><h2 className="text-2xl font-bold">Vision</h2><p className="mt-3 text-slate-600">{schoolContent.about.vision}</p><h2 className="mt-8 text-2xl font-bold">Mission</h2><p className="mt-3 text-slate-600">{schoolContent.about.mission}</p><h2 className="mt-8 text-2xl font-bold">Our history</h2><p className="mt-3 text-slate-600">{schoolContent.about.history}</p></section><Image src={schoolContent.home.heroImage} alt="" width={1200} height={650} className="rounded-xl object-cover" /></div><section className="mt-12"><h2 className="text-2xl font-bold">Facilities</h2><ul className="mt-4 grid gap-3 sm:grid-cols-3">{schoolContent.about.facilities.map((facility) => <li key={facility} className="rounded-lg bg-slate-100 p-4 font-medium">{facility}</li>)}</ul></section></PageShell>;
}
