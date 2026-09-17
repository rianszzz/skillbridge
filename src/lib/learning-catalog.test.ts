import assert from "node:assert/strict";
import test from "node:test";
import { rubrics } from "./rubrics.ts";
import { catalog } from "./learning-catalog.ts";

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
