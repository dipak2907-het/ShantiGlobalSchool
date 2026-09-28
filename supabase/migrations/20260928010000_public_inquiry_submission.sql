create or replace function public.submit_public_inquiry(
  p_full_name text,
  p_phone text,
  p_email text,
  p_requested_standard smallint,
  p_message text,
  p_identifier_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  if char_length(trim(p_full_name)) not between 1 and 120
    or p_phone !~ '^[0-9+() -]{7,30}$'
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_requested_standard not between 1 and 12
    or char_length(trim(p_message)) not between 1 and 3000
    or p_identifier_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Invalid inquiry fields';
  end if;

  delete from public.form_rate_limits
  where updated_at < now() - interval '1 day';

  insert into public.form_rate_limits as existing (
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_identifier_hash,
    now(),
    1,
    now()
  )
  on conflict (identifier_hash) do update
    set window_started_at = case
          when existing.window_started_at <= now() - interval '10 minutes' then now()
          else existing.window_started_at
        end,
        request_count = case
          when existing.window_started_at <= now() - interval '10 minutes' then 1
          else existing.request_count + 1
        end,
        updated_at = now()
  returning request_count into current_count;

  if current_count > 5 then
    return false;
  end if;

  insert into public.inquiries (
    full_name,
    phone,
    email,
    requested_standard,
    message
  ) values (
    trim(p_full_name),
    trim(p_phone),
    lower(trim(p_email)),
    p_requested_standard,
    trim(p_message)
  );

  return true;
end;
$$;

revoke all on function public.submit_public_inquiry(text, text, text, smallint, text, text) from public;
revoke all on function public.submit_public_inquiry(text, text, text, smallint, text, text) from anon, authenticated;
grant execute on function public.submit_public_inquiry(text, text, text, smallint, text, text) to service_role;
