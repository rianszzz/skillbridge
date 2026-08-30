import { createHash } from "node:crypto";
import { createAdminSupabase } from "./supabase";
import { roleFields, rubrics } from "./rubrics";
import type { AssessmentResult, Role } from "./types";

type StoredEvidence = { type: "github" | "image" | "pdf"; contentHash: string; sourceUrl?: string; storagePath?: string; metadata?: Record<string, unknown>; modelName?: string };

export async function saveAssessment(userId: string, result: AssessmentResult, evidenceText: string, stored?: StoredEvidence) {
  const db = createAdminSupabase();
  const field = roleFields[result.role];
  const profile = await db.from("profiles").upsert({ user_id: userId, education_status: "graduate", career_field: field, target_role: result.role });
  if (profile.error) throw profile.error;
  const rubric = await db.from("rubrics").upsert({ career_field: field, target_role: result.role, version: "1.0", criteria: rubrics[result.role], status: "published" }, { onConflict: "career_field,target_role,version" }).select("id").single();
  if (rubric.error) throw rubric.error;
  const evidenceType = stored?.type ?? "github";
  const scores = result.criteria.map((item) => ({ criterion_id: item.criterion_id, criterion_weight: rubrics[result.role].find(({ id }) => id === item.criterion_id)!.weight, evidence_sufficiency: item.evidence_sufficiency, score: item.score, confidence: item.confidence, reason: item.reason, evidence_refs: item.evidence_refs }));
  const saved = await db.rpc("save_assessment_atomic", { p_user_id: userId, p_evidence_type: evidenceType, p_source_url: evidenceType === "github" ? stored?.sourceUrl ?? result.sourceUrl : null, p_storage_path: evidenceType === "github" ? null : stored?.storagePath, p_content_hash: stored?.contentHash ?? sha256(evidenceText), p_metadata: { characters: evidenceText.length, ...stored?.metadata }, p_rubric_id: rubric.data.id, p_sufficiency: result.evidence_sufficiency, p_final_score: result.finalScore, p_model_name: stored?.modelName ?? "openai/gpt-oss-20b", p_input_hash: sha256(evidenceText), p_strengths: result.strengths, p_gaps: result.gaps, p_limitations: result.limitations, p_scores: scores }).single();
  if (saved.error) throw saved.error;
  const row = saved.data as { assessment_id: string; created_at: string };
  return { ...result, id: row.assessment_id, createdAt: row.created_at };
}

export async function readAssessments(userId: string, id?: string) {
  const db = createAdminSupabase();
  const evidenceQuery = db.from("evidence").select("id,source_url,storage_path,evidence_type,extraction_metadata").eq("user_id", userId).eq("status", "ready").order("created_at", { ascending: false }).limit(100);
  const evidence = await evidenceQuery;
  if (evidence.error) throw evidence.error;
  if (!evidence.data.length) return [];
  let query = db.from("assessments").select("id,evidence_id,evidence_sufficiency,final_score,rubric_version,strengths,gaps,limitations,created_at,rubrics(target_role)").in("evidence_id", evidence.data.map(({ id: evidenceId }) => evidenceId)).order("created_at", { ascending: false }).limit(20);
  if (id) query = query.eq("id", id);
  const assessments = await query;
  if (assessments.error) throw assessments.error;
  const ids = assessments.data.map(({ id: assessmentId }) => assessmentId);
  const scores = ids.length ? await db.from("criterion_scores").select("assessment_id,criterion_id,evidence_sufficiency,score,confidence,reason,evidence_refs").in("assessment_id", ids) : { data: [], error: null };
  if (scores.error) throw scores.error;
  return assessments.data.map((item) => {
    const evidenceItem = evidence.data.find(({ id: evidenceId }) => evidenceId === item.evidence_id)!;
    const rubric = item.rubrics as unknown as { target_role: Role };
    return { id: item.id, createdAt: item.created_at, role: rubric.target_role, sourceUrl: evidenceItem.source_url ?? String((evidenceItem.extraction_metadata as { filename?: string }).filename ?? "Bukti unggahan"), evidenceType: evidenceItem.evidence_type, rubric_version: item.rubric_version, evidence_sufficiency: item.evidence_sufficiency, finalScore: item.final_score === null ? null : Number(item.final_score), strengths: item.strengths, gaps: item.gaps, limitations: item.limitations, criteria: scores.data.filter((score) => score.assessment_id === item.id).map((score) => ({ criterion_id: score.criterion_id, evidence_sufficiency: score.evidence_sufficiency, score: score.score === null ? null : Number(score.score), confidence: score.confidence, reason: score.reason, evidence_refs: score.evidence_refs })) } as AssessmentResult;
  });
}

export async function deleteAssessment(userId: string, assessmentId: string) {
  const db = createAdminSupabase();
  const pending = await db.rpc("begin_assessment_deletion", { p_user_id: userId, p_assessment_id: assessmentId });
  if (pending.error) throw pending.error;
  const row = (pending.data as { evidence_id: string; storage_path: string | null }[])[0];
  if (!row) return false;
  if (row.storage_path) {
    const removed = await db.storage.from("evidence-private").remove([row.storage_path]);
    if (removed.error) { await db.rpc("cancel_assessment_deletion", { p_user_id: userId, p_evidence_id: row.evidence_id }); throw removed.error; }
  }
  const finished = await db.rpc("finish_assessment_deletion", { p_user_id: userId, p_evidence_id: row.evidence_id });
  if (finished.error) throw finished.error;
  return Boolean(finished.data);
}

function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
