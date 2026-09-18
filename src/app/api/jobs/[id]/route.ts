import { authenticatedUser } from "@/lib/supabase";
import {
  getJobPostingById,
  updateJobPosting,
  deleteJobPosting,
  validateJobPostingUpdateInput,
  type CreateJobInput,
} from "@/lib/jobs";
import {
  errorResponse,
  privateResponse,
  PublicError,
  assertJsonRequest,
} from "@/lib/api-security";

function parseDeletedJobsCookie(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const targetCookie = cookies.find((c) => c.startsWith("skillbridge_deleted_jobs="));
  if (!targetCookie) return [];
  const rawValue = targetCookie.substring("skillbridge_deleted_jobs=".length);
  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  } catch {
    // Abaikan jika cookie rusak
  }
  return [];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      throw new PublicError("ID lowongan wajib diisi.", 400, "missing_id");
    }

    const cookieHeader = request.headers.get("cookie");
    const deletedIds = parseDeletedJobsCookie(cookieHeader);

    const job = await getJobPostingById(id, { deletedIds });
    if (!job) {
      throw new PublicError("Lowongan tidak ditemukan.", 404, "not_found");
    }

    return Response.json(job, privateResponse());
  } catch (error) {
    return errorResponse(error, "Lowongan gagal dimuat.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    if (!id || typeof id !== "string") {
      throw new PublicError("ID lowongan wajib diisi.", 400, "missing_id");
    }

    assertJsonRequest(request);
    const body = (await request.json()) as Partial<CreateJobInput>;

    try {
      validateJobPostingUpdateInput(user.id, id, body);
    } catch (valErr) {
      if (valErr instanceof Error) {
        throw new PublicError(valErr.message, 400, "invalid_input");
      }
      throw valErr;
    }

    const updated = await updateJobPosting(user.id, id, body);
    return Response.json(updated, privateResponse());
  } catch (error) {
    return errorResponse(error, "Gagal memperbarui lowongan.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    if (!id || typeof id !== "string") {
      throw new PublicError("ID lowongan wajib diisi.", 400, "missing_id");
    }

    const cookieHeader = request.headers.get("cookie");
    const existingCookieIds = parseDeletedJobsCookie(cookieHeader);
    const updatedCookieIds = Array.from(new Set([...existingCookieIds, id]));

    await deleteJobPosting(user.id, id);

    const baseInit = privateResponse();
    const headers = new Headers(baseInit.headers);
    headers.append(
      "Set-Cookie",
      `skillbridge_deleted_jobs=${encodeURIComponent(JSON.stringify(updatedCookieIds))}; Path=/; SameSite=Lax; Max-Age=31536000`,
    );

    return Response.json({ success: true }, { status: baseInit.status, headers });
  } catch (error) {
    return errorResponse(error, "Gagal menghapus lowongan.");
  }
}
