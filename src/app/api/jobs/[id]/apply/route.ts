import { authenticatedUser } from "@/lib/supabase";
import {
  applyToJob,
  validateApplicationInput,
  type ApplyJobInput,
} from "@/lib/jobs";
import {
  errorResponse,
  privateResponse,
  PublicError,
  assertJsonRequest,
} from "@/lib/api-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await authenticatedUser(request);
    const { id } = await params;

    if (!id || typeof id !== "string") {
      throw new PublicError("ID lowongan wajib diisi.", 400, "missing_id");
    }

    assertJsonRequest(request);
    const body = (await request.json()) as Partial<ApplyJobInput>;

    const candidateName =
      body.candidateName?.trim() ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Kandidat";

    const candidateEmail = body.candidateEmail?.trim() || user.email || "";

    const applyData: ApplyJobInput = {
      jobId: id,
      candidateName,
      candidateEmail,
      phone: body.phone?.trim() || undefined,
      location: body.location?.trim() || undefined,
      photoUrl: body.photoUrl?.trim() || undefined,
      resumeFileName: body.resumeFileName?.trim() || undefined,
      resumeUrl: body.resumeUrl?.trim() || undefined,
      coverLetterMode: body.coverLetterMode || undefined,
      coverLetterFileName: body.coverLetterFileName?.trim() || undefined,
      assessmentId: body.assessmentId || null,
      skillbridgeScore:
        body.skillbridgeScore !== undefined && body.skillbridgeScore !== null
          ? Number(body.skillbridgeScore)
          : null,
      portfolioUrl: body.portfolioUrl?.trim() || undefined,
      portfolioItems: Array.isArray(body.portfolioItems) ? body.portfolioItems : undefined,
      coverLetter: body.coverLetter?.trim() || undefined,
    };

    try {
      validateApplicationInput(user.id, applyData);
    } catch (valErr) {
      if (valErr instanceof Error) {
        throw new PublicError(valErr.message, 400, "invalid_input");
      }
      throw valErr;
    }

    const application = await applyToJob(user.id, applyData);
    return Response.json(application, privateResponse(201));
  } catch (error) {
    return errorResponse(error, "Gagal mengajukan lamaran pekerjaan.");
  }
}
