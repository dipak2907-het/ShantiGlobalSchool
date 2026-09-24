"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { school } from "@/config/school";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PublicTeacher = {
  id: string;
  full_name: string;
  qualification: string;
  experience_years: number;
  biography: string | null;
  photo_path: string | null;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadTeachers() {
      const { data, error } = await createSupabaseBrowserClient()
        .from("teachers")
        .select("id, full_name, qualification, experience_years, biography, photo_path")
        .eq("is_public", true)
        .order("full_name");

      if (error) setErrorMessage("Unable to load teachers at this time.");
      else {
        const publicTeachers = (data ?? []) as PublicTeacher[];
        const signedUrls = await Promise.all(publicTeachers.map(async (teacher) => {
          if (!teacher.photo_path) return [teacher.id, ""] as const;
          const { data: signedUrl } = await createSupabaseBrowserClient().storage.from("school-media").createSignedUrl(teacher.photo_path, 60 * 60);
          return [teacher.id, signedUrl?.signedUrl ?? ""] as const;
        }));
        setTeachers(publicTeachers);
        setPhotoUrls(Object.fromEntries(signedUrls));
      }
      setLoading(false);
    }

    loadTeachers();
  }, []);

  return <PageShell><PageHeading title="Teachers" description="Meet the school teaching team." />{loading ? <p>Loading teachers…</p> : errorMessage ? <p role="alert">{errorMessage}</p> : teachers.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{teachers.map((teacher) => <article key={teacher.id} className="overflow-hidden rounded-xl border">{photoUrls[teacher.id] ? <img src={photoUrls[teacher.id]} alt={`Portrait of ${teacher.full_name}`} className="aspect-square w-full object-cover" /> : <img src={school.logoPath} alt="" className="aspect-square w-full object-cover p-12" />}<div className="p-5"><h2 className="text-xl font-bold">{teacher.full_name}</h2><dl className="mt-4 space-y-2 text-sm text-slate-600"><div><dt className="inline font-semibold">Qualification: </dt><dd className="inline">{teacher.qualification}</dd></div><div><dt className="inline font-semibold">Experience: </dt><dd className="inline">{teacher.experience_years} years</dd></div>{teacher.biography && <div><dt className="font-semibold">About</dt><dd>{teacher.biography}</dd></div>}</dl></div></article>)}</div> : <p>No public teacher profiles are available yet.</p>}</PageShell>;
}
