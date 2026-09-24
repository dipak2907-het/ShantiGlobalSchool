import { createClient } from "@supabase/supabase-js";
import { schoolSeed } from "../src/config/school";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the seed script.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const { error: subjectsError } = await supabase
    .from("subjects")
    .upsert(schoolSeed.subjects, { onConflict: "name" });
  if (subjectsError) throw subjectsError;

  const { error: classesError } = await supabase
    .from("classes")
    .upsert(schoolSeed.classes, { onConflict: "standard,section" });
  if (classesError) throw classesError;

  const { error: teachersError } = await supabase.from("teachers").upsert(
    schoolSeed.teachers.map((teacher) => ({
      full_name: teacher.fullName,
      seed_key: teacher.seedKey,
      qualification: teacher.qualification,
      experience_years: teacher.experienceYears,
      biography: teacher.biography,
      is_public: teacher.isPublic,
    })),
    { onConflict: "seed_key" },
  );
  if (teachersError) throw teachersError;

  const { error: noticesError } = await supabase.from("notices").upsert(
    schoolSeed.notices.map((notice) => ({
      title: notice.title,
      seed_key: notice.seedKey,
      body: notice.body,
      published_at: notice.publishedAt,
      is_published: true,
      is_urgent: notice.isUrgent,
    })),
    { onConflict: "seed_key" },
  );
  if (noticesError) throw noticesError;

  const { error: eventsError } = await supabase.from("events").upsert(
    schoolSeed.events.map((event) => ({
      title: event.title,
      seed_key: event.seedKey,
      description: event.description,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      location: event.location,
      is_public: event.isPublic,
    })),
    { onConflict: "seed_key" },
  );
  if (eventsError) throw eventsError;

  const { error: holidaysError } = await supabase.from("holidays").upsert(
    schoolSeed.holidays.map((holiday) => ({
      title: holiday.title,
      seed_key: holiday.seedKey,
      starts_on: holiday.startsOn,
      ends_on: holiday.endsOn,
      description: holiday.description,
      is_public: holiday.isPublic,
    })),
    { onConflict: "seed_key" },
  );
  if (holidaysError) throw holidaysError;

  console.log("PLACEHOLDER seed data created successfully.");
}

seed().catch((error: unknown) => {
  console.error("Unable to create seed data:", error);
  process.exitCode = 1;
});
