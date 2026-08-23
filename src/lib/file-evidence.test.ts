import assert from "node:assert/strict";
import test from "node:test";
import { detectFileType, validateFile } from "./file-evidence.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = new TextEncoder().encode("%PDF-1.4");

test("magic bytes menentukan tipe, bukan nama file", () => {
  assert.equal(detectFileType(png), "png");
  assert.equal(detectFileType(pdf), "pdf");
  assert.throws(() => detectFileType(new TextEncoder().encode("<svg>")));
});

test("bidang hanya menerima bukti yang dapat dinilai", () => {
  assert.equal(validateFile(png, "design"), "png");
  assert.equal(validateFile(pdf, "marketing"), "pdf");
  assert.throws(() => validateFile(pdf, "design"));
  assert.throws(() => validateFile(png, "marketing"));
});
