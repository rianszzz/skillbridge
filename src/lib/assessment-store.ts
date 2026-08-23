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
  const evidence = await db.from("evidence").insert({ user_id: userId, evidence_type: evidenceType, source_url: evidenceType === "github" ? stored?.sourceUrl ?? result.sourceUrl : null, storage_path: evidenceType === "github" ? null : stored?.storagePath, content_hash: stored?.contentHash ?? sha256(evidenceText), status: "ready", ai_consent_at: new Date().toISOString(), extraction_metadata: { characters: evidenceText.length, ...stored?.metadata } }).select("id").single();
  if (evidence.error) throw evidence.error;
  try {
    const assessment = await db.from("assessments").insert({ evidence_id: evidence.data.id, rubric_id: rubric.data.id, status: "completed", evidence_sufficiency: result.evidence_sufficiency, final_score: result.finalScore, model_name: stored?.modelName ?? "openai/gpt-oss-20b", prompt_version: "1.0", rubric_version: "1.0", input_hash: sha256(evidenceText), strengths: result.strengths, gaps: result.gaps, limitations: result.limitations }).select("id,created_at").single();
    if (assessment.error) throw assessment.error;
    const scores = await db.from("criterion_scores").insert(result.criteria.map((item) => ({ assessment_id: assessment.data.id, criterion_id: item.criterion_id, criterion_weight: rubrics[result.role].find(({ id }) => id === item.criterion_id)!.weight, evidence_sufficiency: item.evidence_sufficiency, score: item.score, confidence: item.confidence, reason: item.reason, evidence_refs: item.evidence_refs })));
    if (scores.error) throw scores.error;
    return { ...result, id: assessment.data.id, createdAt: assessment.data.created_at };
  } catch (error) {
    if (stored?.storagePath) await db.storage.from("evidence-private").remove([stored.storagePath]);
    await db.from("evidence").delete().eq("id", evidence.data.id).eq("user_id", userId);
    throw error;
  }
}

export async function readAssessments(userId: string, id?: string) {
  const db = createAdminSupabase();
  const evidenceQuery = db.from("evidence").select("id,source_url,storage_path,evidence_type,extraction_metadata").eq("user_id", userId);
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
  const assessments = await readAssessments(userId, assessmentId);
  if (!assessments.length) return false;
  const assessment = await db.from("assessments").select("evidence_id,evidence(storage_path)").eq("id", assessmentId).single();
  if (assessment.error) throw assessment.error;
  const related = assessment.data.evidence as unknown as { storage_path: string | null };
  if (related?.storage_path) { const removed = await db.storage.from("evidence-private").remove([related.storage_path]); if (removed.error) throw removed.error; }
  const deleted = await db.from("evidence").delete().eq("id", assessment.data.evidence_id).eq("user_id", userId);
  if (deleted.error) throw deleted.error;
  return true;
}

function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
