-- Migration 007: Job Postings & Candidate Applications
-- Apply after 006. Run manually in Supabase Dashboard → SQL Editor.

-- 1. Table for Job Postings (Lowongan Pekerjaan)
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references public.profiles(user_id) on delete set null,
  company_name text not null,
  company_logo text,
  title text not null,
  field text not null check (field in ('informatics', 'design', 'marketing')),
  target_role text not null,
  employment_type text not null check (employment_type in ('fulltime', 'internship', 'contract', 'parttime')),
  workplace_type text not null check (workplace_type in ('onsite', 'hybrid', 'remote')),
  location text not null,
  min_education text not null check (min_education in ('smk', 'diploma', 'bachelor', 'any')),
  experience_level text not null check (experience_level in ('fresh_graduate', 'under_1_year', '1_to_2_years')),
  compensation_type text not null default 'paid' check (compensation_type in ('paid', 'unpaid')),
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  show_salary boolean not null default true,
  benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(benefits) = 'array'),
  highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array'),
  description text not null default '',
  responsibilities jsonb not null default '[]'::jsonb check (jsonb_typeof(responsibilities) = 'array'),
  required_skills jsonb not null default '[]'::jsonb check (jsonb_typeof(required_skills) = 'array'),
  accepted_evidence_types jsonb not null default '["github","image","pdf"]'::jsonb check (jsonb_typeof(accepted_evidence_types) = 'array'),
  min_skillbridge_score numeric(5,2) not null default 0 check (min_skillbridge_score between 0 and 100),
  status text not null default 'active' check (status in ('active', 'closed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Table for Job Applications (Lamaran Pekerjaan)
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings(id) on delete cascade,
  candidate_id uuid not null references public.profiles(user_id) on delete cascade,
  candidate_name text not null,
  candidate_email text not null,
  assessment_id uuid references public.assessments(id) on delete set null,
  skillbridge_score numeric(5,2) check (skillbridge_score between 0 and 100),
  portfolio_url text,
  cover_letter text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'shortlisted', 'rejected', 'accepted')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

-- 3. Indexes for fast search & filtering
create index if not exists idx_job_postings_field_status on public.job_postings(field, status);
create index if not exists idx_job_postings_recruiter on public.job_postings(recruiter_id);
create index if not exists idx_job_postings_employment_type on public.job_postings(employment_type);
create index if not exists idx_job_postings_min_education on public.job_postings(min_education);
create index if not exists idx_job_postings_created_at on public.job_postings(created_at desc);

create index if not exists idx_job_applications_job_id on public.job_applications(job_id);
create index if not exists idx_job_applications_candidate_id on public.job_applications(candidate_id);
create index if not exists idx_job_applications_status on public.job_applications(status);
create index if not exists idx_job_applications_created_at on public.job_applications(created_at desc);

-- 4. Row Level Security (RLS)
alter table public.job_postings enable row level security;
alter table public.job_applications enable row level security;

-- Job Postings RLS Policies
-- Publik dan kandidat dapat melihat lowongan yang aktif
create policy job_postings_read_active on public.job_postings
  for select to anon, authenticated
  using (status = 'active');

-- Perekrut dapat melihat seluruh lowongan miliknya sendiri (aktif maupun ditutup)
create policy job_postings_read_own on public.job_postings
  for select to authenticated
  using (recruiter_id = (select auth.uid()));

-- Perekrut dapat membuat lowongan baru
create policy job_postings_insert_recruiter on public.job_postings
  for insert to authenticated
  with check (
    recruiter_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.account_role = 'recruiter'
    )
  );

-- Perekrut dapat memperbarui lowongan miliknya sendiri
create policy job_postings_update_recruiter on public.job_postings
  for update to authenticated
  using (recruiter_id = (select auth.uid()))
  with check (recruiter_id = (select auth.uid()));

-- Perekrut dapat menghapus lowongan miliknya sendiri
create policy job_postings_delete_recruiter on public.job_postings
  for delete to authenticated
  using (recruiter_id = (select auth.uid()));

-- Job Applications RLS Policies
-- Kandidat dapat mengirim lamaran
create policy job_applications_insert_candidate on public.job_applications
  for insert to authenticated
  with check (candidate_id = (select auth.uid()));

-- Kandidat dapat melihat riwayat lamarannya sendiri
create policy job_applications_read_candidate on public.job_applications
  for select to authenticated
  using (candidate_id = (select auth.uid()));

-- Perekrut dapat melihat lamaran masuk pada lowongan miliknya
create policy job_applications_read_recruiter on public.job_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.job_postings jp
      where jp.id = public.job_applications.job_id
        and jp.recruiter_id = (select auth.uid())
    )
  );

-- Perekrut dapat mengubah status lamaran pada lowongan miliknya (shortlist/reject/review)
create policy job_applications_update_recruiter on public.job_applications
  for update to authenticated
  using (
    exists (
      select 1 from public.job_postings jp
      where jp.id = public.job_applications.job_id
        and jp.recruiter_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.job_postings jp
      where jp.id = public.job_applications.job_id
        and jp.recruiter_id = (select auth.uid())
    )
  );
