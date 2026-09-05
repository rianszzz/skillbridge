-- Interview persistence: sessions and messages
-- Apply after 004. Run manually in Supabase Dashboard → SQL Editor.

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed')),
  focus_areas jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id)
);

create table if not exists public.interview_messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_messages_interview on public.interview_messages(interview_id);

alter table public.interviews enable row level security;
alter table public.interview_messages enable row level security;

-- Service-role only; no direct user access
revoke all on public.interviews, public.interview_messages from anon, authenticated;
