-- Timetables stay private until an administrator explicitly publishes their
-- class and section. Existing schedules are deliberately set to private.
alter table public.classes
  add column if not exists is_published boolean not null default false;

update public.classes
set is_published = false
where is_published is distinct from false;

drop policy if exists "Public reads active classes" on public.classes;
create policy "Public reads published classes"
  on public.classes for select
  using (is_active and is_published);

drop policy if exists "Public reads class timetables" on public.class_timetables;
create policy "Public reads published class timetables"
  on public.class_timetables for select
  using (
    exists (
      select 1
      from public.classes
      where classes.id = class_timetables.class_id
        and classes.is_active
        and classes.is_published
    )
  );
