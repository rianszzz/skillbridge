import { createAdminSupabase, isTableMissing } from "./supabase.ts";
import { roleFields } from "./rubrics.ts";
import { DEMO_SEEDS } from "./demo-seed.ts";
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

export async function getTalentPool(filters?: TalentPoolFilters): Promise<TalentCandidate[]> {
  const demoCandidates = getDemoTalentCandidates();
  let dbCandidates: TalentCandidate[] = [];

  try {
    const db = createAdminSupabase();
    // 1. Fetch public sufficient assessments
    const { data: assessments, error } = await db
      .from("assessments")
      .select(`
        id,
        evidence_id,
        evidence_sufficiency,
        final_score,
        rubric_version,
        strengths,
        gaps,
        created_at,
        is_public_talent,
        rubrics (
          target_role,
          career_field
        ),
        evidence (
          user_id,
          evidence_type,
          source_url,
          extraction_metadata
        )
      `)
      .eq("evidence_sufficiency", "sufficient")
      .not("final_score", "is", null)
      .order("final_score", { ascending: false });

    if (error) {
      if (!isTableMissing(error)) {
        // Retry without is_public_talent in case column is not yet migrated
        const fallback = await db
          .from("assessments")
          .select(`
            id,
            evidence_id,
            evidence_sufficiency,
            final_score,
            rubric_version,
            strengths,
            gaps,
            created_at,
            rubrics (
              target_role,
              career_field
            ),
            evidence (
              user_id,
              evidence_type,
              source_url,
              extraction_metadata
            )
          `)
          .eq("evidence_sufficiency", "sufficient")
          .not("final_score", "is", null)
          .order("final_score", { ascending: false });

        if (!fallback.error && fallback.data) {
          dbCandidates = await mapDbRows(db, fallback.data);
        }
      }
    } else if (assessments) {
      const publicRows = assessments.filter(
        (item: { is_public_talent?: boolean }) => item.is_public_talent !== false,
      );
      dbCandidates = await mapDbRows(db, publicRows);
    }
  } catch {
    // Graceful fallback: when DB is unavailable or unconfigured, rely on demo seeds
  }

  // Merge DB candidates and Demo Seeds without duplicate assessment IDs
  const seenIds = new Set<string>();
  const merged: TalentCandidate[] = [];

  for (const c of dbCandidates) {
    if (!seenIds.has(c.assessmentId)) {
      seenIds.add(c.assessmentId);
      merged.push(c);
    }
  }

  for (const seed of demoCandidates) {
    if (!seenIds.has(seed.assessmentId)) {
      seenIds.add(seed.assessmentId);
      merged.push(seed);
    }
  }

  return filterAndSortCandidates(merged, filters);
}

type AssessmentDbRow = {
  id: string;
  final_score: number | string | null;
  strengths: unknown;
  gaps: unknown;
  created_at: string;
  rubrics?: unknown;
  evidence?: unknown;
};

async function mapDbRows(
  db: ReturnType<typeof createAdminSupabase>,
  rows: AssessmentDbRow[],
): Promise<TalentCandidate[]> {
  if (!rows || rows.length === 0) return [];

  const userIds = Array.from(
    new Set(
      rows
        .map((r) => (r.evidence as { user_id?: string } | undefined)?.user_id)
        .filter((uid): uid is string => Boolean(uid)),
    ),
  );

  const profileMap = new Map<string, { full_name?: string; email?: string }>();
  if (userIds.length > 0) {
    try {
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap.set(p.user_id, {
            full_name: (p as { full_name?: string }).full_name,
            email: (p as { email?: string }).email,
          });
        }
      }
    } catch {
      // Profiles query failure is non-fatal
    }
  }

  return rows.map((item) => {
    const evidence = (item.evidence as {
      user_id?: string;
      evidence_type?: string;
      source_url?: string;
      extraction_metadata?: { filename?: string };
    }) ?? {};
    const rubric = (item.rubrics as { target_role?: Role; career_field?: string }) ?? {};
    const profile = evidence.user_id ? profileMap.get(evidence.user_id) : undefined;
    const shortId = item.id.slice(0, 6).toUpperCase();

    const candidateName = profile?.full_name || `Kandidat #${shortId}`;
    const email = profile?.email || `kandidat.${item.id.slice(0, 8)}@skillbridge.id`;
    const role = rubric.target_role ?? "Junior Web Developer";
    const field = rubric.career_field ?? roleFields[role as Role] ?? "informatics";
    const sourceUrl =
      evidence.source_url ??
      String(evidence.extraction_metadata?.filename ?? "Bukti Unggahan");

    return {
      id: item.id,
      assessmentId: item.id,
      candidateName,
      email,
      role,
      field,
      finalScore: Number(item.final_score),
      evidenceType: evidence.evidence_type ?? "github",
      strengths: Array.isArray(item.strengths) ? (item.strengths as string[]) : [],
      gaps: Array.isArray(item.gaps) ? (item.gaps as string[]) : [],
      createdAt: item.created_at,
      sourceUrl,
      isDemo: false,
    };
  });
}
