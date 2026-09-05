import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_SEEDS, getDemoSeed, isDemoSeedId } from "./demo-seed.ts";
import { rubrics, calculateFinalScore } from "./rubrics.ts";
import { calculateAssessmentDiff } from "./assessment-diff.ts";

test("semua demo seed mematuhi kontrak rubrik dan skor terhitung valid", () => {
  assert.equal(DEMO_SEEDS.length, 4);

  for (const seed of DEMO_SEEDS) {
    const roleRubric = rubrics[seed.role];
    assert.ok(roleRubric, `Rubrik untuk role ${seed.role} harus terdefinisi`);
    assert.equal(seed.criteria.length, roleRubric.length);

    for (const c of seed.criteria) {
      assert.ok(
        c.score === null || [0, 25, 50, 75, 100].includes(c.score),
        `Skor ${c.score} harus anchor atau null`,
      );
    }

    const calculated = calculateFinalScore(seed.criteria, roleRubric);
    assert.equal(seed.finalScore, calculated);
  }
});

test("isDemoSeedId dan getDemoSeed bekerja akurat", () => {
  assert.ok(isDemoSeedId("00000000-0000-4000-8000-000000000002"));
  assert.ok(!isDemoSeedId("non-existent-id"));

  const inf02 = getDemoSeed("00000000-0000-4000-8000-000000000002");
  assert.ok(inf02);
  assert.equal(inf02.role, "Junior Web Developer");
  assert.equal(inf02.finalScore, 50);
});

test("pair INF-01 dan INF-02 menghasilkan diff re-assessment yang valid", () => {
  const inf01 = getDemoSeed("00000000-0000-4000-8000-000000000001")!;
  const inf02 = getDemoSeed("00000000-0000-4000-8000-000000000002")!;

  const { finalDiff, criteriaDiffs } = calculateAssessmentDiff(inf02, inf01);
  assert.equal(finalDiff, null); // Previous had null (insufficient)
  const codeDiff = criteriaDiffs["web_code_quality"];
  assert.equal(codeDiff?.diff, 25); // 25 -> 50 (+25)
  assert.equal(codeDiff?.status, "improved");
  const docsDiff = criteriaDiffs["web_documentation"];
  assert.equal(docsDiff?.status, "newly_assessed"); // Previously null -> 50
});
