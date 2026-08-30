import { createHash, randomUUID } from "node:crypto";
import { createAdminSupabase, AuthError } from "./supabase.ts";

export class PublicError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  constructor(message: string, status: number, code: string, retryAfter?: number) { super(message); this.status = status; this.code = code; this.retryAfter = retryAfter; }
}

export function privateResponse(status = 200, retryAfter?: number) {
  return { status, headers: { "Cache-Control": "private, no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } };
}

export function errorResponse(error: unknown, fallback: string) {
  const publicError = error instanceof PublicError ? error : error instanceof AuthError ? new PublicError(error.message, 401, "unauthorized") : null;
  const status = publicError?.status ?? 500;
  const requestId = randomUUID();
  securityLog("api.error", { requestId, status, code: publicError?.code ?? "internal_error", errorClass: error instanceof Error ? error.name : "unknown" });
  return Response.json({ error: publicError?.message ?? fallback, code: publicError?.code ?? "internal_error", requestId }, privateResponse(status, publicError?.retryAfter));
}

export async function consumeQuota(userId: string, action: "assess" | "interview") {
  const config = action === "assess" ? { limit: 10, window: 86_400, lock: 120 } : { limit: 30, window: 3_600, lock: 0 };
  const { data, error } = await createAdminSupabase().rpc("consume_api_quota", { p_user_id: userId, p_action: action, p_limit: config.limit, p_window_seconds: config.window, p_lock_seconds: config.lock }).single();
  if (error) throw error;
  const result = data as { allowed: boolean; retry_after: number };
  if (!result.allowed) throw new PublicError("Batas penggunaan tercapai. Coba lagi setelah waktu tunggu.", 429, "rate_limit_exceeded", result.retry_after);
}

export async function releaseQuotaLock(userId: string, action: "assess") {
  const { error } = await createAdminSupabase().rpc("release_api_lock", { p_user_id: userId, p_action: action });
  if (error) securityLog("quota.release_failed", { userHash: hashLogValue(userId), action, errorClass: error.code ?? "database_error" });
}

export async function beginOperation(userId: string, key: string) {
  const { data, error } = await createAdminSupabase().rpc("begin_assessment_operation", { p_user_id: userId, p_operation_key: key }).single();
  if (error) throw error;
  return data as { state: "started" | "processing" | "completed"; existing_assessment_id: string | null };
}

export async function finishOperation(userId: string, key: string, assessmentId?: string) {
  const { error } = await createAdminSupabase().rpc("finish_assessment_operation", { p_user_id: userId, p_operation_key: key, p_assessment_id: assessmentId ?? null, p_success: Boolean(assessmentId) });
  if (error) throw error;
}

export function operationKey(...parts: (string | Uint8Array)[]) {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part).update("\0");
  return hash.digest("hex");
}

export function assertUuid(value: string, name = "ID") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new PublicError(`${name} tidak valid.`, 400, "invalid_id");
}

export function assertJsonRequest(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new PublicError("Content-Type wajib application/json.", 415, "unsupported_media_type");
}

export function securityLog(event: string, details: Record<string, string | number | boolean | null>) {
  console.info(JSON.stringify({ event, at: new Date().toISOString(), ...details }));
}

export function hashLogValue(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 16); }
