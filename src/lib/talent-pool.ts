import { isTableMissing } from "./supabase.ts";
import { roleFields } from "./rubrics.ts";
import { DEMO_SEEDS } from "./demo-seed.ts";
import { getJobApplicationsForRecruiter, getJobPostingById } from "./jobs.ts";
import type { Role, TalentCandidate, TalentPoolFilters } from "./types.ts";

export { isTableMissing };
export type { TalentCandidate, TalentPoolFilters };

const DEMO_METADATA: Record<string, { candidateName: string; email: string }> = {
  "00000000-0000-4000-8000-000000000001": {
    candidateName: "Rizky Pratama (INF-01)",
    email: "rizky.pratama@demo.skillbridge.id",
  },
  "00000000-0000-4000-8000-000000000002": {
    candidateName: "Ahmad Fauzi (INF-02)",
    email: "ahmad.fauzi@demo.skillbridge.id",
  },
  "00000000-0000-4000-8000-000000000022": {
    candidateName: "Siti Rahma (DKV-02)",
    email: "siti.rahma@demo.skillbridge.id",
  },
  "00000000-0000-4000-8000-000000000032": {
    candidateName: "Budi Santoso (MKT-02)",
    email: "budi.santoso@demo.skillbridge.id",
  },
};

export function getDemoTalentCandidates(): TalentCandidate[] {
  return DEMO_SEEDS
    .filter((seed) => seed.finalScore !== null && seed.evidence_sufficiency === "sufficient")
    .map((seed) => {
      const meta = DEMO_METADATA[seed.id] ?? {
        candidateName: `Kandidat Demo (${seed.role})`,
        email: `kandidat.${seed.id.slice(-4)}@demo.skillbridge.id`,
      };
      const field = roleFields[seed.role as Role] || "informatics";
      return {
        id: seed.id,
        assessmentId: seed.id,
        candidateName: meta.candidateName,
        email: meta.email,
        role: seed.role,
        field,
        finalScore: seed.finalScore as number,
        evidenceType: seed.evidenceType ?? "github",
        strengths: seed.strengths ?? [],
        gaps: seed.gaps ?? [],
        createdAt: seed.createdAt,
        sourceUrl: seed.sourceUrl,
        isDemo: true,
      };
    });
}

export function filterAndSortCandidates(
  candidates: TalentCandidate[],
  filters?: TalentPoolFilters,
): TalentCandidate[] {
  let result = [...candidates];

  if (filters?.field && filters.field !== "all") {
    const targetField = filters.field.toLowerCase();
    result = result.filter((c) => c.field.toLowerCase() === targetField);
  }

  if (typeof filters?.minScore === "number" && !Number.isNaN(filters.minScore)) {
    result = result.filter((c) => c.finalScore >= filters.minScore!);
  }

  result.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return result;
}

export async function getTalentPool(
  recruiterIdOrFilters?: string | TalentPoolFilters,
  filters?: TalentPoolFilters,
): Promise<TalentCandidate[]> {
  let recruiterId = "recruiter-demo-id";
  let effectiveFilters: TalentPoolFilters | undefined = filters;

  if (typeof recruiterIdOrFilters === "string") {
    recruiterId = recruiterIdOrFilters;
  } else if (typeof recruiterIdOrFilters === "object" && recruiterIdOrFilters !== null) {
    effectiveFilters = recruiterIdOrFilters;
  }

  const applications = await getJobApplicationsForRecruiter(
    recruiterId,
    effectiveFilters?.jobId === "all" ? undefined : effectiveFilters?.jobId,
  );

  const candidates: TalentCandidate[] = (
    await Promise.all(
      applications.map(async (app): Promise<TalentCandidate | null> => {
        const job = await getJobPostingById(app.jobId, { recruiterId });
        if (!job) return null;
        const finalScore = app.fitEvaluation?.score ?? app.skillbridgeScore ?? 50;
        return {
          id: app.id,
          assessmentId: app.assessmentId ?? app.id,
          candidateName: app.candidateName,
          email: app.candidateEmail,
          phone: app.phone,
          location: app.location,
          resumeFileName: app.resumeFileName,
          resumeUrl: app.resumeUrl,
          coverLetterMode: app.coverLetterMode,
          coverLetterFileName: app.coverLetterFileName,
          role: app.jobTitle ?? job.targetRole ?? "Pelamar",
          field: job.field ?? "informatics",
          finalScore,
          fitEvaluation: app.fitEvaluation ?? null,
          jobId: app.jobId,
          jobTitle: app.jobTitle ?? job.title,
          companyName: app.companyName ?? job.companyName,
          status: app.status,
          coverLetter: app.coverLetter,
          sourceUrl: app.portfolioUrl,
          evidenceType: (job.acceptedEvidenceTypes?.[0] ?? "github") as "github" | "image" | "pdf",
          strengths: app.fitEvaluation?.matchingCriteria ?? [],
          gaps: app.fitEvaluation?.missingCriteria ?? [],
          createdAt: app.appliedAt,
          isDemo: Boolean(app.isDemo),
        };
      }),
    )
  ).filter((c): c is TalentCandidate => c !== null && Boolean(c.jobTitle));

  let result = candidates;

  if (typeof effectiveFilters?.minScore === "number" && !Number.isNaN(effectiveFilters.minScore)) {
    result = result.filter((c) => c.finalScore >= effectiveFilters!.minScore!);
  }

  if (effectiveFilters?.field && effectiveFilters.field !== "all") {
    const targetField = effectiveFilters.field.toLowerCase();
    result = result.filter((c) => c.field.toLowerCase() === targetField);
  }

  result.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return result;
}

