import { authenticatedUser } from "@/lib/supabase";
import {
  getJobPostings,
  createJobPosting,
  validateJobPostingInput,
  type CreateJobInput,
} from "@/lib/jobs";
import type {
  Field,
  MinEducation,
  EmploymentType,
  CompensationType,
  WorkplaceType,
} from "@/lib/types";
import {
  errorResponse,
  privateResponse,
  PublicError,
  assertJsonRequest,
} from "@/lib/api-security";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fieldParam = url.searchParams.get("field");
    const minEducationParam = url.searchParams.get("minEducation");
    const employmentTypeParam = url.searchParams.get("employmentType");
    const compensationTypeParam = url.searchParams.get("compensationType");
    const workplaceTypeParam = url.searchParams.get("workplaceType");
    const searchParam = url.searchParams.get("search") || url.searchParams.get("q");
    const minScoreParam = url.searchParams.get("minScore");
    const candidateScoreParam = url.searchParams.get("candidateScore");

    let minScore: number | undefined;
    if (minScoreParam !== null && minScoreParam !== "") {
      const parsed = Number(minScoreParam);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        minScore = parsed;
      }
    }

    let candidateScore: number | undefined;
    if (candidateScoreParam !== null && candidateScoreParam !== "") {
      const parsed = Number(candidateScoreParam);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        candidateScore = parsed;
      }
    }

    const jobs = await getJobPostings({
      field: fieldParam ? (fieldParam as Field | "all") : undefined,
      minEducation: minEducationParam ? (minEducationParam as MinEducation | "all") : undefined,
      employmentType: employmentTypeParam ? (employmentTypeParam as EmploymentType | "all") : undefined,
      compensationType: compensationTypeParam ? (compensationTypeParam as CompensationType | "all") : undefined,
      workplaceType: workplaceTypeParam ? (workplaceTypeParam as WorkplaceType | "all") : undefined,
      searchQuery: searchParam ? searchParam.trim() : undefined,
      minScore,
      candidateScore,
    });

    return Response.json(jobs, privateResponse());
  } catch (error) {
    return errorResponse(error, "Daftar lowongan gagal dimuat.");
  }
}

export async function POST(request: Request) {
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

    assertJsonRequest(request);
    const body = (await request.json()) as CreateJobInput & { companyName?: string };
    const companyName =
      body.companyName?.trim() ||
      user.user_metadata?.company_name ||
      user.user_metadata?.company ||
      "Perusahaan Mitra";

    try {
      validateJobPostingInput(user.id, companyName, body);
    } catch (valErr) {
      if (valErr instanceof Error) {
        throw new PublicError(valErr.message, 400, "invalid_input");
      }
      throw valErr;
    }

    const job = await createJobPosting(user.id, companyName, body);
    return Response.json(job, privateResponse(201));
  } catch (error) {
    return errorResponse(error, "Gagal membuat lowongan baru.");
  }
}
