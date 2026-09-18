import { authenticatedUser } from "@/lib/supabase";
import { getTalentPool } from "@/lib/talent-pool";
import { errorResponse, privateResponse, PublicError } from "@/lib/api-security";

export async function GET(request: Request) {
  try {
    const user = await authenticatedUser(request);
    const role = user.user_metadata?.role || user.user_metadata?.account_role;
    if (role !== "recruiter") {
      throw new PublicError(
        "Akses ditolak. Endpoint ini khusus untuk akun Perekrut / HR.",
        403,
        "forbidden",
      );
    }

    const url = new URL(request.url);
    const fieldParam = url.searchParams.get("field") ?? undefined;
    const minScoreParam = url.searchParams.get("minScore");

    let minScore: number | undefined;
    if (minScoreParam !== null && minScoreParam !== "") {
      const parsed = Number(minScoreParam);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        throw new PublicError("minScore harus bernilai angka antara 0 dan 100.", 400, "invalid_parameter");
      }
      minScore = parsed;
    }

    const field = fieldParam && fieldParam !== "all" ? fieldParam : undefined;
    const candidates = await getTalentPool({ field, minScore });

    return Response.json(candidates, privateResponse());
  } catch (error) {
    return errorResponse(error, "Talent pool gagal dimuat.");
  }
}
