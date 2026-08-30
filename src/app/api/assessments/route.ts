import { authenticatedUser } from "@/lib/supabase";
import { deleteAssessment, readAssessments } from "@/lib/assessment-store";
import { assertUuid, errorResponse, hashLogValue, privateResponse, PublicError, securityLog } from "@/lib/api-security";

export async function GET(request: Request) {
  try { const user = await authenticatedUser(request); const id = new URL(request.url).searchParams.get("id") ?? undefined; if (id) assertUuid(id); return Response.json(await readAssessments(user.id, id), privateResponse()); }
  catch (error) { return errorResponse(error, "Riwayat gagal dibaca."); }
}

export async function DELETE(request: Request) {
  try { const user = await authenticatedUser(request); const id = new URL(request.url).searchParams.get("id"); if (!id) throw new PublicError("ID wajib diisi.", 400, "missing_id"); assertUuid(id); const deleted = await deleteAssessment(user.id, id); if (!deleted) throw new PublicError("Hasil tidak ditemukan.", 404, "not_found"); securityLog("assessment.deleted", { userHash: hashLogValue(user.id) }); return new Response(null, privateResponse(204)); }
  catch (error) { return errorResponse(error, "Hasil gagal dihapus."); }
}
