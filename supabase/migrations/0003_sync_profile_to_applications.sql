-- =====================================================================
-- Trigger: syncs full_name + phone + email from profiles
-- to applications (first_name/last_name, mobile, email) automatically,
-- runs with full privileges (SECURITY DEFINER) bypassing RLS.
-- =====================================================================

create or replace function public.sync_full_name_to_applications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name_parts text[];
  new_first_name text;
  new_last_name text;
begin

  -- ---- name ----
  if new.full_name is distinct from old.full_name and new.full_name is not null then

    name_parts := regexp_split_to_array(trim(new.full_name), '\s+');
    new_first_name := name_parts[1];

    if array_length(name_parts, 1) > 1 then
      new_last_name := array_to_string(name_parts[2:array_length(name_parts,1)], ' ');
    else
      new_last_name := name_parts[1];
    end if;

    update public.applications
    set first_name = new_first_name,
        last_name = new_last_name
    where student_id = new.id;

  end if;

  -- ---- phone ----
  if new.phone is distinct from old.phone and new.phone is not null then

    update public.applications
    set mobile = new.phone
    where student_id = new.id;

  end if;

  -- ---- email ----
  if new.email is distinct from old.email and new.email is not null then

    update public.applications
    set email = new.email
    where student_id = new.id;

  end if;

  return new;
end;
$$;

drop trigger if exists sync_full_name_to_applications_trigger on public.profiles;

create trigger sync_full_name_to_applications_trigger
  after update of full_name, phone, email on public.profiles
  for each row
  execute procedure public.sync_full_name_to_applications();

-- =====================================================================
-- Makes profiles.email update only when the real email in auth.users
-- actually changes (after successful confirmation) — single source
-- of truth, prevents any conflicts
-- =====================================================================

create or replace function public.sync_auth_email_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then

    update public.profiles
    set email = new.email
    where id = new.id;

  end if;

  return new;
end;
$$;

drop trigger if exists sync_auth_email_to_profile_trigger on auth.users;

create trigger sync_auth_email_to_profile_trigger
  after update of email on auth.users
  for each row
  execute procedure public.sync_auth_email_to_profile();
