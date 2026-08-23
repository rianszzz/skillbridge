import { evaluateEvidence } from "@/lib/assessment";
import { fetchGitHubEvidence, parseGitHubUrl } from "@/lib/github";
import { rubrics } from "@/lib/rubrics";
import type { Role } from "@/lib/types";
import { authenticatedUser, AuthError } from "@/lib/supabase";
import { saveAssessment } from "@/lib/assessment-store";
import { createHash, randomUUID } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase";
import { extractPdfText, validateFile } from "@/lib/file-evidence";
import { describeDesignImage } from "@/lib/vision";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request);
    if (request.headers.get("content-type")?.includes("multipart/form-data")) return await handleFileAssessment(request, user.id);
    const body = await request.json();
    if (typeof body.sourceUrl !== "string" || typeof body.role !== "string" || !(body.role in rubrics) || body.consent !== true) return Response.json({ error: "Peran, URL, dan persetujuan wajib diisi." }, { status: 400 });
    parseGitHubUrl(body.sourceUrl);
    const evidence = await fetchGitHubEvidence(body.sourceUrl);
    const result = await evaluateEvidence(body.role as Role, body.sourceUrl, evidence);
    return Response.json(await saveAssessment(user.id, result, evidence));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Penilaian belum dapat diproses.";
    const clientError = ["URL", "persetujuan", "Format", "maksimal", "memerlukan", "menerima", "Teks laporan", "wajib diisi"].some((part) => message.includes(part));
    const status = error instanceof AuthError ? 401 : clientError ? 400 : message.includes("ditemukan") ? 404 : 502;
    return Response.json({ error: message }, { status });
  }
}

async function handleFileAssessment(request: Request, userId: string) {
  const form = await request.formData();
  const field = form.get("field");
  const consent = form.get("consent");
  const file = form.get("file");
  const description = String(form.get("description") ?? "").trim();
  if ((field !== "design" && field !== "marketing") || consent !== "true" || !(file instanceof File)) return Response.json({ error: "Bidang, satu file, dan persetujuan wajib diisi." }, { status: 400 });
  if (field === "design" && description.length < 80) return Response.json({ error: "DKV memerlukan deskripsi minimal 80 karakter tentang brief, audiens, keputusan, dan proses/iterasi." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = validateFile(bytes, field);
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
  const db = createAdminSupabase();
  const bucket = await db.storage.getBucket("evidence-private");
  if (bucket.error) { const created = await db.storage.createBucket("evidence-private", { public: false, fileSizeLimit: 4 * 1024 * 1024, allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"] }); if (created.error) throw created.error; }
  const extension = type === "jpeg" ? "jpg" : type;
  const storagePath = `${userId}/${randomUUID()}.${extension}`;
  const upload = await db.storage.from("evidence-private").upload(storagePath, bytes, { contentType: type === "pdf" ? "application/pdf" : `image/${type === "jpeg" ? "jpeg" : "png"}`, upsert: false });
  if (upload.error) throw upload.error;
  try {
    const result = await evaluateEvidence(role, file.name, evidenceText);
    const saved = await saveAssessment(userId, { ...result, evidenceType: field === "design" ? "image" : "pdf" }, evidenceText, { type: field === "design" ? "image" : "pdf", contentHash: createHash("sha256").update(bytes).digest("hex"), storagePath, metadata: { filename: file.name, bytes: bytes.length }, modelName });
    return Response.json(saved);
  } catch (error) {
    await db.storage.from("evidence-private").remove([storagePath]);
    throw error;
  }
}
