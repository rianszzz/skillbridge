import { authenticatedUser, AuthError } from "@/lib/supabase";
import { deleteAssessment, readAssessments } from "@/lib/assessment-store";

export async function GET(request: Request) {
  try { const user = await authenticatedUser(request); const id = new URL(request.url).searchParams.get("id") ?? undefined; return Response.json(await readAssessments(user.id, id)); }
  catch (error) { return Response.json({ error: errorMessage(error, "Riwayat gagal dibaca.") }, { status: error instanceof AuthError ? 401 : 500 }); }
}

export async function DELETE(request: Request) {
  try { const user = await authenticatedUser(request); const id = new URL(request.url).searchParams.get("id"); if (!id) return Response.json({ error: "ID wajib diisi." }, { status: 400 }); const deleted = await deleteAssessment(user.id, id); return deleted ? new Response(null, { status: 204 }) : Response.json({ error: "Hasil tidak ditemukan." }, { status: 404 }); }
  catch (error) { return Response.json({ error: errorMessage(error, "Hasil gagal dihapus.") }, { status: error instanceof AuthError ? 401 : 500 }); }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}
