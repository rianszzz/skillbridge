create table if not exists public.api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('assess', 'interview')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  active_until timestamptz,
  primary key (user_id, action)
);

create table if not exists public.assessment_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_key text not null check (operation_key ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('processing', 'completed', 'failed')),
  assessment_id uuid references public.assessments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, operation_key)
);

create table if not exists public.storage_cleanup_queue (
  storage_path text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_error text
);

alter table public.api_usage enable row level security;
alter table public.assessment_operations enable row level security;
alter table public.storage_cleanup_queue enable row level security;

revoke all on public.api_usage, public.assessment_operations, public.storage_cleanup_queue from anon, authenticated;

create or replace function public.consume_api_quota(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer,
  p_lock_seconds integer default 0
) returns table(allowed boolean, retry_after integer)
language plpgsql security definer set search_path = public
as $$
declare
  current_row public.api_usage%rowtype;
  now_at timestamptz := clock_timestamp();
begin
  if p_action not in ('assess', 'interview') or p_limit < 1 or p_window_seconds < 1 or p_lock_seconds < 0 then
    raise exception 'invalid quota configuration';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_action, 0));
  select * into current_row from public.api_usage where user_id = p_user_id and action = p_action for update;
  if not found or current_row.window_started_at <= now_at - make_interval(secs => p_window_seconds) then
    insert into public.api_usage(user_id, action, window_started_at, request_count, active_until)
    values (p_user_id, p_action, now_at, 1, case when p_lock_seconds > 0 then now_at + make_interval(secs => p_lock_seconds) end)
    on conflict (user_id, action) do update set window_started_at = excluded.window_started_at, request_count = 1, active_until = excluded.active_until;
    return query select true, 0;
  elsif current_row.request_count >= p_limit or (p_lock_seconds > 0 and current_row.active_until > now_at) then
    return query select false, greatest(1, ceil(extract(epoch from greatest(
      case when current_row.request_count >= p_limit then current_row.window_started_at + make_interval(secs => p_window_seconds) else '-infinity'::timestamptz end,
      case when p_lock_seconds > 0 then coalesce(current_row.active_until, '-infinity'::timestamptz) else '-infinity'::timestamptz end
    ) - now_at))::integer);
  else
    update public.api_usage set request_count = request_count + 1, active_until = case when p_lock_seconds > 0 then now_at + make_interval(secs => p_lock_seconds) else active_until end where user_id = p_user_id and action = p_action;
    return query select true, 0;
  end if;
end;
$$;

create or replace function public.release_api_lock(p_user_id uuid, p_action text) returns void
language sql security definer set search_path = public
as $$ update public.api_usage set active_until = null where user_id = p_user_id and action = p_action $$;

create or replace function public.begin_assessment_operation(p_user_id uuid, p_operation_key text)
returns table(state text, existing_assessment_id uuid)
language plpgsql security definer set search_path = public
as $$
declare current_row public.assessment_operations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_operation_key, 0));
  select * into current_row from public.assessment_operations where user_id = p_user_id and operation_key = p_operation_key for update;
  if found and current_row.status = 'completed' then return query select 'completed'::text, current_row.assessment_id; return; end if;
  if found and current_row.status = 'processing' and current_row.updated_at > now() - interval '2 minutes' then return query select 'processing'::text, null::uuid; return; end if;
  insert into public.assessment_operations(user_id, operation_key, status) values (p_user_id, p_operation_key, 'processing')
  on conflict (user_id, operation_key) do update set status = 'processing', assessment_id = null, updated_at = now();
  return query select 'started'::text, null::uuid;
end;
$$;

create or replace function public.finish_assessment_operation(p_user_id uuid, p_operation_key text, p_assessment_id uuid, p_success boolean) returns void
language sql security definer set search_path = public
as $$ update public.assessment_operations set status = case when p_success then 'completed' else 'failed' end, assessment_id = case when p_success then p_assessment_id else null end, updated_at = now() where user_id = p_user_id and operation_key = p_operation_key $$;

