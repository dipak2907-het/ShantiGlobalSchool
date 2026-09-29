create table public.site_settings (
  id boolean primary key default true check (id),
  school_name text not null check (char_length(trim(school_name)) between 1 and 120),
  session text not null check (char_length(trim(session)) between 1 and 40),
  address text not null check (char_length(trim(address)) between 1 and 500),
  phone text not null check (char_length(trim(phone)) between 1 and 30),
  email text not null check (
    char_length(trim(email)) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  logo_path text,
  principal_name text not null check (char_length(trim(principal_name)) between 1 and 120),
  principal_message text not null check (char_length(trim(principal_message)) between 1 and 2000),
  principal_image_path text,
  home_hero_title text not null check (char_length(trim(home_hero_title)) between 1 and 180),
  home_hero_text text not null check (char_length(trim(home_hero_text)) between 1 and 1000),
  home_hero_image_path text,
  about_vision text not null check (char_length(trim(about_vision)) between 1 and 2000),
  about_mission text not null check (char_length(trim(about_mission)) between 1 and 2000),
  about_history text not null check (char_length(trim(about_history)) between 1 and 3000),
  about_facilities text[] not null check (cardinality(about_facilities) between 1 and 20),
  contact_heading text not null check (char_length(trim(contact_heading)) between 1 and 120),
  contact_description text not null check (char_length(trim(contact_description)) between 1 and 1000),
  google_maps_url text not null check (google_maps_url ~ '^https://'),
  map_embed_url text not null check (map_embed_url ~ '^https://'),
  admission_title text not null check (char_length(trim(admission_title)) between 1 and 120),
  admission_description text not null check (char_length(trim(admission_description)) between 1 and 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (logo_path is null or logo_path like 'website-content/%'),
  check (principal_image_path is null or principal_image_path like 'website-content/%'),
  check (home_hero_image_path is null or home_hero_image_path like 'website-content/%')
);

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "Public reads website content"
  on public.site_settings for select to anon, authenticated
  using (true);

create policy "Principal admins manage website content"
  on public.site_settings for all to authenticated
  using (public.is_principal_admin())
  with check (public.is_principal_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

create policy "Public reads active school website images"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'school-media'
    and exists (
      select 1
      from public.site_settings
      where site_settings.logo_path = storage.objects.name
        or site_settings.principal_image_path = storage.objects.name
        or site_settings.home_hero_image_path = storage.objects.name
    )
  );

create policy "Principal admins manage school website images"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'school-media'
    and name like 'website-content/%'
    and public.is_principal_admin()
  )
  with check (
    bucket_id = 'school-media'
    and name like 'website-content/%'
    and public.is_principal_admin()
  );

alter publication supabase_realtime add table public.site_settings;
