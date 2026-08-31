alter table public.criterion_scores add column if not exists details jsonb not null default '{}'::jsonb;

create or replace function public.save_assessment_atomic(
  p_user_id uuid, p_evidence_type text, p_source_url text, p_storage_path text, p_content_hash text,
  p_metadata jsonb, p_rubric_id uuid, p_sufficiency text, p_final_score numeric, p_model_name text,
  p_input_hash text, p_strengths jsonb, p_gaps jsonb, p_limitations jsonb, p_scores jsonb
) returns table(assessment_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare evidence_id uuid; result_id uuid; result_created_at timestamptz;
begin
  insert into public.evidence(user_id, evidence_type, source_url, storage_path, content_hash, status, ai_consent_at, extraction_metadata)
  values (p_user_id, p_evidence_type, p_source_url, p_storage_path, p_content_hash, 'ready', now(), coalesce(p_metadata, '{}'::jsonb)) returning id into evidence_id;
  insert into public.assessments(evidence_id, rubric_id, status, evidence_sufficiency, final_score, model_name, prompt_version, rubric_version, input_hash, strengths, gaps, limitations)
  values (evidence_id, p_rubric_id, 'completed', p_sufficiency, p_final_score, p_model_name, '1.1', '1.1', p_input_hash, p_strengths, p_gaps, p_limitations)
  returning id, public.assessments.created_at into result_id, result_created_at;
  insert into public.criterion_scores(assessment_id, criterion_id, criterion_weight, evidence_sufficiency, score, confidence, reason, evidence_refs, details)
  select result_id, item.criterion_id, item.criterion_weight, item.evidence_sufficiency, item.score, item.confidence, item.reason, item.evidence_refs, item.details
  from jsonb_to_recordset(p_scores) as item(criterion_id text, criterion_weight numeric, evidence_sufficiency text, score numeric, confidence text, reason text, evidence_refs jsonb, details jsonb);
  return query select result_id, result_created_at;
end;
$$;

revoke all on function public.save_assessment_atomic(uuid,text,text,text,text,jsonb,uuid,text,numeric,text,text,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_assessment_atomic(uuid,text,text,text,text,jsonb,uuid,text,numeric,text,text,jsonb,jsonb,jsonb,jsonb) to service_role;
