-- Shanti Global School initial schema.
-- School-specific values belong in src/config/school.ts and are seeded by scripts/seed.ts.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('pending', 'principal_admin', 'staff');
create type public.weekday as enum (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
);
create type public.inquiry_status as enum ('new', 'contacted', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  role public.app_role not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  standard smallint not null check (standard between 1 and 12),
  section text not null check (section ~ '^[A-Za-z0-9 -]{1,20}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (standard, section)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  qualification text not null check (char_length(trim(qualification)) between 1 and 200),
  experience_years smallint not null check (experience_years between 0 and 80),
  biography text,
  photo_path text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_subjects (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  primary key (teacher_id, subject_id)
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  is_urgent boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > published_at)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  is_public boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  title text not null check (char_length(trim(title)) between 1 and 180),
  starts_on date not null,
  ends_on date not null,
  description text,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  heading text not null check (char_length(trim(heading)) between 1 and 180),
  event_name text not null check (char_length(trim(event_name)) between 1 and 180),
  event_date date not null,
  is_public boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums(id) on delete cascade,
  storage_path text not null unique check (char_length(trim(storage_path)) between 1 and 500),
  alt_text text not null check (char_length(trim(alt_text)) between 1 and 180),
  display_order integer not null default 0 check (display_order >= 0),
  has_publication_consent boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_public or has_publication_consent)
);

create table public.class_timetables (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  day public.weekday not null,
  period smallint not null check (period between 1 and 8),
  subject_id uuid references public.subjects(id) on delete restrict,
  teacher_id uuid references public.teachers(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (class_id, day, period),
  check (
    (day = 'saturday' and period > 4 and subject_id is null and teacher_id is null)
    or (day <> 'saturday' or period <= 4)
  )
);

create unique index class_timetables_teacher_booking
  on public.class_timetables (teacher_id, day, period)
  where teacher_id is not null;

create table public.exam_timetables (
  id uuid primary key default gen_random_uuid(),
  standard smallint not null check (standard between 1 and 12),
  exam_name text not null check (char_length(trim(exam_name)) between 1 and 120),
  subject_id uuid references public.subjects(id) on delete restrict,
  subject_label text,
  exam_date date not null,
  starts_at time,
  ends_at time,
  instructions text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (subject_id is not null or subject_label is not null),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.live_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 180),
  embed_url text not null check (embed_url ~ '^https://'),
  recording_url text check (recording_url is null or recording_url ~ '^https://'),
  is_live boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  started_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_live and started_at is not null and ended_at is null)
    or (not is_live)
  )
);

create unique index only_one_live_event
  on public.live_events (is_live)
  where is_live;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  date_of_birth date not null,
  gender text not null check (gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  class_id uuid not null references public.classes(id) on delete restrict,
  roll_number text not null check (char_length(trim(roll_number)) between 1 and 30),
  parent_name text not null check (char_length(trim(parent_name)) between 1 and 120),
  parent_phone text not null check (parent_phone ~ '^[0-9+() -]{7,30}$'),
  address text not null check (char_length(trim(address)) between 1 and 1000),
  admission_date date not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, roll_number)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  phone text not null check (phone ~ '^[0-9+() -]{7,30}$'),
  email text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  requested_standard smallint check (requested_standard between 1 and 12),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  status public.inquiry_status not null default 'new',
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_rate_limits (
  identifier_hash text primary key check (char_length(identifier_hash) = 64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 1),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(trim(action)) between 1 and 120),
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index notices_public_feed on public.notices (published_at desc)
  where is_published;
create index events_public_feed on public.events (starts_at)
  where is_public;
create index holidays_public_feed on public.holidays (starts_on)
  where is_public;
create index gallery_photos_album_public on public.gallery_photos (album_id, display_order)
  where is_public and has_publication_consent;
create index students_class_index on public.students (class_id);
create index inquiries_status_index on public.inquiries (status, created_at desc);
create index exam_timetables_standard_index on public.exam_timetables (standard, exam_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New staff member')
  );
  return new;
end;
$$;

create or replace function public.is_principal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'principal_admin'
  );
$$;

create or replace function public.is_gallery_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('principal_admin', 'staff')
  );
$$;

create or replace function public.is_notice_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('principal_admin', 'staff')
  );
$$;

create or replace function public.write_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_id uuid;
begin
  record_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.activity_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), lower(tg_op), tg_table_name, record_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger teachers_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();
create trigger notices_updated_at before update on public.notices
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger holidays_updated_at before update on public.holidays
  for each row execute function public.set_updated_at();
create trigger gallery_albums_updated_at before update on public.gallery_albums
  for each row execute function public.set_updated_at();
create trigger gallery_photos_updated_at before update on public.gallery_photos
  for each row execute function public.set_updated_at();
create trigger live_events_updated_at before update on public.live_events
  for each row execute function public.set_updated_at();
