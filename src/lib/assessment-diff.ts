import type { AssessmentResult } from "./types";

export type CriterionDiff = {
  criterionId: string;
  previousScore: number | null | undefined;
  currentScore: number | null;
  diff: number | null;
  status: "improved" | "regressed" | "unchanged" | "newly_assessed" | "unassessed";
};

export function findPreviousAssessment(current: AssessmentResult, all: AssessmentResult[]) {
  const sameRoleAndVersion = all.filter(
    (item) => item.id !== current.id && item.role === current.role && item.rubric_version === current.rubric_version && new Date(item.createdAt) < new Date(current.createdAt)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const previousDiffVersion = !sameRoleAndVersion.length
    ? all.find((item) => item.id !== current.id && item.role === current.role && item.rubric_version !== current.rubric_version && new Date(item.createdAt) < new Date(current.createdAt))
    : undefined;

  return { previous: sameRoleAndVersion[0] ?? null, previousDiffVersion: previousDiffVersion ?? null };
}

export function calculateAssessmentDiff(current: AssessmentResult, previous: AssessmentResult | null) {
  if (!previous) return { finalDiff: null, criteriaDiffs: {} as Record<string, CriterionDiff> };
  const finalDiff = current.finalScore !== null && previous.finalScore !== null ? current.finalScore - previous.finalScore : null;
  const criteriaDiffs: Record<string, CriterionDiff> = {};
  for (const item of current.criteria) {
    const prevItem = previous.criteria.find((c) => c.criterion_id === item.criterion_id);
    const prevScore = prevItem?.score;
    const currScore = item.score;
    let diff: number | null = null;
    let status: CriterionDiff["status"] = "unassessed";

    if (currScore !== null && typeof prevScore === "number") {
      diff = currScore - prevScore;
      status = diff > 0 ? "improved" : diff < 0 ? "regressed" : "unchanged";
    } else if (currScore !== null && (prevScore === null || prevScore === undefined)) {
      status = "newly_assessed";
    }
    criteriaDiffs[item.criterion_id] = { criterionId: item.criterion_id, previousScore: prevScore, currentScore: currScore, diff, status };
  }
  return { finalDiff, criteriaDiffs };
}
