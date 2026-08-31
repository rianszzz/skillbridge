import assert from "node:assert/strict";
import test from "node:test";
import { enrichCriterionDetails, groundEvidenceQuotes, quoteMatchesEvidence, quoteMatchesReference, repairSufficiency, validateResult } from "./assessment.ts";
import { rubrics } from "./rubrics.ts";
import type { CriterionScore } from "./types.ts";

const evidence = "[PAGE:1:BLOCK:1]\nSearch menghasilkan 153 konversi dengan conversion rate 7,2%.";
const criterion: CriterionScore = { criterion_id: "marketing_data_use", evidence_sufficiency: "sufficient", score: 75, confidence: "high", reason: "Data kanal memandu keputusan.", evidence_refs: ["[PAGE:1:BLOCK:1]"], details: { met_indicators: ["Metrik konversi tersedia."], missing_indicators: ["Sumber data belum disebut."], evidence_quotes: [{ reference: "[PAGE:1:BLOCK:1]", quote: "Search menghasilkan 153 konversi" }], next_action: "Tambahkan sumber data dan rumus perhitungan." } };

test("detail spesifik menerima kutipan exact dari reference yang tersedia", () => {
  assert.doesNotThrow(() => validateResult([criterion], [criterion.criterion_id], evidence, "Junior Digital Marketer"));
});

test("kutipan PDF menerima variasi tanda baca tetapi menolak klaim berbeda", () => {
  assert.equal(quoteMatchesEvidence("## Install", "README\n## Install\nnpm install package"), true);
  assert.equal(quoteMatchesEvidence("Search menghasilkan 153 konversi — conversion rate 7,2%", evidence), true);
  assert.equal(quoteMatchesEvidence("Search menghasilkan 999 penjualan dengan ROAS 20%", evidence), false);
});

test("kutipan wajib berasal dari block yang direferensikan", () => {
  const blocks = "[PAGE:1:BLOCK:1]\nCTR sebesar 7,2%.\n[PAGE:1:BLOCK:2]\nRevenue sebesar Rp10 juta.";
  assert.equal(quoteMatchesReference("[PAGE:1:BLOCK:1]", "CTR sebesar 7,2%", blocks), true);
  assert.equal(quoteMatchesReference("[PAGE:1:BLOCK:1]", "Revenue sebesar Rp10 juta", blocks), false);
});

test("kutipan paraphrase di-ground ke baris exact pada block yang sama", () => {
  const item = structuredClone(criterion);
  item.details!.evidence_quotes[0].quote = "Search memberi 153 conversion";
  groundEvidenceQuotes([item], evidence);
  assert.equal(item.details!.evidence_quotes[0].quote, "Search menghasilkan 153 konversi dengan conversion rate 7,2%.");
});

test("detail spesifik menolak kutipan karangan dan tindakan kosong", () => {
  assert.throws(() => validateResult([{ ...criterion, details: { ...criterion.details!, evidence_quotes: [{ reference: "[PAGE:1:BLOCK:1]", quote: "Angka yang tidak pernah ada" }] } }], [criterion.criterion_id], evidence, "Junior Digital Marketer"), /Kutipan/);
  assert.throws(() => validateResult([{ ...criterion, details: { ...criterion.details!, next_action: "" } }], [criterion.criterion_id], evidence, "Junior Digital Marketer"), /Detail/);
});

test("detail yang dilewatkan model diisi deterministik dari rubrik", () => {
  const item = structuredClone(criterion); item.details!.missing_indicators = []; item.details!.next_action = "";
  enrichCriterionDetails([item], rubrics["Junior Digital Marketer"]);
  assert.equal(item.details!.missing_indicators[0], rubrics["Junior Digital Marketer"][1].anchorRequirements["100"]);
  assert.match(item.details!.next_action, /anchor berikutnya/i);
});

test("schema recovery hanya mengisi sufficiency dari score", () => {
  const repaired = JSON.parse(repairSufficiency('{"criteria":[{"score":75},{"score":null}]}'));
  assert.deepEqual(repaired.criteria.map((item: { evidence_sufficiency: string }) => item.evidence_sufficiency), ["sufficient", "insufficient_evidence"]);
  assert.equal(repaired.evidence_sufficiency, "insufficient_evidence");
  assert.throws(() => repairSufficiency('{"criteria":null}'), /kriteria/);
});

test("detail malformed gagal aman dan indikator berlebih dipotong", () => {
  const malformed = { ...criterion, details: { next_action: "Perbaiki bukti." } } as CriterionScore;
  assert.throws(() => validateResult([malformed], [criterion.criterion_id], evidence, "Junior Digital Marketer"), /Struktur detail/);
  const verbose = structuredClone(criterion);
  verbose.details!.met_indicators = ["Satu", "Dua", "Tiga"];
  enrichCriterionDetails([verbose], rubrics["Junior Digital Marketer"]);
  assert.deepEqual(verbose.details!.met_indicators, ["Satu", "Dua"]);
});

test("kualitas kode boleh dinilai hanya saat source file tersedia", () => {
  const code = { ...criterion, criterion_id: "web_code_quality", evidence_refs: ["[FILE:1:L1-L1]"], details: { ...criterion.details!, evidence_quotes: [{ reference: "[FILE:1:L1-L1]", quote: "function validateInput value" }] } };
  assert.doesNotThrow(() => validateResult([code], [code.criterion_id], "[FILE:1:L1-L1]\nfunction validateInput(value)", "Junior Web Developer"));
  const withoutSource = { ...code, evidence_refs: ["[README:1]"], details: { ...code.details!, evidence_quotes: [{ reference: "[README:1]", quote: "function validateInput value" }] } };
  assert.throws(() => validateResult([withoutSource], [code.criterion_id], "[README:1]\nfunction validateInput(value)", "Junior Web Developer"), /source file/);
});
