-- Keep the bucket private while allowing visitors to read only consented,
-- published photos belonging to a published gallery album.
create policy "Public reads published gallery media"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'school-media'
    and exists (
      select 1
      from public.gallery_photos
      join public.gallery_albums on gallery_albums.id = gallery_photos.album_id
      where gallery_photos.storage_path = storage.objects.name
        and gallery_photos.is_public
        and gallery_photos.has_publication_consent
        and gallery_albums.is_public
    )
  );
