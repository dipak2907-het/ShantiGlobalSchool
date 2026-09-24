-- Allow anonymous visitors to read a teacher image only when its linked teacher
-- profile is explicitly marked public. The bucket itself remains private.
create policy "Public reads photos for published teachers"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'school-media'
    and exists (
      select 1
      from public.teachers
      where teachers.is_public
        and teachers.photo_path = storage.objects.name
    )
  );
