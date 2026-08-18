-- =====================================================================
-- SAUDIA ACADEMY — CO-OP / TRAINING PLATFORM
-- Full schema, built from scratch (consolidated version)
-- Run this once on a fresh Supabase project (SQL Editor).
-- =====================================================================
-- =====================================================================
-- 0. EXTENSIONS
-- =====================================================================
create extension if not exists "pgcrypto";

-- gen_random_uuid()
-- =====================================================================
-- 1. ENUM TYPES
-- =====================================================================
create type user_role as enum('student', 'admin');

create type application_status as enum(
  'pending',
  'under_review',
  'interview',
  'accepted',
  'rejected'
);

create type doc_type as enum(
  'cv',
  'academic_transcript',
  'certificates',
  'recommendation_letter'
);

create type analysis_status as enum('pending', 'processing', 'completed', 'failed');

-- =====================================================================
-- 2. PROFILES  (extends Supabase Auth users -> auth.users)
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'student',
  full_name text,
  email text,
  phone text, -- format: 966XXXXXXXXX (12 digits)
  gender text check (gender in ('Male', 'Female')),
  dob date,
  nationality text,
  language text default 'english' check (language in ('english', 'arabic')),
  national_id text,
  city text,
  other_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.handle_new_user ();

-- =====================================================================
-- 3. SUPERVISORS  (assign-supervisor.html)
-- =====================================================================
create table public.supervisors (
  id uuid primary key default gen_random_uuid (),
  full_name text not null,
  email text not null,
  phone text,
  department text,
  office_location text,
  availability text,
  created_at timestamptz not null default now(),
  constraint supervisors_email_unique unique (email)
);

