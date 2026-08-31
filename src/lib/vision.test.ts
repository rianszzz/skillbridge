import assert from "node:assert/strict";
import test from "node:test";
import { formatDesignObservation } from "./vision.ts";

test("observasi vision hanya menerima elemen terstruktur", () => {
  assert.match(formatDesignObservation({ observed_elements: [{ element: "Judul", finding: "Tebal", visual_location: "Atas", impact: "Dominan" }] }), /Judul \| Atas \| Tebal/);
  assert.throws(() => formatDesignObservation({ observed_elements: [] }), /tidak valid/);
});
