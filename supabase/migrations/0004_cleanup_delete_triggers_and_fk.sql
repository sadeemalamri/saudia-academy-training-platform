-- =====================================================================
-- Delete auth.users only when the delete started directly from profiles
-- (not as a cascade already triggered by deleting auth.users) —
-- avoids double-delete conflicts.
--
-- NOTE: this function is defined but not currently wired to a trigger
-- in the source scripts. Confirm in your live database whether a
-- trigger such as:
--   create trigger delete_auth_user_on_profile_delete_trigger
--     after delete on public.profiles
--     for each row
--     execute procedure public.delete_auth_user_on_profile_delete();
-- already exists — if so, add it here too so the schema file matches
-- what's actually deployed.
-- =====================================================================

create or replace function public.delete_auth_user_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- pg_trigger_depth() = 1 means this delete started directly on profiles
  -- (not a cascade coming from a delete on auth.users)
  if pg_trigger_depth() = 1 then
    delete from auth.users where id = old.id;
  end if;

  return old;
end;
$$;

-- =====================================================================
-- Let created_by / assigned_by go NULL instead of blocking admin
-- account deletion when the admin who created the row is removed
-- =====================================================================

alter table public.program_requirements
  drop constraint if exists program_requirements_created_by_fkey,
  add constraint program_requirements_created_by_fkey
    foreign key (created_by) references public.profiles (id)
    on delete set null;

alter table public.training_plans
  drop constraint if exists training_plans_created_by_fkey,
  add constraint training_plans_created_by_fkey
    foreign key (created_by) references public.profiles (id)
    on delete set null;

alter table public.application_assignments
  drop constraint if exists application_assignments_assigned_by_fkey,
  add constraint application_assignments_assigned_by_fkey
    foreign key (assigned_by) references public.profiles (id)
    on delete set null;
