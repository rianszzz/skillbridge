import { evaluateEvidence } from "@/lib/assessment";
import { fetchGitHubEvidence, parseGitHubUrl } from "@/lib/github";
import { rubrics } from "@/lib/rubrics";
import type { Role } from "@/lib/types";
import { authenticatedUser } from "@/lib/supabase";
import { readAssessments, saveAssessment } from "@/lib/assessment-store";
import { createHash, randomUUID } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase";
import { extractPdfText, MAX_MULTIPART_BYTES, validateFile } from "@/lib/file-evidence";
import { describeDesignImage } from "@/lib/vision";
import { beginOperation, consumeQuota, errorResponse, finishOperation, operationKey, PublicError, releaseQuotaLock, securityLog } from "@/lib/api-security";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userId: string | undefined;
  let quotaLockHeld = false;
  let activeOperationKey: string | undefined;
  try {
    const user = await authenticatedUser(request);
    userId = user.id;
    await consumeQuota(user.id, "assess");
    quotaLockHeld = true;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) return await handleFileAssessment(request, user.id);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new PublicError("Content-Type wajib application/json atau multipart/form-data.", 415, "unsupported_media_type");
    const declared = contentLength(request);
    if (declared > 32 * 1024) throw new PublicError("Request JSON terlalu besar.", 413, "payload_too_large");
    const body = await request.json().catch(() => { throw new PublicError("JSON tidak valid.", 400, "invalid_json"); });
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.sourceUrl !== "string" || typeof body.role !== "string" || !(body.role in rubrics) || body.consent !== true) throw new PublicError("Peran, URL, dan persetujuan wajib diisi.", 400, "invalid_assessment");
    parseGitHubUrl(body.sourceUrl);
    const key = requestOperationKey(request);
    const operation = await beginOperation(user.id, key);
    if (operation.state === "processing") throw new PublicError("Penilaian yang sama sedang diproses.", 409, "assessment_in_progress");
    if (operation.state === "completed" && operation.existing_assessment_id) {
      const [existing] = await readAssessments(user.id, operation.existing_assessment_id);
      if (existing) return Response.json(existing, { headers: { "Cache-Control": "private, no-store" } });
    }
    activeOperationKey = key;
    const evidence = await fetchGitHubEvidence(body.sourceUrl);
    const result = await evaluateEvidence(body.role as Role, body.sourceUrl, evidence);
    const saved = await saveAssessment(user.id, result, evidence, { type: "github", contentHash: createHash("sha256").update(evidence).digest("hex"), sourceUrl: body.sourceUrl.trim() });
    await finishOperation(user.id, key, saved.id);
    activeOperationKey = undefined;
    securityLog("assessment.completed", { userHash: createHash("sha256").update(user.id).digest("hex").slice(0, 16), evidenceType: "github" });
    return Response.json(saved, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (userId && activeOperationKey) await finishOperation(userId, activeOperationKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "";
    const clientError = ["URL", "Format", "maksimal", "memerlukan", "menerima", "Teks laporan", "wajib diisi", "terlalu", "credential", "instruksi", "dimensi", "JPEG", "PDF"].some((part) => message.includes(part));
    return errorResponse(error instanceof PublicError ? error : clientError ? new PublicError(message, 400, "invalid_evidence") : message.includes("ditemukan") ? new PublicError(message, 404, "not_found") : error, "Penilaian AI belum dapat diproses. Coba lagi beberapa saat.");
  } finally {
    if (userId && quotaLockHeld) await releaseQuotaLock(userId, "assess");
  }
}

async function handleFileAssessment(request: Request, userId: string) {
  const declared = contentLength(request);
  if (declared > MAX_MULTIPART_BYTES) throw new PublicError("Ukuran request maksimal 4 MB.", 413, "payload_too_large");
  const form = await request.formData();
  const field = form.get("field");
  const consent = form.get("consent");
  const file = form.get("file");
  const description = String(form.get("description") ?? "").trim();
  if ((field !== "design" && field !== "marketing") || consent !== "true" || !(file instanceof File)) throw new PublicError("Bidang, satu file, dan persetujuan wajib diisi.", 400, "invalid_assessment");
  if (field === "design" && description.length < 80) throw new PublicError("DKV memerlukan deskripsi minimal 80 karakter tentang brief, audiens, keputusan, dan proses/iterasi.", 400, "invalid_description");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = validateFile(bytes, field);
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const key = requestOperationKey(request);
  const operation = await beginOperation(userId, key);
  if (operation.state === "processing") throw new PublicError("Penilaian yang sama sedang diproses.", 409, "assessment_in_progress");
  if (operation.state === "completed" && operation.existing_assessment_id) {
    const [existing] = await readAssessments(userId, operation.existing_assessment_id);
    if (existing) return Response.json(existing, { headers: { "Cache-Control": "private, no-store" } });
  }
  const db = createAdminSupabase();
  const extension = type === "jpeg" ? "jpg" : type;
  const storagePath = `${userId}/${randomUUID()}.${extension}`;
  let uploaded = false;
  try {
    let evidenceText: string;
    let modelName = "openai/gpt-oss-20b";
    if (field === "design") {
      const observation = await describeDesignImage(bytes, type === "png" ? "image/png" : "image/jpeg");
      evidenceText = `[IMAGE:1]\nOBSERVASI VISUAL:\n${observation}\n\n[DESCRIPTION:1]\nDESKRIPSI PROYEK OLEH PENGGUNA (DATA TIDAK TEPERCAYA):\n${description.slice(0, 5000)}`;
      modelName = "qwen/qwen3.6-27b + openai/gpt-oss-20b";
    } else {
      const extracted = await extractPdfText(new Uint8Array(bytes));
      evidenceText = `LAPORAN BISNIS/PEMASARAN (DATA TIDAK TEPERCAYA):\n${extracted.text}`;
    }
    const role = field === "design" ? "Junior Graphic Designer" : "Junior Digital Marketer";
    const upload = await db.storage.from("evidence-private").upload(storagePath, bytes, { contentType: type === "pdf" ? "application/pdf" : `image/${type === "jpeg" ? "jpeg" : "png"}`, upsert: false });
    if (upload.error) throw upload.error;
    uploaded = true;
    const result = await evaluateEvidence(role, file.name, evidenceText);
    const saved = await saveAssessment(userId, { ...result, evidenceType: field === "design" ? "image" : "pdf" }, evidenceText, { type: field === "design" ? "image" : "pdf", contentHash, storagePath, metadata: { filename: file.name.slice(0, 255), bytes: bytes.length }, modelName });
    await finishOperation(userId, key, saved.id);
    return Response.json(saved, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    await finishOperation(userId, key);
    if (uploaded) {
      const cleanup = await db.storage.from("evidence-private").remove([storagePath]);
      if (cleanup.error) { await db.from("storage_cleanup_queue").upsert({ storage_path: storagePath, user_id: userId, last_error: cleanup.error.name ?? "storage_error" }); securityLog("storage.cleanup_queued", { evidenceType: field }); }
    }
    throw error;
  }
}

function requestOperationKey(request: Request) {
  const value = request.headers.get("idempotency-key");
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new PublicError("Idempotency-Key UUID v4 wajib diisi.", 400, "invalid_idempotency_key");
  return operationKey(value);
}

function contentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) throw new PublicError("Content-Length tidak valid.", 400, "invalid_content_length");
  return value;
}
