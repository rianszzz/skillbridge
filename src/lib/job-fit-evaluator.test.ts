import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateJobFit,
  fallbackJobFitEvaluation,
  snapToAnchor,
  getFitLevel,
} from "./job-fit-evaluator.ts";
import { MOCK_JOBS_FIXTURE } from "./jobs.ts";
import { DEMO_SEEDS } from "./demo-seed.ts";

test("snapToAnchor membatasi skor secara ketat pada anchor 0, 25, 50, 75, 100", () => {
  assert.equal(snapToAnchor(0), 0);
  assert.equal(snapToAnchor(10), 0);
  assert.equal(snapToAnchor(20), 25);
  assert.equal(snapToAnchor(25), 25);
  assert.equal(snapToAnchor(35), 25);
  assert.equal(snapToAnchor(40), 50);
  assert.equal(snapToAnchor(50), 50);
  assert.equal(snapToAnchor(60), 50);
  assert.equal(snapToAnchor(70), 75);
  assert.equal(snapToAnchor(75), 75);
  assert.equal(snapToAnchor(85), 75);
  assert.equal(snapToAnchor(90), 100);
  assert.equal(snapToAnchor(100), 100);
});

test("getFitLevel memetakan anchor skor ke high, medium, low secara akurat", () => {
  assert.equal(getFitLevel(100), "high");
  assert.equal(getFitLevel(75), "high");
  assert.equal(getFitLevel(50), "medium");
  assert.equal(getFitLevel(25), "low");
  assert.equal(getFitLevel(0), "low");
});

test("fallbackJobFitEvaluation menghasilkan evaluasi deterministik dan valid untuk kandidat berkualifikasi tinggi", () => {
  const job = MOCK_JOBS_FIXTURE[0]; // Junior Front-End Web Developer
  const assessment = DEMO_SEEDS[1]; // INF-02 (Junior Web Developer, score: 50)

  const applicant = {
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@example.com",
    assessment,
    portfolioUrl: "https://github.com/ahmad/web-events",
    coverLetter: "Saya menguasai Next.js, React, TypeScript, dan Tailwind CSS.",
  };

  const eval1 = fallbackJobFitEvaluation(job, applicant);
  const eval2 = fallbackJobFitEvaluation(job, applicant);

  // Deterministik
  assert.deepEqual(eval1, eval2, "Hasil evaluasi fallback harus identik dan deterministik");

  // Validasi format kriteria
  assert.ok([0, 25, 50, 75, 100].includes(eval1.score), "Skor harus berupa anchor");
  assert.ok(["high", "medium", "low"].includes(eval1.fitLevel), "fitLevel harus valid");
  assert.ok(Array.isArray(eval1.matchingCriteria), "matchingCriteria harus array");
  assert.ok(Array.isArray(eval1.missingCriteria), "missingCriteria harus array");
  assert.ok(eval1.summary.length > 0, "Summary harus terisi");
  assert.ok(eval1.recommendation.length > 0, "Rekomendasi harus terisi");

  // Karena pelamar mencantumkan skill inti Next.js, React, TypeScript, Tailwind CSS
  assert.ok(
    eval1.matchingCriteria.some((c) => c.toLowerCase().includes("next.js")),
    "Harus mencatat kecocokan Next.js",
  );
  assert.ok(eval1.score >= 50, "Kandidat dengan portfolio relevan harus mendapatkan minimal anchor 50");
});

test("fallbackJobFitEvaluation menangani pelamar tanpa asesmen dan tanpa bukti secara fail-safe", () => {
  const job = MOCK_JOBS_FIXTURE[1]; // Studio Kreatif Visual

  const applicant = {
    name: "Pelamar Kosong",
    email: "kosong@example.com",
  };

  const result = fallbackJobFitEvaluation(job, applicant);

  assert.equal(result.score, 0, "Pelamar tanpa bukti dan tanpa asesmen mendapatkan skor 0");
  assert.equal(result.fitLevel, "low");
  assert.ok(result.missingCriteria.length > 0);
  assert.ok(result.summary.includes(applicant.name));
  assert.ok(result.recommendation.length > 0);
});

test("evaluateJobFit bekerja fail-safe tanpa GROQ_API_KEY", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const job = MOCK_JOBS_FIXTURE[2]; // Artha Digital Growth
    const assessment = DEMO_SEEDS[3]; // MKT-02

    const applicant = {
      name: "Budi Santoso",
      email: "budi@example.com",
      assessment,
      portfolioUrl: "https://example.com/portofolio.pdf",
      coverLetter: "Pengalaman mengelola Meta Ads dan Google Ads dengan analisis ROAS.",
    };

    const evaluation = await evaluateJobFit(job, applicant);

    assert.ok(evaluation);
    assert.ok([0, 25, 50, 75, 100].includes(evaluation.score));
    assert.ok(["high", "medium", "low"].includes(evaluation.fitLevel));
    assert.ok(Array.isArray(evaluation.matchingCriteria));
    assert.ok(Array.isArray(evaluation.missingCriteria));
    assert.ok(typeof evaluation.summary === "string" && evaluation.summary.length > 0);
    assert.ok(typeof evaluation.recommendation === "string" && evaluation.recommendation.length > 0);
  } finally {
    if (originalKey !== undefined) {
      process.env.GROQ_API_KEY = originalKey;
    }
  }
});