revoke all on function public.consume_api_quota(uuid,text,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.release_api_lock(uuid,text) from public, anon, authenticated;
revoke all on function public.begin_assessment_operation(uuid,text) from public, anon, authenticated;
revoke all on function public.finish_assessment_operation(uuid,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.consume_api_quota(uuid,text,integer,integer,integer) to service_role;
grant execute on function public.release_api_lock(uuid,text) to service_role;
grant execute on function public.begin_assessment_operation(uuid,text) to service_role;
grant execute on function public.finish_assessment_operation(uuid,text,uuid,boolean) to service_role;

create or replace function public.save_assessment_atomic(
  p_user_id uuid,
  p_evidence_type text,
  p_source_url text,
  p_storage_path text,
  p_content_hash text,
  p_metadata jsonb,
  p_rubric_id uuid,
  p_sufficiency text,
  p_final_score numeric,
  p_model_name text,
  p_input_hash text,
  p_strengths jsonb,
  p_gaps jsonb,
  p_limitations jsonb,
  p_scores jsonb
) returns table(assessment_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare evidence_id uuid; result_id uuid; result_created_at timestamptz;
begin
  insert into public.evidence(user_id, evidence_type, source_url, storage_path, content_hash, status, ai_consent_at, extraction_metadata)
  values (p_user_id, p_evidence_type, p_source_url, p_storage_path, p_content_hash, 'ready', now(), coalesce(p_metadata, '{}'::jsonb))
  returning id into evidence_id;

  insert into public.assessments(evidence_id, rubric_id, status, evidence_sufficiency, final_score, model_name, prompt_version, rubric_version, input_hash, strengths, gaps, limitations)
  values (evidence_id, p_rubric_id, 'completed', p_sufficiency, p_final_score, p_model_name, '1.0', '1.0', p_input_hash, p_strengths, p_gaps, p_limitations)
  returning id, public.assessments.created_at into result_id, result_created_at;

  insert into public.criterion_scores(assessment_id, criterion_id, criterion_weight, evidence_sufficiency, score, confidence, reason, evidence_refs)
  select result_id, score.criterion_id, score.criterion_weight, score.evidence_sufficiency, score.score, score.confidence, score.reason, score.evidence_refs
  from jsonb_to_recordset(p_scores) as score(criterion_id text, criterion_weight numeric, evidence_sufficiency text, score numeric, confidence text, reason text, evidence_refs jsonb);

  return query select result_id, result_created_at;
end;
$$;

create or replace function public.begin_assessment_deletion(p_user_id uuid, p_assessment_id uuid)
returns table(evidence_id uuid, storage_path text)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  update public.evidence e set status = 'pending_deletion'
  from public.assessments a
  where a.id = p_assessment_id and a.evidence_id = e.id and e.user_id = p_user_id and e.status in ('ready', 'pending_deletion')
  returning e.id, e.storage_path;
end;
$$;

create or replace function public.finish_assessment_deletion(p_user_id uuid, p_evidence_id uuid) returns boolean
language plpgsql security definer set search_path = public
as $$
declare deleted_count integer;
begin
  delete from public.evidence where id = p_evidence_id and user_id = p_user_id and status = 'pending_deletion';
  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

create or replace function public.cancel_assessment_deletion(p_user_id uuid, p_evidence_id uuid) returns void
language sql security definer set search_path = public
as $$ update public.evidence set status = 'ready' where id = p_evidence_id and user_id = p_user_id and status = 'pending_deletion' $$;

revoke all on function public.save_assessment_atomic(uuid,text,text,text,text,jsonb,uuid,text,numeric,text,text,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.begin_assessment_deletion(uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_assessment_deletion(uuid,uuid) from public, anon, authenticated;
revoke all on function public.cancel_assessment_deletion(uuid,uuid) from public, anon, authenticated;
grant execute on function public.save_assessment_atomic(uuid,text,text,text,text,jsonb,uuid,text,numeric,text,text,jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.begin_assessment_deletion(uuid,uuid) to service_role;
grant execute on function public.finish_assessment_deletion(uuid,uuid) to service_role;
grant execute on function public.cancel_assessment_deletion(uuid,uuid) to service_role;
