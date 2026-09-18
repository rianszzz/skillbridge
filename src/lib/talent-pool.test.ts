import test from "node:test";
import assert from "node:assert/strict";
import {
  getTalentPool,
  getDemoTalentCandidates,
  filterAndSortCandidates,
  isTableMissing,
  type TalentCandidate,
} from "./talent-pool.ts";

test("getDemoTalentCandidates menggabungkan demo seeds valid dan membuang yang insufficient", () => {
  const demoCandidates = getDemoTalentCandidates();

  // Memastikan hanya demo seed dengan skor valid yang masuk
  assert.ok(demoCandidates.length >= 3, "Minimal 3 kandidat demo valid terisi");
  for (const c of demoCandidates) {
    assert.ok(c.isDemo, "Setiap kandidat dari demo seed harus bertanda isDemo: true");
    assert.ok(typeof c.finalScore === "number", "finalScore harus angka terdefinisi");
    assert.ok(c.candidateName.length > 0, "Nama kandidat terisi");
    assert.ok(c.email.includes("@"), "Email kandidat terisi valid");
    assert.ok(["informatics", "design", "marketing"].includes(c.field), "Bidang harus valid");
    assert.ok(Array.isArray(c.strengths), "strengths harus array");
    assert.ok(Array.isArray(c.gaps), "gaps harus array");
  }

  // INF-01 (yang skornya null / insufficient) tidak boleh masuk ke talent pool
  const hasInf01 = demoCandidates.some(
    (c) => c.assessmentId === "00000000-0000-4000-8000-000000000001",
  );
  assert.equal(hasInf01, false, "INF-01 dengan skor null harus difilter keluar");

  // INF-02, DKV-02, MKT-02 harus ada
  assert.ok(demoCandidates.some((c) => c.assessmentId === "00000000-0000-4000-8000-000000000002"));
  assert.ok(demoCandidates.some((c) => c.assessmentId === "00000000-0000-4000-8000-000000000022"));
  assert.ok(demoCandidates.some((c) => c.assessmentId === "00000000-0000-4000-8000-000000000032"));
});

test("filterAndSortCandidates mengurutkan kandidat dari skor tertinggi ke terendah", () => {
  const mockCandidates: TalentCandidate[] = [
    {
      id: "1",
      assessmentId: "a1",
      candidateName: "Kandidat A",
      email: "a@example.com",
      role: "Junior Web Developer",
      field: "informatics",
      finalScore: 50,
      evidenceType: "github",
      strengths: ["Kekuatan A"],
      gaps: ["Gap A"],
      createdAt: "2026-08-01T10:00:00Z",
      isDemo: false,
    },
    {
      id: "2",
      assessmentId: "a2",
      candidateName: "Kandidat B",
      email: "b@example.com",
      role: "Junior Digital Marketer",
      field: "marketing",
      finalScore: 85,
      evidenceType: "pdf",
      strengths: ["Kekuatan B"],
      gaps: ["Gap B"],
      createdAt: "2026-08-02T10:00:00Z",
      isDemo: false,
    },
    {
      id: "3",
      assessmentId: "a3",
      candidateName: "Kandidat C",
      email: "c@example.com",
      role: "Junior Graphic Designer",
      field: "design",
      finalScore: 75,
      evidenceType: "image",
      strengths: ["Kekuatan C"],
      gaps: ["Gap C"],
      createdAt: "2026-08-03T10:00:00Z",
      isDemo: false,
    },
  ];

  const sorted = filterAndSortCandidates(mockCandidates);
  assert.equal(sorted[0].finalScore, 85);
  assert.equal(sorted[1].finalScore, 75);
  assert.equal(sorted[2].finalScore, 50);
});

test("filterAndSortCandidates menyaring berdasarkan field", () => {
  const mockCandidates: TalentCandidate[] = [
    {
      id: "1",
      assessmentId: "a1",
      candidateName: "Dev 1",
      email: "dev@example.com",
      role: "Junior Web Developer",
      field: "informatics",
      finalScore: 75,
      evidenceType: "github",
      strengths: [],
      gaps: [],
      createdAt: "2026-08-01T10:00:00Z",
      isDemo: false,
    },
    {
      id: "2",
      assessmentId: "a2",
      candidateName: "Designer 1",
      email: "des@example.com",
      role: "Junior Graphic Designer",
      field: "design",
      finalScore: 75,
      evidenceType: "image",
      strengths: [],
      gaps: [],
      createdAt: "2026-08-02T10:00:00Z",
      isDemo: false,
    },
    {
      id: "3",
      assessmentId: "a3",
      candidateName: "Marketer 1",
      email: "mkt@example.com",
      role: "Junior Digital Marketer",
      field: "marketing",
      finalScore: 65,
      evidenceType: "pdf",
      strengths: [],
      gaps: [],
      createdAt: "2026-08-03T10:00:00Z",
      isDemo: false,
    },
  ];

  const infoOnly = filterAndSortCandidates(mockCandidates, { field: "informatics" });
  assert.equal(infoOnly.length, 1);
  assert.equal(infoOnly[0].candidateName, "Dev 1");

  const designOnly = filterAndSortCandidates(mockCandidates, { field: "design" });
  assert.equal(designOnly.length, 1);
  assert.equal(designOnly[0].candidateName, "Designer 1");

  const allField = filterAndSortCandidates(mockCandidates, { field: "all" });
  assert.equal(allField.length, 3);
});

