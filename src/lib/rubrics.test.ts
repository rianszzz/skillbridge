import assert from "node:assert/strict";
import test from "node:test";
import { calculateFinalScore, rubrics } from "./rubrics.ts";

test("semua bobot rubrik berjumlah satu", () => {
  for (const rubric of Object.values(rubrics)) {
    assert.equal(rubric.reduce((sum, item) => sum + item.weight, 0), 1);
    assert.equal(new Set(rubric.map(({ id }) => id)).size, 4);
    for (const criterion of rubric) {
      assert.ok(criterion.acceptedEvidence);
      assert.deepEqual(Object.keys(criterion.anchors), ["0", "25", "50", "75", "100"]);
    }
  }
});

test("skor berbobot dihitung server dan bukti kurang menghasilkan null", () => {
  const rubric = rubrics["Junior Web Developer"];
  assert.equal(calculateFinalScore(rubric.map((item) => ({ criterion_id: item.id, score: 75 })), rubric), 75);
  assert.equal(calculateFinalScore(rubric.map((item, index) => ({ criterion_id: item.id, score: index ? 75 : null })), rubric), null);
});
