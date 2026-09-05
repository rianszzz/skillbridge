import assert from "node:assert/strict";
import test from "node:test";
import { calculateAssessmentDiff, findPreviousAssessment } from "./assessment-diff.ts";
import type { AssessmentResult } from "./types.ts";

function fakeAssessment(partial: Partial<AssessmentResult>): AssessmentResult {
  return {
    id: partial.id ?? "a1",
    createdAt: partial.createdAt ?? "2026-09-05T10:00:00Z",
    role: partial.role ?? "Junior Web Developer",
    sourceUrl: "https://github.com/test/repo",
    rubric_version: partial.rubric_version ?? "1.1",
    evidence_sufficiency: partial.evidence_sufficiency ?? "sufficient",
    finalScore: partial.finalScore ?? 75,
    strengths: [],
    gaps: [],
    limitations: [],
    criteria: partial.criteria ?? [
      { criterion_id: "web_code_quality", evidence_sufficiency: "sufficient", score: 75, confidence: "high", reason: "", evidence_refs: [] },
      { criterion_id: "web_project_structure", evidence_sufficiency: "sufficient", score: 50, confidence: "high", reason: "", evidence_refs: [] },
    ],
  };
}

test("findPreviousAssessment memilih penilaian terdekat dengan peran dan versi sama", () => {
  const current = fakeAssessment({ id: "cur", createdAt: "2026-09-05T12:00:00Z" });
  const olderSame = fakeAssessment({ id: "old1", createdAt: "2026-09-05T10:00:00Z" });
  const oldestSame = fakeAssessment({ id: "old0", createdAt: "2026-09-04T10:00:00Z" });
  const differentRole = fakeAssessment({ id: "diff_role", role: "Junior Graphic Designer", createdAt: "2026-09-05T11:00:00Z" });

  const { previous, previousDiffVersion } = findPreviousAssessment(current, [current, olderSame, oldestSame, differentRole]);
  assert.equal(previous?.id, "old1");
  assert.equal(previousDiffVersion, null);
});

test("findPreviousAssessment memberi peringatan jika versi rubrik berbeda", () => {
  const current = fakeAssessment({ id: "cur", rubric_version: "1.1", createdAt: "2026-09-05T12:00:00Z" });
  const olderDiffVer = fakeAssessment({ id: "old_v1", rubric_version: "1.0", createdAt: "2026-09-05T10:00:00Z" });

  const { previous, previousDiffVersion } = findPreviousAssessment(current, [current, olderDiffVer]);
  assert.equal(previous, null);
  assert.equal(previousDiffVersion?.id, "old_v1");
});

test("calculateAssessmentDiff menghitung delta kriteria dan status perubahan", () => {
  const prev = fakeAssessment({
    finalScore: 50,
    criteria: [
      { criterion_id: "web_code_quality", evidence_sufficiency: "sufficient", score: 50, confidence: "high", reason: "", evidence_refs: [] },
      { criterion_id: "web_project_structure", evidence_sufficiency: "insufficient_evidence", score: null, confidence: "low", reason: "", evidence_refs: [] },
      { criterion_id: "web_documentation", evidence_sufficiency: "sufficient", score: 75, confidence: "high", reason: "", evidence_refs: [] },
    ],
  });
  const current = fakeAssessment({
    finalScore: 75,
    criteria: [
      { criterion_id: "web_code_quality", evidence_sufficiency: "sufficient", score: 75, confidence: "high", reason: "", evidence_refs: [] },
      { criterion_id: "web_project_structure", evidence_sufficiency: "sufficient", score: 50, confidence: "medium", reason: "", evidence_refs: [] },
      { criterion_id: "web_documentation", evidence_sufficiency: "sufficient", score: 50, confidence: "high", reason: "", evidence_refs: [] },
    ],
  });

  const { finalDiff, criteriaDiffs } = calculateAssessmentDiff(current, prev);
  assert.equal(finalDiff, 25);
  assert.equal(criteriaDiffs.web_code_quality.diff, 25);
  assert.equal(criteriaDiffs.web_code_quality.status, "improved");
  assert.equal(criteriaDiffs.web_project_structure.status, "newly_assessed");
  assert.equal(criteriaDiffs.web_documentation.diff, -25);
  assert.equal(criteriaDiffs.web_documentation.status, "regressed");
});
