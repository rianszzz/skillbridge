import assert from "node:assert/strict";
import test from "node:test";
import { rubrics } from "./rubrics.ts";
import { catalog, recommendResources } from "./learning-catalog.ts";

test("katalog mencakup semua kriteria rubrik dengan URL valid", () => {
  for (const rubric of Object.values(rubrics)) {
    for (const criterion of rubric) {
      const items = catalog[criterion.id];
      assert.ok(items && items.length >= 2, `Kriteria ${criterion.id} harus memiliki minimal 2 materi`);
      for (const item of items) {
        assert.ok(item.title.length > 0, "Judul materi tidak boleh kosong");
        assert.ok(item.url.startsWith("https://"), `URL ${item.url} harus https`);
      }
    }
  }
});

test("recommendResources mengembalikan rekomendasi sesuai gap", () => {
  const gaps = ["web_code_quality", "web_project_structure"];
  const recs = recommendResources(gaps, 2);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].criterionId, "web_code_quality");
  assert.equal(recs[1].criterionId, "web_project_structure");
});