create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger inquiries_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();
create trigger form_rate_limits_updated_at before update on public.form_rate_limits
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create trigger activity_notices after insert or update or delete on public.notices
  for each row execute function public.write_activity_log();
create trigger activity_gallery_albums after insert or update or delete on public.gallery_albums
  for each row execute function public.write_activity_log();
create trigger activity_gallery_photos after insert or update or delete on public.gallery_photos
  for each row execute function public.write_activity_log();
create trigger activity_students after insert or update or delete on public.students
  for each row execute function public.write_activity_log();
create trigger activity_live_events after insert or update or delete on public.live_events
  for each row execute function public.write_activity_log();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.notices enable row level security;
alter table public.events enable row level security;
alter table public.holidays enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.class_timetables enable row level security;
alter table public.exam_timetables enable row level security;
alter table public.live_events enable row level security;
alter table public.students enable row level security;
alter table public.inquiries enable row level security;
alter table public.form_rate_limits enable row level security;
alter table public.activity_logs enable row level security;

create policy "Users read their own profile"
  on public.profiles for select to authenticated using (id = auth.uid());
create policy "Principal admins read all profiles"
  on public.profiles for select to authenticated using (public.is_principal_admin());
create policy "Users update only their own non-role profile data"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "Principal admins manage profiles"
  on public.profiles for all to authenticated
  using (public.is_principal_admin())
  with check (public.is_principal_admin());

create policy "Public reads active subjects"
  on public.subjects for select using (is_active);
create policy "Principal admins manage subjects"
  on public.subjects for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads active classes"
  on public.classes for select using (is_active);
create policy "Principal admins manage classes"
  on public.classes for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads published teachers"
  on public.teachers for select using (is_public);
create policy "Principal admins manage teachers"
  on public.teachers for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());
create policy "Public reads subjects for published teachers"
  on public.teacher_subjects for select
  using (exists (select 1 from public.teachers where id = teacher_id and is_public));
create policy "Principal admins manage teacher subjects"
  on public.teacher_subjects for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads currently published notices"
  on public.notices for select
  using (is_published and published_at <= now() and (expires_at is null or expires_at > now()));
create policy "Notice managers manage notices"
  on public.notices for all to authenticated
  using (public.is_notice_manager()) with check (public.is_notice_manager());

create policy "Public reads public events"
  on public.events for select using (is_public);
create policy "Principal admins manage events"
  on public.events for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads public holidays"
  on public.holidays for select using (is_public);
create policy "Principal admins manage holidays"
  on public.holidays for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads public gallery albums"
  on public.gallery_albums for select using (is_public);
create policy "Gallery managers manage albums"
  on public.gallery_albums for all to authenticated
  using (public.is_gallery_manager()) with check (public.is_gallery_manager());
create policy "Public reads consented public gallery photos"
  on public.gallery_photos for select
  using (
    is_public
    and has_publication_consent
    and exists (select 1 from public.gallery_albums where id = album_id and is_public)
  );
create policy "Gallery managers manage photos"
  on public.gallery_photos for all to authenticated
  using (public.is_gallery_manager()) with check (public.is_gallery_manager());

create policy "Public reads class timetables"
  on public.class_timetables for select using (true);
create policy "Principal admins manage class timetables"
  on public.class_timetables for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads exam timetables"
  on public.exam_timetables for select using (true);
create policy "Principal admins manage exam timetables"
  on public.exam_timetables for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Public reads the active live event"
  on public.live_events for select using (is_live);
create policy "Principal admins manage live events"
  on public.live_events for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());

create policy "Principal admins manage students"
  on public.students for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());
create policy "Principal admins manage inquiries"
  on public.inquiries for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());
create policy "Principal admins manage rate limits"
  on public.form_rate_limits for all to authenticated
  using (public.is_principal_admin()) with check (public.is_principal_admin());
create policy "Principal admins read activity logs"
  on public.activity_logs for select to authenticated
  using (public.is_principal_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-media',
  'school-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Gallery managers read school media"
  on storage.objects for select to authenticated
  using (bucket_id = 'school-media' and public.is_gallery_manager());
create policy "Gallery managers upload school media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'school-media' and public.is_gallery_manager());
create policy "Gallery managers update school media"
  on storage.objects for update to authenticated
  using (bucket_id = 'school-media' and public.is_gallery_manager())
  with check (bucket_id = 'school-media' and public.is_gallery_manager());
create policy "Gallery managers delete school media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'school-media' and public.is_gallery_manager());

grant usage on schema public to anon, authenticated;
grant select on public.subjects, public.classes, public.teachers, public.teacher_subjects,
  public.notices, public.events, public.holidays, public.gallery_albums, public.gallery_photos,
  public.class_timetables, public.exam_timetables, public.live_events to anon, authenticated;

-- Lets the public Live page update immediately when an admin starts or ends an event.
alter publication supabase_realtime add table public.live_events;
