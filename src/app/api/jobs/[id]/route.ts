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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      throw new PublicError("ID lowongan wajib diisi.", 400, "missing_id");
    }

    const job = await getJobPostingById(id);
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

    await deleteJobPosting(user.id, id);
    return Response.json({ success: true }, privateResponse());
  } catch (error) {
    return errorResponse(error, "Gagal menghapus lowongan.");
  }
}
