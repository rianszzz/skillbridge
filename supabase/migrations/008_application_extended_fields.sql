-- Migration 008: Extended Candidate Fields (Phone, Location, Resume, Cover Letter, Fit Evaluation)
-- Apply after 007. Run manually in Supabase Dashboard → SQL Editor if tables exist.

alter table if exists public.job_applications
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists resume_file_name text,
  add column if not exists resume_url text,
  add column if not exists cover_letter_mode text default 'none',
  add column if not exists cover_letter_file_name text,
  add column if not exists fit_evaluation jsonb;

-- Ensure index on phone/location is not needed, but fast query on status & fit_evaluation is supported
create index if not exists idx_job_applications_fit_score on public.job_applications(skillbridge_score);
