import assert from "node:assert/strict";
import test from "node:test";
import { detectFileType, splitTextBlocks, validateFile } from "./file-evidence.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 100, 0, 0, 0, 100]);
const pdf = new TextEncoder().encode("%PDF-1.4");

test("magic bytes menentukan tipe, bukan nama file", () => {
  assert.equal(detectFileType(png), "png");
  assert.equal(detectFileType(pdf), "pdf");
  assert.throws(() => detectFileType(new TextEncoder().encode("<svg>")));
});

test("teks PDF dipecah menjadi block pendek yang tetap utuh", () => {
  const blocks = splitTextBlocks(`${"Kalimat pertama cukup panjang. ".repeat(30)}Kalimat akhir.`);
  assert.ok(blocks.length > 1);
  assert.ok(blocks.every((block) => block.length <= 600));
  assert.match(blocks.join(" "), /Kalimat akhir/);
});

test("bidang hanya menerima bukti yang dapat dinilai", () => {
  assert.equal(validateFile(png, "design"), "png");
  assert.equal(validateFile(pdf, "marketing"), "pdf");
  assert.throws(() => validateFile(pdf, "design"));
  assert.throws(() => validateFile(png, "marketing"));
});

test("gambar dengan dimensi berbahaya atau struktur terpotong ditolak", () => {
  const bomb = Uint8Array.from(png); bomb.set([0, 0, 0x27, 0x10, 0, 0, 0x27, 0x10], 16);
  assert.throws(() => validateFile(bomb, "design"), /Dimensi/);
  assert.throws(() => validateFile(Uint8Array.from([0xff, 0xd8, 0xff]), "design"), /JPEG/);
});
