import { authenticatedUser } from "@/lib/supabase";
import {
  getJobApplicationsForCandidate,
  getJobApplicationsForRecruiter,
} from "@/lib/jobs";
import { errorResponse, privateResponse } from "@/lib/api-security";

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