test("filterAndSortCandidates menyaring berdasarkan minScore", () => {
  const mockCandidates: TalentCandidate[] = [
    {
      id: "1",
      assessmentId: "a1",
      candidateName: "Kandidat 50",
      email: "50@example.com",
      role: "Junior Web Developer",
      field: "informatics",
      finalScore: 50,
      evidenceType: "github",
      strengths: [],
      gaps: [],
      createdAt: "2026-08-01T10:00:00Z",
      isDemo: false,
    },
    {
      id: "2",
      assessmentId: "a2",
      candidateName: "Kandidat 75",
      email: "75@example.com",
      role: "Junior Web Developer",
      field: "informatics",
      finalScore: 75,
      evidenceType: "github",
      strengths: [],
      gaps: [],
      createdAt: "2026-08-02T10:00:00Z",
      isDemo: false,
    },
    {
      id: "3",
      assessmentId: "a3",
      candidateName: "Kandidat 90",
      email: "90@example.com",
      role: "Junior Web Developer",
      field: "informatics",
      finalScore: 90,
      evidenceType: "github",
      strengths: [],
      gaps: [],
      createdAt: "2026-08-03T10:00:00Z",
      isDemo: false,
    },
  ];

  const above75 = filterAndSortCandidates(mockCandidates, { minScore: 75 });
  assert.equal(above75.length, 2);
  assert.equal(above75[0].finalScore, 90);
  assert.equal(above75[1].finalScore, 75);

  const above80 = filterAndSortCandidates(mockCandidates, { minScore: 80 });
  assert.equal(above80.length, 1);
  assert.equal(above80[0].finalScore, 90);

  const above95 = filterAndSortCandidates(mockCandidates, { minScore: 95 });
  assert.equal(above95.length, 0);
});

test("getTalentPool berjalan fail-safe dan mengembalikan data yang terurut", async () => {
  const pool = await getTalentPool();
  assert.ok(Array.isArray(pool), "Hasil getTalentPool harus berupa array");
  assert.ok(pool.length >= 3, "Harus memuat setidaknya kandidat demo seeds");

  // Pastikan urut skor tertinggi
  for (let i = 0; i < pool.length - 1; i++) {
    assert.ok(
      pool[i].finalScore >= pool[i + 1].finalScore,
      `Skor ${pool[i].finalScore} harus >= ${pool[i + 1].finalScore}`,
    );
  }

  // Filter bidang informatika
  const infoPool = await getTalentPool({ field: "informatics" });
  assert.ok(infoPool.length > 0);
  for (const c of infoPool) {
    assert.equal(c.field, "informatics");
  }

  // Filter skor >= 50
  const score50Pool = await getTalentPool({ minScore: 50 });
  for (const c of score50Pool) {
    assert.ok(c.finalScore >= 50);
  }
});

test("isTableMissing mendeteksi kode dan pesan error ketiadaan tabel atau kolom dengan akurat", () => {
  assert.equal(isTableMissing({ code: "PGRST204" }), true);
  assert.equal(isTableMissing({ code: "42P01" }), true);
  assert.equal(isTableMissing({ code: "42703" }), true);
  assert.equal(isTableMissing({ message: "relation public.profiles does not exist" }), true);
  assert.equal(isTableMissing({ message: "Could not find the 'is_public_talent' column" }), true);
  assert.equal(isTableMissing({ code: "23505", message: "duplicate key value" }), false);
  assert.equal(isTableMissing(null), false);
  assert.equal(isTableMissing(undefined), false);
});

test("getTalentPool menyaring berdasarkan jobId HR dan memetakan objek TalentCandidate secara lengkap", async () => {
  const webJobId = "10000000-0000-4000-8000-000000000001";
  const mktJobId = "10000000-0000-4000-8000-000000000003";

  // Saring hanya untuk lowongan web developer
  const webCandidates = await getTalentPool("recruiter-test-id", { jobId: webJobId });
  assert.ok(webCandidates.length >= 1, "Harus memuat minimal pelamar lowongan web");
  for (const c of webCandidates) {
    assert.equal(c.jobId, webJobId);
    assert.equal(c.field, "informatics");
    assert.ok(c.jobTitle);
    assert.ok(c.companyName);
    assert.ok(c.fitEvaluation, "fitEvaluation harus terisi");
    assert.ok([0, 25, 50, 75, 100].includes(c.fitEvaluation!.score));
    assert.ok(["high", "medium", "low"].includes(c.fitEvaluation!.fitLevel));
    assert.equal(c.finalScore, c.fitEvaluation!.score);
  }

  // Saring hanya untuk lowongan marketing
  const mktCandidates = await getTalentPool("recruiter-test-id", { jobId: mktJobId });
  assert.ok(mktCandidates.length >= 1, "Harus memuat minimal pelamar lowongan marketing");
  for (const c of mktCandidates) {
    assert.equal(c.jobId, mktJobId);
    assert.equal(c.field, "marketing");
    assert.equal(c.candidateName, "Budi Santoso (MKT-02)");
    assert.ok(c.fitEvaluation);
    assert.equal(c.fitEvaluation!.score, 75);
  }

  // Saring dengan jobId = "all" memuat seluruh pelamar
  const allCandidates = await getTalentPool("recruiter-test-id", { jobId: "all" });
  assert.ok(allCandidates.length >= 3, "jobId 'all' harus memuat minimal 3 pelamar demo");
});

