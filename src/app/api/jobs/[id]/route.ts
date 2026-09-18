import { getJobPostingById } from "@/lib/jobs";
import { errorResponse, privateResponse, PublicError } from "@/lib/api-security";

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