-- =====================================================================
-- 4. PROGRAM REQUIREMENTS  (add-program-requirement.html / admin-jobs.html)
-- =====================================================================
-- Created before `applications` because applications references it.
create table public.program_requirements (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  openings int not null check (openings between 1 and 999),
  training_season text not null check (
    training_season in ('Spring', 'Summer', 'Fall', 'Winter')
  ),
  training_year int not null check (
    training_year >= 2024
    and training_year <= 2100
  ),
  skills text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.program_requirements
add column training_term text generated always as (training_season || ' ' || training_year) stored;

-- =====================================================================
-- 5. TRAINING PLANS  (training-plans.html + your-plan.html)
-- =====================================================================
create table public.training_plans (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  department text,
  major text,
  training_term text,
  total_hours numeric,
  pdf_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.training_plan_weeks (
  id uuid primary key default gen_random_uuid (),
  training_plan_id uuid not null references public.training_plans (id) on delete cascade,
  week_number int not null,
  description text not null,
  start_date date not null,
  hours numeric not null default 25,
  unique (training_plan_id, week_number)
);

-- =====================================================================
-- 6. APPLICATIONS  (application.html -> academic.html -> documents.html
--    -> review.html)
-- =====================================================================
create table public.applications (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- which opportunity the student is applying to (chosen at application time)
  -- nullable: allows "Other" when the desired program isn't in the current list
  program_requirement_id uuid references public.program_requirements (id),
  -- Step 1: Personal Info (application.html)
  first_name text not null,
  last_name text not null,
  national_id text not null, -- exactly 10 digits
  mobile text not null, -- 966XXXXXXXXX
  dob date not null,
  gender text not null check (gender in ('Male', 'Female')),
  city text not null,
  other_city text,
  email text not null,
  -- Step 2: Academic Info (academic.html)
  university text not null,
  other_university text,
  major text not null,
  student_level text not null check (
    student_level in ('3rd Year', '4th Year', '5th Year', 'Graduate')
  ),
  gpa numeric(4, 2) not null,
  gpa_scale text not null check (gpa_scale in ('Out of 4', 'Out of 5')),
  expected_graduation date not null,
  training_start date not null,
  training_end date not null,
  -- Workflow
  status application_status not null default 'pending',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_end_after_start check (training_end > training_start),
  constraint gpa_within_scale check (
    (
      gpa_scale = 'Out of 4'
      and gpa <= 4
    )
    or (
      gpa_scale = 'Out of 5'
      and gpa <= 5
    )
  ),
  -- one application per national ID per program/opportunity (allows
  -- re-applying to a different program or a later term instead of
  -- blocking the person forever, like a plain `unique` on national_id would)
  unique (national_id, program_requirement_id)
);

create index applications_student_id_idx on public.applications (student_id);

create index applications_status_idx on public.applications (status);

create index applications_program_requirement_id_idx on public.applications (program_requirement_id);

-- =====================================================================
-- 7. APPLICATION DOCUMENTS  (documents.html)
-- =====================================================================
create table public.application_documents (
  id uuid primary key default gen_random_uuid (),
  application_id uuid not null references public.applications (id) on delete cascade,
  doc_type doc_type not null,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now(),
  unique (application_id, doc_type)
);

-- =====================================================================
-- 8. APPLICATION <-> SUPERVISOR/PLAN ASSIGNMENT
-- =====================================================================
create table public.application_assignments (
  id uuid primary key default gen_random_uuid (),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  supervisor_id uuid references public.supervisors (id),
  training_plan_id uuid references public.training_plans (id),
  training_term text,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now()
);

-- =====================================================================
-- 9. AI SKILL ANALYSIS  (matches the applicant's skills against the
--    program's required skills — runs once when the CV is uploaded)
-- =====================================================================
create table public.ai_skill_analysis (
  id uuid primary key default gen_random_uuid (),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  program_requirement_id uuid references public.program_requirements (id),
  extracted_skills text[] not null default '{}',
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  match_score numeric(5, 2) check (match_score between 0 and 100),
  status analysis_status not null default 'pending',
  raw_ai_response jsonb,
  error_message text,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_skill_analysis_application_id_idx on public.ai_skill_analysis (application_id);

-- =====================================================================
-- 10. NOTIFICATIONS
-- =====================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 11. UPDATED_AT TRIGGERS
-- =====================================================================
create or replace function public.set_updated_at () returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before
update on public.profiles for each row
execute procedure public.set_updated_at ();

create trigger set_updated_at before
update on public.applications for each row
execute procedure public.set_updated_at ();

create trigger set_updated_at before
update on public.program_requirements for each row
execute procedure public.set_updated_at ();

create trigger set_updated_at before
update on public.ai_skill_analysis for each row
execute procedure public.set_updated_at ();

-- =====================================================================
-- 12. HELPER FUNCTION — is the current logged-in user an admin?
-- =====================================================================
create or replace function public.is_admin () returns boolean language sql stable security definer
set
  search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =====================================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- =====================================================================
alter table public.profiles enable row level security;

alter table public.applications enable row level security;

alter table public.application_documents enable row level security;

alter table public.program_requirements enable row level security;

alter table public.supervisors enable row level security;

alter table public.training_plans enable row level security;

alter table public.training_plan_weeks enable row level security;

alter table public.application_assignments enable row level security;

alter table public.ai_skill_analysis enable row level security;

-- ---- profiles ----
create policy "profiles: read own or admin" on public.profiles for
select
  using (
    id = auth.uid ()
    or public.is_admin ()
  );

create policy "profiles: update own or admin" on public.profiles
for update
  using (
    id = auth.uid ()
    or public.is_admin ()
  );

-- ---- applications ----
create policy "applications: student reads own, admin reads all" on public.applications for
select
  using (
    student_id = auth.uid ()
    or public.is_admin ()
  );

create policy "applications: student inserts own" on public.applications for insert
with
  check (student_id = auth.uid ());

create policy "applications: student updates own while pending, admin updates any" on public.applications
for update
  using (
    (
      student_id = auth.uid ()
      and status = 'pending'
    )
    or public.is_admin ()
  );

-- ---- application_documents ----
create policy "documents: owner or admin can read" on public.application_documents for
select
  using (
    public.is_admin ()
    or exists (
      select
        1
      from
        public.applications a
      where
        a.id = application_id
        and a.student_id = auth.uid ()
    )
  );

create policy "documents: owner can upload to own application" on public.application_documents for insert
with
  check (
    exists (
      select
        1
      from
        public.applications a
      where
        a.id = application_id
        and a.student_id = auth.uid ()
    )
  );

create policy "documents: owner can delete/replace own, admin any" on public.application_documents for delete using (
  public.is_admin ()
  or exists (
    select
      1
    from
      public.applications a
    where
      a.id = application_id
      and a.student_id = auth.uid ()
  )
);

-- ---- program_requirements (admin manages, everyone logged-in can view) ----
create policy "program_requirements: any logged-in user can read" on public.program_requirements for
select
  using (auth.uid () is not null);

create policy "program_requirements: admin can insert/update/delete" on public.program_requirements for all using (public.is_admin ())
with
  check (public.is_admin ());

-- ---- supervisors ----
create policy "supervisors: admin manages" on public.supervisors for all using (public.is_admin ())
with
  check (public.is_admin ());

-- allow a student to read only the supervisor assigned to their own application
create policy "supervisors: student can read own assigned supervisor" on public.supervisors for
select
  using (
    exists (
      select
        1
      from
        public.application_assignments aa
        join public.applications a on a.id = aa.application_id
      where
        aa.supervisor_id = supervisors.id
        and a.student_id = auth.uid ()
    )
  );

-- ---- training_plans / training_plan_weeks ----
create policy "training_plans: any logged-in user can read" on public.training_plans for
select
  using (auth.uid () is not null);

create policy "training_plans: admin manages" on public.training_plans for insert
with
  check (public.is_admin ());

create policy "training_plans: admin updates/deletes" on public.training_plans
for update
  using (public.is_admin ());

create policy "training_plans: admin deletes" on public.training_plans for delete using (public.is_admin ());

create policy "training_plan_weeks: any logged-in user can read" on public.training_plan_weeks for
select
  using (auth.uid () is not null);

create policy "training_plan_weeks: admin manages" on public.training_plan_weeks for all using (public.is_admin ())
with
  check (public.is_admin ());

-- ---- application_assignments ----
create policy "assignments: student reads own, admin reads all" on public.application_assignments for
select
  using (
    public.is_admin ()
    or exists (
      select
        1
      from
        public.applications a
      where
        a.id = application_id
        and a.student_id = auth.uid ()
    )
  );

create policy "assignments: admin manages" on public.application_assignments for all using (public.is_admin ())
with
  check (public.is_admin ());

-- ---- ai_skill_analysis (read-only for student/admin, writes come only
--      from a trusted Edge Function using the service_role key, which
--      bypasses RLS — so no insert/update policy is defined here) ----
create policy "ai_skill_analysis: student reads own, admin reads all" on public.ai_skill_analysis for
select
  using (
    public.is_admin ()
    or exists (
      select
        1
      from
        public.applications a
      where
        a.id = application_id
        and a.student_id = auth.uid ()
    )
  );

-- =====================================================================
-- 14. STORAGE BUCKETS
-- =====================================================================
insert into
  storage.buckets (id, name, public)
values
  (
    'application-documents',
    'application-documents',
    false
  )
on conflict (id) do nothing;

insert into
  storage.buckets (id, name, public)
values
  ('training-plans', 'training-plans', false)
on conflict (id) do nothing;

-- ---- application-documents: final path, e.g. "<application_id>/cv.pdf" ----
create policy "app docs: owner can upload to own application" on storage.objects for insert
with
  check (
    bucket_id = 'application-documents'
    and exists (
      select
        1
      from
        public.applications a
      where
        a.student_id = auth.uid ()
        and (storage.foldername (name)) [1] = a.id::text
    )
  );

create policy "app docs: owner or admin can read own application" on storage.objects for
select
  using (
    bucket_id = 'application-documents'
    and (
      public.is_admin ()
      or exists (
        select
          1
        from
          public.applications a
        where
          a.student_id = auth.uid ()
          and (storage.foldername (name)) [1] = a.id::text
      )
    )
  );

-- ---- application-documents: TEMP path, e.g. "temp/<user_id>/cv.pdf" ----
-- Used during the wizard (documents.html), before the `applications`
-- row exists yet. Files here get moved to their final path once the
-- student submits the application on review.html.
create policy "app docs: owner can upload to own temp folder" on storage.objects for insert
with
  check (
    bucket_id = 'application-documents'
    and (storage.foldername (name)) [1] = 'temp'
    and (storage.foldername (name)) [2] = auth.uid ()::text
  );

create policy "app docs: owner can read/replace own temp folder" on storage.objects for
select
  using (
    bucket_id = 'application-documents'
    and (storage.foldername (name)) [1] = 'temp'
    and (storage.foldername (name)) [2] = auth.uid ()::text
  );

create policy "app docs: owner can delete own temp folder" on storage.objects for delete using (
  bucket_id = 'application-documents'
  and (storage.foldername (name)) [1] = 'temp'
  and (storage.foldername (name)) [2] = auth.uid ()::text
);

-- ---- training-plans ----
create policy "training plan pdfs: any logged-in user can read" on storage.objects for
select
  using (
    bucket_id = 'training-plans'
    and auth.uid () is not null
  );

create policy "training plan pdfs: admin can upload" on storage.objects for insert
with
  check (
    bucket_id = 'training-plans'
    and public.is_admin ()
  );

-- =====================================================================
-- DONE. Next step: create your first admin manually after signing up
-- normally through Login.html, by running in the SQL Editor:
--
--   update public.profiles set role = 'admin' where email = 'your-email@example.com';
--
-- Then add at least one program so students have something to apply to:
--
--   insert into public.program_requirements
--     (title, openings, training_season, training_year, skills)
--   values
--     ('Software Engineering Co-op', 5, 'Summer', 2026, '{"Python","SQL"}');
-- =====================================================================
