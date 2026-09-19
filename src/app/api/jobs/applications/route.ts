import { authenticatedUser } from "@/lib/supabase";
import {
  getJobApplicationsForCandidate,
  getJobApplicationsForRecruiter,
  updateApplicationStatus,
} from "@/lib/jobs";
import type { ApplicationStatus } from "@/lib/types";
import {
  assertJsonRequest,
  errorResponse,
  privateResponse,
  PublicError,
} from "@/lib/api-security";

export async function GET(request: Request) {
  try {
    const user = await authenticatedUser(request);
    const role = user.user_metadata?.role || user.user_metadata?.account_role;
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId") || undefined;

    if (role === "recruiter") {
      const applications = await getJobApplicationsForRecruiter(user.id, jobId);
      return Response.json(applications, privateResponse());
    }

    const applications = await getJobApplicationsForCandidate(user.id);
    return Response.json(applications, privateResponse());
  } catch (error) {
    return errorResponse(error, "Gagal memuat daftar lamaran.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticatedUser(request);
    const role = user.user_metadata?.role || user.user_metadata?.account_role;

    if (role !== "recruiter") {
      throw new PublicError(
        "Hanya akun HR / Rekruter yang dapat mengelola status pelamar.",
        403,
        "forbidden",
      );
    }

    assertJsonRequest(request);
    const body = (await request.json()) as {
      applicationId?: string;
      status?: ApplicationStatus;
    };

    if (!body.applicationId || typeof body.applicationId !== "string") {
      throw new PublicError("ID lamaran wajib diisi.", 400, "missing_application_id");
    }

    if (!body.status || typeof body.status !== "string") {
      throw new PublicError("Status lamaran wajib diisi.", 400, "missing_status");
    }

    try {
      const updated = await updateApplicationStatus(
        user.id,
        body.applicationId,
        body.status,
      );

      return Response.json(updated, privateResponse());
    } catch (updateErr) {
      if (
        updateErr instanceof Error &&
        (updateErr.message.includes("tidak memiliki akses") ||
          updateErr.message.includes("tidak ditemukan"))
      ) {
        throw new PublicError(updateErr.message, 403, "forbidden");
      }
      if (updateErr instanceof Error && updateErr.message.includes("tidak valid")) {
        throw new PublicError(updateErr.message, 400, "invalid_status");
      }
      throw updateErr;
    }
  } catch (error) {
    return errorResponse(error, "Gagal memperbarui status lamaran.");
  }
}

