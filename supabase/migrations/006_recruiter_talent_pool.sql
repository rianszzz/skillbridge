-- Migration 006: Recruiter role & Talent Pool
-- Apply after 005. Run manually in Supabase Dashboard → SQL Editor.

-- 1. Ensure columns for recruiter role and talent pool flag exist
alter table public.profiles
  add column if not exists account_role text not null default 'candidate'
  check (account_role in ('candidate', 'recruiter')),
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists company_name text;

-- Allow candidate-specific fields to be nullable for recruiter accounts
alter table public.profiles
  alter column education_status drop not null,
  alter column career_field drop not null,
  alter column target_role drop not null;

alter table public.assessments
  add column if not exists is_public_talent boolean not null default true;

-- 2. Indexes for efficient talent pool queries
create index if not exists idx_profiles_account_role on public.profiles(account_role);
create index if not exists idx_assessments_talent_pool on public.assessments(is_public_talent, evidence_sufficiency, final_score desc);

-- 3. RLS Policies for Recruiters to read talent pool

-- Recruiters can read public, sufficient assessments in talent pool
create policy assessments_read_recruiter on public.assessments
  for select to authenticated
  using (
    is_public_talent = true
    and evidence_sufficiency = 'sufficient'
    and exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.account_role = 'recruiter'
    )
  );

-- Recruiters can read evidence corresponding to talent pool assessments
create policy evidence_read_recruiter on public.evidence
  for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      join public.profiles p on p.user_id = (select auth.uid())
      where a.evidence_id = public.evidence.id
        and a.is_public_talent = true
        and a.evidence_sufficiency = 'sufficient'
        and p.account_role = 'recruiter'
    )
  );

-- Recruiters can read criterion scores corresponding to talent pool assessments
create policy scores_read_recruiter on public.criterion_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      join public.profiles p on p.user_id = (select auth.uid())
      where a.id = public.criterion_scores.assessment_id
        and a.is_public_talent = true
        and a.evidence_sufficiency = 'sufficient'
        and p.account_role = 'recruiter'
    )
  );

-- Recruiters can read profiles of public candidates
create policy profiles_read_recruiter on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.account_role = 'recruiter'
    )
  );
