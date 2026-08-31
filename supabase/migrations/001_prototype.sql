create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  education_status text not null check (education_status in ('final_year_student', 'graduate')),
  career_field text not null check (career_field in ('informatics', 'design', 'marketing')),
  target_role text not null,
  created_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  evidence_type text not null check (evidence_type in ('pdf', 'image', 'github')),
  storage_path text,
  source_url text,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'ready' check (status in ('pending', 'extracting', 'ready', 'failed', 'pending_deletion')),
  ai_consent_at timestamptz not null,
  extraction_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((evidence_type = 'github' and source_url is not null and storage_path is null) or (evidence_type in ('pdf', 'image') and source_url is null and storage_path is not null))
);

create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  career_field text not null,
  target_role text not null,
  version text not null,
  criteria jsonb not null check (jsonb_typeof(criteria) = 'array'),
  status text not null default 'published' check (status in ('draft', 'published', 'retired')),
  unique (career_field, target_role, version)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  rubric_id uuid not null references public.rubrics(id) on delete restrict,
  status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
  evidence_sufficiency text check (evidence_sufficiency in ('sufficient', 'insufficient_evidence')),
  final_score numeric(5,2) check (final_score between 0 and 100),
  model_name text not null,
  prompt_version text not null,
  rubric_version text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  strengths jsonb not null default '[]',
  gaps jsonb not null default '[]',
  limitations jsonb not null default '[]',
  created_at timestamptz not null default now(),
  check (evidence_sufficiency <> 'insufficient_evidence' or final_score is null)
);

create table public.criterion_scores (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  criterion_id text not null,
  criterion_weight numeric(7,6) not null check (criterion_weight between 0 and 1),
  evidence_sufficiency text not null check (evidence_sufficiency in ('sufficient', 'insufficient_evidence')),
  score numeric(5,2) check (score between 0 and 100),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  reason text not null,
  evidence_refs jsonb not null default '[]',
  details jsonb not null default '{}'::jsonb,
  primary key (assessment_id, criterion_id),
  check ((evidence_sufficiency = 'sufficient' and score is not null) or (evidence_sufficiency = 'insufficient_evidence' and score is null))
);

create index evidence_user_idx on public.evidence(user_id);
create index assessments_evidence_idx on public.assessments(evidence_id);

alter table public.profiles enable row level security;
alter table public.evidence enable row level security;
alter table public.rubrics enable row level security;
alter table public.assessments enable row level security;
alter table public.criterion_scores enable row level security;

create policy profiles_own on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy evidence_read_own on public.evidence for select to authenticated using ((select auth.uid()) = user_id);
create policy rubrics_read on public.rubrics for select to authenticated using (status = 'published');
create policy assessments_read_own on public.assessments for select to authenticated using (exists (select 1 from public.evidence e where e.id = evidence_id and e.user_id = (select auth.uid())));
create policy scores_read_own on public.criterion_scores for select to authenticated using (exists (select 1 from public.assessments a join public.evidence e on e.id = a.evidence_id where a.id = assessment_id and e.user_id = (select auth.uid())));

-- Writes remain server-only through service role.
