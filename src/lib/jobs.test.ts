import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_JOBS,
  DEMO_APPLICATIONS,
  MOCK_JOBS_FIXTURE,
  MOCK_APPLICATIONS_FIXTURE,
  filterJobs,
  getJobPostings,
  getJobPostingById,
  createJobPosting,
  applyToJob,
  getJobApplicationsForRecruiter,
  getJobApplicationsForCandidate,
  validateJobPostingInput,
  validateApplicationInput,
  validateJobPostingUpdateInput,
  updateJobPosting,
  deleteJobPosting,
  updateApplicationStatus,
  isTableMissing,
  parseDeletedJobsCookie,
  saveApplicationToRecruiterMetadata,
  updateApplicationStatusInRecruiterMetadata,
  resetInMemoryApplicationsForTesting,
  uploadApplicationFileToStorage,
  sanitizeApplicationForMetadata,
  isSignedUrlExpiring,
  mergeApplicationDetails,
} from "./jobs.ts";
import type { JobPosting, JobApplication, AssessmentResult } from "./types.ts";
import { DEMO_SEEDS } from "./demo-seed.ts";

test("DEMO_JOBS kosong di produksi dan MOCK_JOBS_FIXTURE mematuhi skema data dan kriteria Proposal Kompres 16", () => {
  assert.equal(DEMO_JOBS.length, 0, "DEMO_JOBS harus kosong di produksi");
  assert.equal(DEMO_APPLICATIONS.length, 0, "DEMO_APPLICATIONS harus kosong di produksi");
  assert.ok(MOCK_JOBS_FIXTURE.length >= 3, "Harus menyediakan minimal 3 lowongan mock di fixture");
  assert.ok(MOCK_APPLICATIONS_FIXTURE.length >= 2, "Harus menyediakan minimal 2 lamaran mock di fixture");

  // Memastikan ketiga bidang terwakili
  const fields = MOCK_JOBS_FIXTURE.map((j) => j.field);
  assert.ok(fields.includes("informatics"), "Bidang informatika harus tersedia");
  assert.ok(fields.includes("design"), "Bidang desain (DKV) harus tersedia");
  assert.ok(fields.includes("marketing"), "Bidang pemasaran digital harus tersedia");

  for (const job of MOCK_JOBS_FIXTURE) {
    assert.ok(job.id.length > 0, "ID lowongan harus terisi");
    assert.ok(job.title.length > 0, "Judul lowongan harus terisi");
    assert.ok(job.companyName.length > 0, "Nama perusahaan harus terisi");
    assert.ok(job.location.length > 0, "Lokasi harus terisi");
    assert.equal(job.isDemo, true, "isDemo harus true untuk data demo");
    assert.equal(job.status, "active", "Lowongan demo harus bertatus active");

    // Highlights harus 3 poin
    assert.equal(
      job.highlights.length,
      3,
      `Lowongan ${job.title} harus memiliki tepat 3 poin highlights`,
    );

    // Tanggung jawab & keahlian
    assert.ok(job.responsibilities.length >= 2, "Responsibilities minimal 2 poin");
    assert.ok(job.requiredSkills.length >= 2, "RequiredSkills minimal 2 keahlian");

    // Skor Skillbridge
    assert.ok(
      job.minSkillbridgeScore >= 0 && job.minSkillbridgeScore <= 100,
      "minSkillbridgeScore harus di antara 0 dan 100",
    );

    // Bukti yang diterima
    assert.ok(job.acceptedEvidenceTypes.length >= 1, "Harus menerima minimal 1 tipe bukti");
    for (const ev of job.acceptedEvidenceTypes) {
      assert.ok(["github", "image", "pdf"].includes(ev), "Tipe bukti harus valid");
    }

    // Kompensasi & Gaji
    if (job.compensationType === "paid" && job.showSalary) {
      assert.ok(typeof job.salaryMin === "number" && job.salaryMin > 0, "salaryMin harus angka positif");
      if (job.salaryMax !== null) {
        assert.ok(job.salaryMax >= job.salaryMin, "salaryMax harus >= salaryMin");
      }
    }
  }

  // Khusus lowongan Web Dev, DKV, dan Pemasaran harus memiliki label Ramah SMK / Fresh Grad
  const webDev = MOCK_JOBS_FIXTURE.find((j) => j.field === "informatics" && j.employmentType === "fulltime");
  assert.ok(webDev);
  assert.equal(webDev.minEducation, "smk");
  assert.equal(webDev.experienceLevel, "fresh_graduate");
  assert.ok(webDev.highlights[0].toLowerCase().includes("smk"));

  const graphicDev = MOCK_JOBS_FIXTURE.find((j) => j.field === "design" && j.employmentType === "fulltime");
  assert.ok(graphicDev);
  assert.equal(graphicDev.minEducation, "smk");
  assert.equal(graphicDev.experienceLevel, "fresh_graduate");
  assert.ok(graphicDev.highlights[0].toLowerCase().includes("smk"));

  const marketingDev = MOCK_JOBS_FIXTURE.find((j) => j.field === "marketing");
  assert.ok(marketingDev);
  assert.equal(marketingDev.minEducation, "smk");
  assert.equal(marketingDev.experienceLevel, "fresh_graduate");
  assert.ok(marketingDev.highlights[0].toLowerCase().includes("smk"));
});

test("filterJobs menyaring berdasarkan bidang (field)", () => {
  const infoJobs = filterJobs(MOCK_JOBS_FIXTURE, { field: "informatics" });
  assert.ok(infoJobs.length > 0);
  assert.ok(infoJobs.every((j) => j.field === "informatics"));

  const designJobs = filterJobs(MOCK_JOBS_FIXTURE, { field: "design" });
  assert.ok(designJobs.length > 0);
  assert.ok(designJobs.every((j) => j.field === "design"));

  const marketingJobs = filterJobs(MOCK_JOBS_FIXTURE, { field: "marketing" });
  assert.ok(marketingJobs.length > 0);
  assert.ok(marketingJobs.every((j) => j.field === "marketing"));

  const allJobs = filterJobs(MOCK_JOBS_FIXTURE, { field: "all" });
  assert.equal(allJobs.length, MOCK_JOBS_FIXTURE.length);
});

const mockDiplomaInternshipJob: JobPosting = {
  ...MOCK_JOBS_FIXTURE[0],
  id: "mock-diploma-internship-job",
  minEducation: "diploma",
  compensationType: "unpaid",
  employmentType: "internship",
};

const mockContractJob: JobPosting = {
  ...MOCK_JOBS_FIXTURE[0],
  id: "mock-contract-job",
  employmentType: "contract",
};

test("filterJobs menyaring berdasarkan pendidikan minimal (minEducation)", () => {
  const smkJobs = filterJobs(MOCK_JOBS_FIXTURE, { minEducation: "smk" });
  assert.ok(smkJobs.length >= 3);
  assert.ok(smkJobs.every((j) => j.minEducation === "smk"));

  const diplomaJobs = filterJobs([...MOCK_JOBS_FIXTURE, mockDiplomaInternshipJob], { minEducation: "diploma" });
  assert.ok(diplomaJobs.length >= 1);
  assert.ok(diplomaJobs.every((j) => j.minEducation === "diploma"));

  const bachelorJobs = filterJobs(MOCK_JOBS_FIXTURE, { minEducation: "bachelor" });
  assert.equal(bachelorJobs.length, 0);
});

test("filterJobs menyaring berdasarkan kompensasi paid dan unpaid", () => {
  const paidJobs = filterJobs(MOCK_JOBS_FIXTURE, { compensationType: "paid" });
  assert.ok(paidJobs.length >= 3);
  assert.ok(paidJobs.every((j) => j.compensationType === "paid"));

  const unpaidJobs = filterJobs([...MOCK_JOBS_FIXTURE, mockDiplomaInternshipJob], { compensationType: "unpaid" });
  assert.ok(unpaidJobs.length >= 1);
  assert.ok(unpaidJobs.every((j) => j.compensationType === "unpaid"));
});

test("filterJobs menyaring berdasarkan tipe kerja (employmentType)", () => {
  const fulltimeJobs = filterJobs(MOCK_JOBS_FIXTURE, { employmentType: "fulltime" });
  assert.ok(fulltimeJobs.length >= 3);
  assert.ok(fulltimeJobs.every((j) => j.employmentType === "fulltime"));

  const internshipJobs = filterJobs([...MOCK_JOBS_FIXTURE, mockDiplomaInternshipJob], { employmentType: "internship" });
  assert.ok(internshipJobs.length >= 1);
  assert.ok(internshipJobs.every((j) => j.employmentType === "internship"));

  const contractJobs = filterJobs([...MOCK_JOBS_FIXTURE, mockContractJob], { employmentType: "contract" });
  assert.ok(contractJobs.length >= 1);
  assert.ok(contractJobs.every((j) => j.employmentType === "contract"));
});

test("filterJobs menyaring berdasarkan workplaceType, candidateScore, dan searchQuery", () => {
  // Workplace filter
  const remoteJobs = filterJobs(MOCK_JOBS_FIXTURE, { workplaceType: "remote" });
  assert.ok(remoteJobs.length >= 1);
  assert.ok(remoteJobs.every((j) => j.workplaceType === "remote"));

  // Candidate score filter (kandidat dengan skor 60 bisa melihat lowongan dengan minSkillbridgeScore <= 60)
  const accessibleForScore60 = filterJobs(MOCK_JOBS_FIXTURE, { candidateScore: 60 });
  assert.ok(accessibleForScore60.length > 0);
  assert.ok(accessibleForScore60.every((j) => j.minSkillbridgeScore <= 60));

  // Search query
  const searchNext = filterJobs(MOCK_JOBS_FIXTURE, { searchQuery: "Next.js" });
  assert.ok(searchNext.length >= 1);
  assert.ok(searchNext.some((j) => j.title.includes("Web") || j.requiredSkills.includes("Next.js")));

  const searchBandung = filterJobs(MOCK_JOBS_FIXTURE, { searchQuery: "Bandung" });
  assert.ok(searchBandung.length >= 1);
  assert.equal(searchBandung[0].location, "Bandung, Jawa Barat");
});

test("Ketahanan fail-safe getJobPostings dan getJobPostingById saat database belum termigrasi", async () => {
  const jobs = await getJobPostings();
  assert.ok(Array.isArray(jobs), "Harus mengembalikan array");
  // Pastikan lowongan dummy lama tidak merembes secara default di produksi
  assert.ok(
    !jobs.some((j) => j.companyName === "PT Nusantara Cloud Solusindo"),
    "Lowongan dummy tidak boleh merembes ke getJobPostings",
  );

  // getJobPostingById dengan id fixture
  const firstDemoId = MOCK_JOBS_FIXTURE[0].id;
  const found = await getJobPostingById(firstDemoId);
  assert.ok(found !== null);
  assert.equal(found?.id, firstDemoId);
  assert.equal(found?.companyName, MOCK_JOBS_FIXTURE[0].companyName);

  // getJobPostingById dengan id acak tidak ada
  const notFound = await getJobPostingById("00000000-0000-0000-0000-000000000000");
  assert.equal(notFound, null);
});

test("isTableMissing mendeteksi kode error ketiadaan tabel secara akurat", () => {
  assert.equal(isTableMissing({ code: "PGRST204" }), true);
  assert.equal(isTableMissing({ code: "42P01" }), true);
  assert.equal(isTableMissing({ code: "42703" }), true);
  assert.equal(isTableMissing({ message: "relation public.job_postings does not exist" }), true);
  assert.equal(isTableMissing({ code: "23505", message: "duplicate key" }), false);
  assert.equal(isTableMissing(null), false);
  assert.equal(isTableMissing(undefined), false);
});

test("Validasi input createJobPosting menolak data yang tidak lengkap atau tidak valid", async () => {
  const baseValidInput = {
    title: "Junior Backend Developer",
    field: "informatics" as const,
    targetRole: "Junior Web Developer",
    employmentType: "fulltime" as const,
    workplaceType: "hybrid" as const,
    location: "Jakarta",
    minEducation: "smk" as const,
    experienceLevel: "fresh_graduate" as const,
    compensationType: "paid" as const,
    salaryMin: 5000000,
    salaryMax: 7000000,
    highlights: ["Highlight 1", "Highlight 2", "Highlight 3"],
    responsibilities: ["Tanggung jawab 1"],
    requiredSkills: ["Node.js", "PostgreSQL"],
    minSkillbridgeScore: 60,
  };

  // recruiterId kosong
  assert.throws(
    () => validateJobPostingInput("", "PT Sukses", baseValidInput),
    /recruiterId.*wajib diisi/i,
  );

  // companyName kosong
  assert.throws(
    () => validateJobPostingInput("user-1", "", baseValidInput),
    /companyName.*wajib diisi/i,
  );

  // title kosong
  assert.throws(
    () => validateJobPostingInput("user-1", "PT Sukses", { ...baseValidInput, title: "" }),
    /title.*wajib diisi/i,
  );

  // field tidak valid
  assert.throws(
    () =>
      validateJobPostingInput("user-1", "PT Sukses", {
        ...baseValidInput,
        field: "agriculture" as unknown as typeof baseValidInput.field,
      }),
    /bidang lowongan tidak valid/i,
  );

  // salaryMin negatif
  assert.throws(
    () =>
      validateJobPostingInput("user-1", "PT Sukses", {
        ...baseValidInput,
        salaryMin: -1000,
      }),
    /gaji minimum tidak boleh bernilai negatif/i,
  );

  // salaryMax < salaryMin
  assert.throws(
    () =>
      validateJobPostingInput("user-1", "PT Sukses", {
        ...baseValidInput,
        salaryMin: 8000000,
        salaryMax: 5000000,
      }),
    /gaji maksimum tidak boleh lebih kecil/i,
  );

  // highlights kosong
  assert.throws(
    () =>
      validateJobPostingInput("user-1", "PT Sukses", {
        ...baseValidInput,
        highlights: [],
      }),
    /highlights.*wajib/i,
  );

  // minSkillbridgeScore > 100
  assert.throws(
    () =>
      validateJobPostingInput("user-1", "PT Sukses", {
        ...baseValidInput,
        minSkillbridgeScore: 120,
      }),
    /skor minimal skillbridge/i,
  );

  // createJobPosting berhasil secara fail-safe saat input valid
  const created = await createJobPosting("user-test-1", "PT Sukses Bersama", baseValidInput);
  assert.ok(created.id);
  assert.equal(created.title, baseValidInput.title);
  assert.equal(created.companyName, "PT Sukses Bersama");
  assert.equal(created.status, "active");
});

test("Validasi input applyToJob menolak data lamaran yang tidak lengkap atau tidak valid", async () => {
  const baseValidApp = {
    jobId: MOCK_JOBS_FIXTURE[0].id,
    candidateName: "Rian Pratama",
    candidateEmail: "rian@example.com",
    skillbridgeScore: 75,
    portfolioUrl: "https://github.com/rian/my-app",
    coverLetter: "Halo, saya tertarik melamar posisi ini.",
  };

  // candidateId kosong
  assert.throws(
    () => validateApplicationInput("", baseValidApp),
    /candidateId.*wajib diisi/i,
  );

  // jobId kosong
  assert.throws(
    () => validateApplicationInput("candidate-1", { ...baseValidApp, jobId: "" }),
    /jobId.*wajib diisi/i,
  );

  // candidateName kosong
  assert.throws(
    () => validateApplicationInput("candidate-1", { ...baseValidApp, candidateName: "" }),
    /nama kandidat wajib diisi/i,
  );

  // candidateEmail tidak valid
  assert.throws(
    () => validateApplicationInput("candidate-1", { ...baseValidApp, candidateEmail: "notanemail" }),
    /email kandidat harus berupa alamat email/i,
  );

  // skillbridgeScore tidak valid (>100)
  assert.throws(
    () => validateApplicationInput("candidate-1", { ...baseValidApp, skillbridgeScore: 150 }),
    /skor skillbridge harus berupa angka/i,
  );

  // applyToJob berhasil secara fail-safe saat input valid
  const application = await applyToJob("candidate-test-1", baseValidApp);
  assert.ok(application.id);
  assert.equal(application.jobId, MOCK_JOBS_FIXTURE[0].id);
  assert.equal(application.candidateName, "Rian Pratama");
  assert.equal(application.status, "pending");
  assert.ok(application.fitEvaluation, "applyToJob harus memuat fitEvaluation");
  assert.ok([0, 25, 50, 75, 100].includes(application.fitEvaluation.score));
  assert.equal(application.skillbridgeScore, application.fitEvaluation.score);
});

test("validateApplicationInput menolak surat lamaran kosong pada opsi upload dan write, serta mengizinkan opsi none dan undefined", () => {
  const baseValid = {
    jobId: MOCK_JOBS_FIXTURE[0].id,
    candidateName: "Rian Pratama",
    candidateEmail: "rian@example.com",
  };

  // 1. Opsi upload: nama file kosong atau tidak ada
  assert.throws(
    () =>
      validateApplicationInput("candidate-1", {
        ...baseValid,
        coverLetterMode: "upload",
      }),
    /berkas surat lamaran wajib diunggah jika memilih opsi unggah surat lamaran/i,
  );

  assert.throws(
    () =>
      validateApplicationInput("candidate-1", {
        ...baseValid,
        coverLetterMode: "upload",
        coverLetterFileName: "   ",
      }),
    /berkas surat lamaran wajib diunggah jika memilih opsi unggah surat lamaran/i,
  );

  // 1b. Opsi upload valid
  assert.doesNotThrow(() =>
    validateApplicationInput("candidate-1", {
      ...baseValid,
      coverLetterMode: "upload",
      coverLetterFileName: "surat_lamaran_rian.pdf",
    }),
  );

  // 2. Opsi write: isi surat lamaran kosong atau tidak ada
  assert.throws(
    () =>
      validateApplicationInput("candidate-1", {
        ...baseValid,
        coverLetterMode: "write",
      }),
    /isi surat lamaran wajib diisi jika memilih opsi tulis surat lamaran/i,
  );

  assert.throws(
    () =>
      validateApplicationInput("candidate-1", {
        ...baseValid,
        coverLetterMode: "write",
        coverLetter: "   ",
      }),
    /isi surat lamaran wajib diisi jika memilih opsi tulis surat lamaran/i,
  );

  // 2b. Opsi write valid
  assert.doesNotThrow(() =>
    validateApplicationInput("candidate-1", {
      ...baseValid,
      coverLetterMode: "write",
      coverLetter: "Saya sangat tertarik dengan kesempatan ini.",
    }),
  );

  // 3. Opsi none atau undefined: diizinkan kosong
  assert.doesNotThrow(() =>
    validateApplicationInput("candidate-1", {
      ...baseValid,
      coverLetterMode: "none",
    }),
  );

  assert.doesNotThrow(() =>
    validateApplicationInput("candidate-1", {
      ...baseValid,
      coverLetterMode: undefined,
    }),
  );
});

test("applyToJob menyimpan skor asesmen asli dan fitEvaluation >= 75 untuk pelamar dengan asesmen 75/100 tanpa portofolio opsional", async () => {
  const testAsmId = "00000000-0000-4000-8000-000000000075";
  const mockAssessment75: AssessmentResult = {
    id: testAsmId,
    createdAt: "2026-09-01T00:00:00Z",
    role: "Junior Web Developer",
    sourceUrl: "https://github.com/skillbridge-demo/verified-repo",
    evidenceType: "github",
    rubric_version: "1.1",
    evidence_sufficiency: "sufficient",
    finalScore: 75,
    strengths: ["Struktur kode dan arsitektur Next.js terbukti rapi"],
    gaps: [],
    limitations: [],
    criteria: [],
  };

  // Daftarkan sementara ke DEMO_SEEDS agar ditemukan oleh findAssessment
  DEMO_SEEDS.push(mockAssessment75);

  try {
    const job = MOCK_JOBS_FIXTURE[0]; // Junior Front-End Web Developer (informatics)
    const applicationInput = {
      jobId: job.id,
      candidateName: "Kandidat Terverifikasi Asesmen 75",
      candidateEmail: "terverifikasi75@example.com",
      assessmentId: testAsmId,
      // Tanpa portofolio opsional
    };

    const app = await applyToJob("candidate-verified-75", applicationInput);

    // 1. Pastikan skillbridgeScore menyimpan skor asesmen asli (75)
    assert.equal(
      app.skillbridgeScore,
      75,
      "skillbridgeScore harus menyimpan skor asesmen asli kandidat (75)",
    );

    // 2. Pastikan fitEvaluation tersimpan
    assert.ok(app.fitEvaluation, "fitEvaluation harus tersedia pada lamaran");

    // 3. Pastikan skor fitEvaluation TIDAK turun menjadi 50/100 melainkan tetap >= 75/100
    assert.ok(
      app.fitEvaluation.score >= 75,
      `Skor fitEvaluation harus >= 75 (diterima: ${app.fitEvaluation.score}), tidak boleh anjlok ke 50/100`,
    );
    assert.equal(app.fitEvaluation.score, 75);
    assert.equal(app.fitEvaluation.fitLevel, "high");

    // 4. Kriteria matching memuat pengakuan asesmen terverifikasi
    assert.ok(
      app.fitEvaluation.matchingCriteria.some((c) =>
        c.includes("Hasil Asesmen Kompetensi Portofolio Skillbridge terverifikasi: 75/100"),
      ),
      "matchingCriteria wajib mencantumkan status asesmen terverifikasi",
    );

    // 5. Kriteria missing TIDAK menuntut portofolio tambahan
    assert.ok(
      !app.fitEvaluation.missingCriteria.some((c) =>
        c.toLowerCase().includes("tautan portofolio proyek spesifik belum disertakan"),
      ),
      "missingCriteria TIDAK boleh menuntut portofolio jika kandidat sudah memiliki asesmen terverifikasi",
    );
  } finally {
    const idx = DEMO_SEEDS.findIndex((s) => s.id === testAsmId);
    if (idx !== -1) {
      DEMO_SEEDS.splice(idx, 1);
    }
  }
});

test("applyToJob menerima dan menyimpan data pelamar tambahan (phone, location, resumeFileName, resumeUrl, coverLetterMode, coverLetterFileName)", async () => {
  const applicationInput = {
    jobId: MOCK_JOBS_FIXTURE[0].id,
    candidateName: "Rian Pratama Architect",
    candidateEmail: "rian.architect@example.com",
    phone: "081234567890",
    location: "Bandung, Jawa Barat",
    resumeFileName: "CV_Rian_Pratama.pdf",
    resumeUrl: "https://storage.example.com/resumes/cv_rian.pdf",
    coverLetterMode: "upload" as const,
    coverLetterFileName: "Surat_Lamaran_Rian.pdf",
    coverLetter: "Saya mengajukan lamaran untuk posisi Junior Web Developer.",
    portfolioUrl: "https://github.com/rian/my-portfolio",
  };

  const app = await applyToJob("candidate-test-new-fields", applicationInput);

  assert.ok(app.id);
  assert.equal(app.candidateId, "candidate-test-new-fields");
  assert.equal(app.jobId, MOCK_JOBS_FIXTURE[0].id);
  assert.equal(app.candidateName, "Rian Pratama Architect");
  assert.equal(app.candidateEmail, "rian.architect@example.com");
  assert.equal(app.phone, "081234567890");
  assert.equal(app.location, "Bandung, Jawa Barat");
  assert.equal(app.resumeFileName, "CV_Rian_Pratama.pdf");
  assert.equal(app.resumeUrl, "https://storage.example.com/resumes/cv_rian.pdf");
  assert.equal(app.coverLetterMode, "upload");
  assert.equal(app.coverLetterFileName, "Surat_Lamaran_Rian.pdf");
  assert.equal(app.coverLetter, "Saya mengajukan lamaran untuk posisi Junior Web Developer.");
  assert.equal(app.status, "pending");
  assert.ok(app.fitEvaluation);
});

test("applyToJob menerima dan menyimpan portfolioItems dinamis dengan skill tagging", async () => {
  const applicationInput = {
    jobId: MOCK_JOBS_FIXTURE[0].id,
    candidateName: "Rian Multi Portfolio",
    candidateEmail: "rian.multi@example.com",
    portfolioItems: [
      {
        id: "p1",
        title: "Proyek Next.js E-Commerce",
        url: "https://github.com/rian/nextjs-ecommerce",
        type: "github_repo" as const,
        verifiedSkills: ["Next.js", "React"],
      },
      {
        id: "p2",
        title: "Live Production Demo",
        url: "https://rian-ecommerce.vercel.app",
        type: "live_demo" as const,
        verifiedSkills: ["Tailwind CSS"],
      },
    ],
  };

  const app = await applyToJob("candidate-test-multi-portfolio", applicationInput);

  assert.ok(app.id);
  assert.equal(app.portfolioUrl, "https://github.com/rian/nextjs-ecommerce");
  assert.ok(app.portfolioItems);
  assert.equal(app.portfolioItems.length, 2);
  assert.equal(app.portfolioItems[0].title, "Proyek Next.js E-Commerce");
  assert.equal(app.portfolioItems[1].type, "live_demo");
  assert.deepEqual(app.portfolioItems[0].verifiedSkills, ["Next.js", "React"]);
});

test("applyToJob menerima portfolioItems berupa berkas unggahan (file attachment)", async () => {
  const applicationInput = {
    jobId: "10000000-0000-4000-8000-000000000001",
    candidateName: "Rian File Portfolio",
    candidateEmail: "rian.file@example.com",
    portfolioItems: [
      {
        id: "file-item-1",
        title: "Dokumen Portofolio PDF",
        attachmentMode: "file" as const,
        fileName: "portofolio-projek.pdf",
        fileSize: 1024 * 500,
        fileType: "application/pdf",
        fileData: "data:application/pdf;base64,JVBERi0xLjQK...",
        type: "certificate" as const,
        verifiedSkills: ["TypeScript", "Next.js"],
      },
    ],
  };

  const app = await applyToJob("candidate-test-file-portfolio", applicationInput);

  assert.ok(app.id);
  assert.equal(app.portfolioUrl, "portofolio-projek.pdf");
  assert.ok(app.portfolioItems);
  assert.equal(app.portfolioItems.length, 1);
  assert.equal(app.portfolioItems[0].attachmentMode, "file");
  assert.equal(app.portfolioItems[0].fileName, "portofolio-projek.pdf");
  assert.equal(app.portfolioItems[0].fileSize, 512000);
  assert.equal(app.portfolioItems[0].fileData, "data:application/pdf;base64,JVBERi0xLjQK...");
  assert.deepEqual(app.portfolioItems[0].verifiedSkills, ["TypeScript", "Next.js"]);
});

test("applyToJob menerima portfolioItems dengan berkas DAN tautan (attachmentMode: both)", async () => {
  const applicationInput = {
    jobId: "10000000-0000-4000-8000-000000000001",
    candidateName: "Rian Dual Portfolio",
    candidateEmail: "rian.dual@example.com",
    portfolioItems: [
      {
        id: "dual-item-1",
        title: "Dokumen PDF & Demo Web",
        attachmentMode: "both" as const,
        url: "https://rian-demo.vercel.app",
        fileName: "laporan-arsitektur.pdf",
        fileSize: 256000,
        fileType: "application/pdf",
        fileData: "data:application/pdf;base64,ABCD...",
        type: "live_demo" as const,
        verifiedSkills: ["React", "Next.js"],
      },
    ],
  };

  const app = await applyToJob("candidate-test-dual-portfolio", applicationInput);

  assert.ok(app.id);
  assert.equal(app.portfolioItems?.length, 1);
  assert.equal(app.portfolioItems![0].attachmentMode, "both");
  assert.equal(app.portfolioItems![0].fileName, "laporan-arsitektur.pdf");
  assert.equal(app.portfolioItems![0].url, "https://rian-demo.vercel.app");
  assert.equal(app.portfolioItems![0].fileData, "data:application/pdf;base64,ABCD...");
  assert.deepEqual(app.portfolioItems![0].verifiedSkills, ["React", "Next.js"]);
});

test("DEMO_APPLICATIONS kosong di produksi dan MOCK_APPLICATIONS_FIXTURE memuat 3 pelamar realistis dengan fitEvaluation terstruktur", () => {
  assert.equal(DEMO_APPLICATIONS.length, 0, "DEMO_APPLICATIONS harus kosong di produksi");
  assert.equal(MOCK_APPLICATIONS_FIXTURE.length, 3, "Harus memuat tepat 3 pelamar demo di fixture (Ahmad, Siti, Budi)");

  const names = MOCK_APPLICATIONS_FIXTURE.map((a) => a.candidateName);
  assert.ok(names.some((n) => n.includes("Ahmad Fauzi")));
  assert.ok(names.some((n) => n.includes("Siti Rahma")));
  assert.ok(names.some((n) => n.includes("Budi Santoso")));

  for (const app of MOCK_APPLICATIONS_FIXTURE) {
    assert.ok(app.fitEvaluation, `Pelamar ${app.candidateName} harus memiliki fitEvaluation`);
    assert.ok([0, 25, 50, 75, 100].includes(app.fitEvaluation!.score));
    assert.ok(["high", "medium", "low"].includes(app.fitEvaluation!.fitLevel));
    assert.ok(app.fitEvaluation!.matchingCriteria.length > 0);
    assert.ok(app.fitEvaluation!.missingCriteria.length > 0);
    assert.ok(app.fitEvaluation!.summary.length > 0);
    assert.ok(app.fitEvaluation!.recommendation.length > 0);
  }
});


test("getJobApplicationsForRecruiter dan getJobApplicationsForCandidate bekerja fail-safe", async () => {
  DEMO_APPLICATIONS.push(...MOCK_APPLICATIONS_FIXTURE);
  try {
    // Recruiter queries applications
    const recruiterApps = await getJobApplicationsForRecruiter("recruiter-dummy-id");
    assert.ok(Array.isArray(recruiterApps));
    assert.ok(recruiterApps.length >= 1, "Harus memuat data demo lamaran");

    // Recruiter queries specific job applications
    const jobSpecificApps = await getJobApplicationsForRecruiter(
      "recruiter-dummy-id",
      MOCK_JOBS_FIXTURE[0].id,
    );
    assert.ok(Array.isArray(jobSpecificApps));
    assert.ok(jobSpecificApps.every((a) => a.jobId === MOCK_JOBS_FIXTURE[0].id));

    // Candidate queries own applications
    const candidateApps = await getJobApplicationsForCandidate(
      "00000000-0000-4000-8000-000000000002",
    );
    assert.ok(Array.isArray(candidateApps));
    assert.ok(candidateApps.length >= 1);
    assert.equal(candidateApps[0].candidateId, "00000000-0000-4000-8000-000000000002");
  } finally {
    DEMO_APPLICATIONS.length = 0;
  }
});

test("Validasi input updateJobPosting menolak data yang tidak valid", () => {
  // recruiterId kosong
  assert.throws(
    () => validateJobPostingUpdateInput("", "job-123", { title: "New Title" }),
    /recruiterId.*wajib diisi/i,
  );

  // jobId kosong
  assert.throws(
    () => validateJobPostingUpdateInput("recruiter-1", "", { title: "New Title" }),
    /jobId.*wajib diisi/i,
  );

  // title kosong
  assert.throws(
    () => validateJobPostingUpdateInput("recruiter-1", "job-123", { title: "   " }),
    /judul lowongan.*tidak boleh kosong/i,
  );

  // field tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        field: "invalid_field" as unknown as "informatics",
      }),
    /bidang lowongan tidak valid/i,
  );

  // employmentType tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        employmentType: "invalid_type" as unknown as "fulltime",
      }),
    /tipe kerja tidak valid/i,
  );

  // workplaceType tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        workplaceType: "invalid_type" as unknown as "onsite",
      }),
    /tempat kerja tidak valid/i,
  );

  // minEducation tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        minEducation: "invalid_edu" as unknown as "smk",
      }),
    /pendidikan minimal tidak valid/i,
  );

  // experienceLevel tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        experienceLevel: "invalid_level" as unknown as "fresh_graduate",
      }),
    /tingkat pengalaman tidak valid/i,
  );

  // compensationType tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        compensationType: "crypto" as unknown as "paid",
      }),
    /tipe kompensasi tidak valid/i,
  );

  // salaryMin negatif
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        salaryMin: -500000,
      }),
    /gaji minimum tidak boleh bernilai negatif/i,
  );

  // salaryMax < salaryMin
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        salaryMin: 8000000,
        salaryMax: 4000000,
      }),
    /gaji maksimum tidak boleh lebih kecil/i,
  );

  // highlights array kosong
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        highlights: [],
      }),
    /highlights.*wajib memiliki minimal 1 poin/i,
  );

  // responsibilities array kosong
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        responsibilities: [],
      }),
    /responsibilities.*wajib diisi/i,
  );

  // requiredSkills array kosong
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        requiredSkills: [],
      }),
    /requiredskills.*wajib diisi/i,
  );

  // minSkillbridgeScore di luar rentang 0-100
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        minSkillbridgeScore: 105,
      }),
    /skor minimal skillbridge/i,
  );

  // status tidak valid
  assert.throws(
    () =>
      validateJobPostingUpdateInput("recruiter-1", "job-123", {
        status: "archived" as unknown as "active",
      }),
    /status lowongan tidak valid/i,
  );
});

test("updateJobPosting memperbarui data lowongan (judul, status, gaji) secara fail-safe", async () => {
  const recruiterId = "recruiter-test-update-user";
  const createdJob = await createJobPosting(recruiterId, "PT Maju Digital Nusantara", {
    title: "Junior Web Developer",
    field: "informatics",
    targetRole: "Junior Web Developer",
    employmentType: "fulltime",
    workplaceType: "hybrid",
    location: "Jakarta",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 5000000,
    salaryMax: 7000000,
    highlights: ["Highlight 1", "Highlight 2"],
    responsibilities: ["Tanggung jawab 1"],
    requiredSkills: ["TypeScript", "Next.js"],
    status: "active",
  });

  assert.equal(createdJob.title, "Junior Web Developer");
  assert.equal(createdJob.status, "active");
  assert.equal(createdJob.salaryMin, 5000000);
  assert.equal(createdJob.salaryMax, 7000000);

  // Update: ubah judul, status, dan rentang gaji
  const updatedJob = await updateJobPosting(recruiterId, createdJob.id, {
    title: "Mid-Level Fullstack Developer",
    status: "closed",
    salaryMin: 8000000,
    salaryMax: 12000000,
    highlights: ["Highlight baru 1", "Highlight baru 2"],
  });

  assert.equal(updatedJob.id, createdJob.id);
  assert.equal(updatedJob.title, "Mid-Level Fullstack Developer");
  assert.equal(updatedJob.status, "closed");
  assert.equal(updatedJob.salaryMin, 8000000);
  assert.equal(updatedJob.salaryMax, 12000000);
  assert.deepEqual(updatedJob.highlights, ["Highlight baru 1", "Highlight baru 2"]);
  assert.ok(updatedJob.updatedAt, "updatedAt harus tercatat");
  // Pastikan field lain yang tidak diubah tetap dipertahankan
  assert.equal(updatedJob.field, "informatics");
  assert.equal(updatedJob.companyName, "PT Maju Digital Nusantara");

  // Verifikasi lewat getJobPostingById
  const retrieved = await getJobPostingById(createdJob.id);
  assert.ok(retrieved !== null);
  assert.equal(retrieved?.title, "Mid-Level Fullstack Developer");
  assert.equal(retrieved?.status, "closed");
  assert.equal(retrieved?.salaryMin, 8000000);
  assert.equal(retrieved?.salaryMax, 12000000);
});

test("updateJobPosting memperbarui demo job secara fail-safe", async () => {
  // Demo job ke-2 (Desain)
  const demoTargetId = MOCK_JOBS_FIXTURE[1].id;
  const originalTitle = MOCK_JOBS_FIXTURE[1].title;
  const originalSalaryMin = MOCK_JOBS_FIXTURE[1].salaryMin;
  const originalSalaryMax = MOCK_JOBS_FIXTURE[1].salaryMax;

  const updatedDemo = await updateJobPosting("any-recruiter-id", demoTargetId, {
    title: "Senior Graphic & Brand Identity Designer",
    status: "closed",
    salaryMin: 8000000,
    salaryMax: 12000000,
  });

  assert.equal(updatedDemo.id, demoTargetId);
  assert.equal(updatedDemo.title, "Senior Graphic & Brand Identity Designer");
  assert.equal(updatedDemo.status, "closed");
  assert.equal(updatedDemo.salaryMin, 8000000);
  assert.equal(updatedDemo.salaryMax, 12000000);

  const foundDemo = await getJobPostingById(demoTargetId);
  assert.ok(foundDemo !== null);
  assert.equal(foundDemo?.title, "Senior Graphic & Brand Identity Designer");
  assert.equal(foundDemo?.status, "closed");

  // Restore original state for demo clean state
  await updateJobPosting("any-recruiter-id", demoTargetId, {
    title: originalTitle,
    status: "active",
    salaryMin: originalSalaryMin,
    salaryMax: originalSalaryMax,
  });
});

test("deleteJobPosting menghapus lowongan dan memastikannya hilang dari daftar dan detail", async () => {
  const recruiterId = "recruiter-test-delete-user";
  const createdJob = await createJobPosting(recruiterId, "PT Solusi Hapus Mandiri", {
    title: "Lowongan Sementara untuk Pengujian Delete",
    field: "marketing",
    targetRole: "Junior Digital Marketer",
    employmentType: "internship",
    workplaceType: "remote",
    location: "Remote",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 3000000,
    salaryMax: 4000000,
    highlights: ["Highlight 1"],
    responsibilities: ["Tanggung jawab 1"],
    requiredSkills: ["Marketing"],
    status: "active",
  });

  // Pastikan ada sebelum dihapus
  const beforeDelete = await getJobPostingById(createdJob.id);
  assert.ok(beforeDelete !== null);
  const listBefore = await getJobPostings({ status: "all" });
  assert.ok(listBefore.some((j) => j.id === createdJob.id));

  // Hapus lowongan
  const deleteResult = await deleteJobPosting(recruiterId, createdJob.id);
  assert.equal(deleteResult, true, "deleteJobPosting harus mengembalikan true");

  // Pastikan tidak ditemukan lagi di detail
  const afterDelete = await getJobPostingById(createdJob.id);
  assert.equal(afterDelete, null, "Lowongan yang dihapus harus mengembalikan null pada getJobPostingById");

  // Pastikan tidak ada lagi di daftar lowongan
  const listAfter = await getJobPostings({ status: "all" });
  assert.ok(
    !listAfter.some((j) => j.id === createdJob.id),
    "Lowongan yang dihapus tidak boleh muncul di daftar getJobPostings",
  );
});

test("deleteJobPosting memvalidasi input dan bekerja fail-safe saat table missing atau demo job", async () => {
  // Validasi recruiterId kosong
  await assert.rejects(
    async () => deleteJobPosting("", "job-id"),
    /recruiterId.*wajib diisi/i,
  );

  // Validasi jobId kosong
  await assert.rejects(
    async () => deleteJobPosting("recruiter-id", ""),
    /jobId.*wajib diisi/i,
  );

  // Hapus lowongan fiktif saat table missing / fail-safe
  const nonExistentResult = await deleteJobPosting(
    "recruiter-id",
    "00000000-0000-0000-0000-000000000999",
  );
  assert.equal(nonExistentResult, true);
});

test("parseDeletedJobsCookie mem-parse cookie skillbridge_deleted_jobs secara akurat", () => {
  // Null / undefined / empty
  assert.deepEqual(parseDeletedJobsCookie(null), []);
  assert.deepEqual(parseDeletedJobsCookie(undefined), []);
  assert.deepEqual(parseDeletedJobsCookie(""), []);
  assert.deepEqual(parseDeletedJobsCookie("unrelated_cookie=test_value"), []);

  // Valid cookie tunggal
  const single = `skillbridge_deleted_jobs=${encodeURIComponent(JSON.stringify(["job-123"]))}`;
  assert.deepEqual(parseDeletedJobsCookie(single), ["job-123"]);

  // Valid cookie banyak id di antara cookie lain
  const multipleIds = ["job-1", "job-2", "job-3"];
  const multiCookie = `session=abc; skillbridge_deleted_jobs=${encodeURIComponent(
    JSON.stringify(multipleIds),
  )}; token=xyz`;
  assert.deepEqual(parseDeletedJobsCookie(multiCookie), multipleIds);

  // Cookie dengan JSON tidak valid tidak melempar exception
  assert.deepEqual(
    parseDeletedJobsCookie("skillbridge_deleted_jobs=not-a-valid-json"),
    [],
  );
});

test("getJobPostings dan getJobPostingById menghormati filter deletedIds", async () => {
  const job1 = await createJobPosting("recruiter-del-test-1", "PT Alpha Filter", {
    title: "Job Alpha Filter",
    field: "informatics",
    targetRole: "Junior Web Developer",
    employmentType: "fulltime",
    workplaceType: "hybrid",
    location: "Jakarta",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 5000000,
    salaryMax: 7000000,
    highlights: ["H1", "H2", "H3"],
    responsibilities: ["R1"],
    requiredSkills: ["S1"],
  });
  const job2 = await createJobPosting("recruiter-del-test-2", "PT Beta Filter", {
    title: "Job Beta Filter",
    field: "design",
    targetRole: "Junior Graphic Designer",
    employmentType: "fulltime",
    workplaceType: "onsite",
    location: "Bandung",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 4000000,
    salaryMax: 6000000,
    highlights: ["H1", "H2", "H3"],
    responsibilities: ["R1"],
    requiredSkills: ["S1"],
  });

  const jobsBefore = await getJobPostings();
  assert.ok(jobsBefore.length >= 2, "Harus ada lowongan awal");

  const targetJobId = job1.id;
  const otherJobId = job2.id;

  // getJobPostings dengan deletedIds menyaring targetJobId
  const jobsFiltered = await getJobPostings({ deletedIds: [targetJobId] });
  assert.ok(
    !jobsFiltered.some((j) => j.id === targetJobId),
    "Lowongan pada deletedIds tidak boleh muncul di daftar getJobPostings",
  );
  assert.ok(
    jobsFiltered.some((j) => j.id === otherJobId),
    "Lowongan lain yang tidak dihapus harus tetap muncul",
  );

  // getJobPostingById dengan deletedIds mengembalikan null jika id ada di deletedIds
  const jobFoundWithoutFilter = await getJobPostingById(targetJobId);
  if (jobFoundWithoutFilter) {
    const jobFoundWithFilter = await getJobPostingById(targetJobId, {
      deletedIds: [targetJobId],
    });
    assert.equal(
      jobFoundWithFilter,
      null,
      "getJobPostingById harus mengembalikan null bila id ada di options.deletedIds",
    );
  }

  // getJobPostingById dengan id lain tetap mengembalikan posting
  const otherFound = await getJobPostingById(otherJobId, {
    deletedIds: [targetJobId],
  });
  assert.ok(otherFound !== null);
  assert.equal(otherFound?.id, otherJobId);
});

test("getJobPostings bekerja fail-safe dengan recruiterId dan deletedIds", async () => {
  const jobs = await getJobPostings({
    recruiterId: "unregistered-recruiter-id-001",
    deletedIds: ["dummy-deleted-uuid-999"],
  });
  assert.ok(Array.isArray(jobs));
  assert.ok(!jobs.some((j) => j.id === "dummy-deleted-uuid-999"));
});

test("pelamar dari lowongan yang dihapus tidak muncul di getJobApplicationsForRecruiter", async () => {
  const recruiterId = "recruiter-test-deleted-apps";
  const dummyJobId = "job-deleted-test-uuid-001";
  const dummyAppId = "app-deleted-test-uuid-001";

  const testApp: JobApplication = {
    id: dummyAppId,
    jobId: dummyJobId,
    candidateId: "cand-test-uuid-001",
    candidateName: "Kandidat Lowongan Dihapus",
    candidateEmail: "deleted.job.applicant@test.com",
    status: "pending",
    appliedAt: "2026-09-01T10:00:00Z",
    jobTitle: "Role Yang Dihapus",
    companyName: "PT Hapus Lowongan",
    isDemo: true,
  };

  DEMO_APPLICATIONS.push(testApp);

  try {
    // Sebelum lowongan dihapus, lamaran harus muncul di daftar lamaran recruiter
    const appsBefore = await getJobApplicationsForRecruiter(recruiterId);
    assert.ok(
      appsBefore.some((a) => a.id === dummyAppId),
      "Lamaran harus muncul sebelum lowongan dihapus",
    );

    // Hapus lowongan via deleteJobPosting
    await deleteJobPosting(recruiterId, dummyJobId);

    // Setelah lowongan dihapus, lamaran tidak boleh muncul di daftar umum maupun spesifik
    const appsAfter = await getJobApplicationsForRecruiter(recruiterId);
    assert.ok(
      !appsAfter.some((a) => a.id === dummyAppId),
      "Lamaran dari lowongan yang dihapus tidak boleh muncul di getJobApplicationsForRecruiter",
    );
    assert.ok(
      !appsAfter.some((a) => a.jobId === dummyJobId),
      "Tidak boleh ada lamaran dari jobId yang telah dihapus",
    );

    const appsSpecific = await getJobApplicationsForRecruiter(recruiterId, dummyJobId);
    assert.equal(
      appsSpecific.length,
      0,
      "Pencarian lamaran dengan jobId yang dihapus harus menghasilkan array kosong",
    );
  } finally {
    const idx = DEMO_APPLICATIONS.findIndex((a) => a.id === dummyAppId);
    if (idx !== -1) {
      DEMO_APPLICATIONS.splice(idx, 1);
    }
  }
});

test("getJobApplicationsForRecruiter menyaring deleted_job_ids dan deleted_application_ids dari user_metadata recruiter", async () => {
  const testRecruiterId = "00000000-0000-4000-8000-000000000088";
  const deletedJobId = "10000000-0000-4000-8000-000000000002";
  const deletedAppId = "20000000-0000-4000-8000-000000000003";

  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  globalThis.fetch = async (url) => {
    if (url.toString().includes("/auth/v1/admin/users/")) {
      return new Response(
        JSON.stringify({
          id: testRecruiterId,
          user_metadata: {
            deleted_job_ids: [deletedJobId],
            deleted_application_ids: [deletedAppId],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const apps = await getJobApplicationsForRecruiter(testRecruiterId);
    assert.ok(
      !apps.some((a) => a.jobId === deletedJobId),
      "Lamaran dari lowongan dalam deleted_job_ids tidak boleh muncul",
    );
    assert.ok(
      !apps.some((a) => a.id === deletedAppId),
      "Lamaran dalam deleted_application_ids tidak boleh muncul",
    );
  } finally {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});

test("updateApplicationStatus memvalidasi input dan memperbarui status pelamar secara fail-safe", async () => {
  const recruiterId = "recruiter-status-test";

  // 1. Invalid status rejection
  await assert.rejects(
    () =>
      // @ts-expect-error - testing invalid status
      updateApplicationStatus(recruiterId, "app-123", "invalid_status"),
    /Status lamaran tidak valid/,
  );

  // 2. Create a test job and application
  const testJob = await createJobPosting(recruiterId, "PT Test QA", {
    title: "QA Engineer Status Test",
    field: "informatics",
    targetRole: "Junior Web Developer",
    employmentType: "fulltime",
    workplaceType: "onsite",
    location: "Bandung",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 5000000,
    salaryMax: 7000000,
    showSalary: true,
    benefits: ["BPJS"],
    highlights: ["QA Automation"],
    description: "Mencari QA",
    responsibilities: ["Testing"],
    requiredSkills: ["Testing"],
    minSkillbridgeScore: 50,
  });

  const testApp = await applyToJob("candidate-status-test", {
    jobId: testJob.id,
    candidateName: "Kandidat Status Test",
    candidateEmail: "candidate@statustest.com",
    phone: "+62 81234567890",
    location: "Bandung, Jawa Barat",
    resumeFileName: "CV_Kandidat_Test.pdf",
    coverLetterMode: "write",
    coverLetter: "Saya berminat posisi QA ini.",
  });

  assert.equal(testApp.status, "pending");
  assert.equal(testApp.phone, "+62 81234567890");
  assert.equal(testApp.location, "Bandung, Jawa Barat");
  assert.equal(testApp.resumeFileName, "CV_Kandidat_Test.pdf");

  // 3. Update status to shortlisted
  const updated1 = await updateApplicationStatus(recruiterId, testApp.id, "shortlisted");
  assert.equal(updated1.status, "shortlisted");

  // 4. Update status to accepted
  const updated2 = await updateApplicationStatus(recruiterId, testApp.id, "accepted");
  assert.equal(updated2.status, "accepted");

  // 5. Update status to rejected
  const updated3 = await updateApplicationStatus(recruiterId, testApp.id, "rejected");
  assert.equal(updated3.status, "rejected");
});

test("Isolasi data antar-recruiter: HR hanya dapat melihat dan mengelola lamaran pada lowongan miliknya", async () => {
  const recruiterAlpha = "recruiter-iso-alpha-101";
  const recruiterBeta = "recruiter-iso-beta-202";

  // Recruiter Alpha membuat Job Alpha
  const jobAlpha = await createJobPosting(recruiterAlpha, "PT Alpha Tech", {
    title: "Web Developer Alpha",
    field: "informatics",
    targetRole: "Junior Web Developer",
    employmentType: "fulltime",
    workplaceType: "hybrid",
    location: "Jakarta",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 5000000,
    salaryMax: 7000000,
    highlights: ["Alpha 1", "Alpha 2", "Alpha 3"],
    responsibilities: ["Coding"],
    requiredSkills: ["TypeScript"],
  });

  // Recruiter Beta membuat Job Beta
  const jobBeta = await createJobPosting(recruiterBeta, "PT Beta Solusi", {
    title: "Graphic Designer Beta",
    field: "design",
    targetRole: "Junior Graphic Designer",
    employmentType: "fulltime",
    workplaceType: "onsite",
    location: "Bandung",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 4500000,
    salaryMax: 6000000,
    highlights: ["Beta 1", "Beta 2", "Beta 3"],
    responsibilities: ["Designing"],
    requiredSkills: ["Figma"],
  });

  // Kandidat 1 melamar ke Job Alpha
  const appAlpha = await applyToJob("candidate-iso-1", {
    jobId: jobAlpha.id,
    candidateName: "Kandidat Alpha",
    candidateEmail: "candidate.alpha@example.com",
    coverLetter: "Melamar ke PT Alpha Tech",
  });

  // Kandidat 2 melamar ke Job Beta
  const appBeta = await applyToJob("candidate-iso-2", {
    jobId: jobBeta.id,
    candidateName: "Kandidat Beta",
    candidateEmail: "candidate.beta@example.com",
    coverLetter: "Melamar ke PT Beta Solusi",
  });

  // 1. Recruiter Alpha hanya melihat appAlpha, TIDAK melihat appBeta
  const appsAlpha = await getJobApplicationsForRecruiter(recruiterAlpha);
  assert.ok(appsAlpha.some((a) => a.id === appAlpha.id), "Recruiter Alpha harus melihat appAlpha");
  assert.ok(!appsAlpha.some((a) => a.id === appBeta.id), "Recruiter Alpha TIDAK boleh melihat appBeta milik Recruiter Beta");

  // 2. Recruiter Beta hanya melihat appBeta, TIDAK melihat appAlpha
  const appsBeta = await getJobApplicationsForRecruiter(recruiterBeta);
  assert.ok(appsBeta.some((a) => a.id === appBeta.id), "Recruiter Beta harus melihat appBeta");
  assert.ok(!appsBeta.some((a) => a.id === appAlpha.id), "Recruiter Beta TIDAK boleh melihat appAlpha milik Recruiter Alpha");

  // 3. Recruiter Beta mencoba memfilter dengan jobId milik Alpha -> harus kosong (akses ditolak / tidak bocor)
  const leakAttempt = await getJobApplicationsForRecruiter(recruiterBeta, jobAlpha.id);
  assert.equal(leakAttempt.length, 0, "Recruiter Beta tidak boleh melihat lamaran pada lowongan milik Recruiter Alpha");

  // 4. Recruiter Beta mencoba mengubah status appAlpha milik Alpha -> harus ditolak
  await assert.rejects(
    () => updateApplicationStatus(recruiterBeta, appAlpha.id, "shortlisted"),
    /tidak memiliki akses|tidak ditemukan/i,
    "Recruiter Beta tidak boleh mengubah status lamaran milik lowongan Recruiter Alpha",
  );

  // 5. Recruiter Alpha berhasil mengubah status appAlpha
  const updatedAlpha = await updateApplicationStatus(recruiterAlpha, appAlpha.id, "shortlisted");
  assert.equal(updatedAlpha.status, "shortlisted");
});

test("Persistensi cloud Supabase Auth Metadata: data pelamar tetap ada setelah serverless restart / cold start tanpa tabel DB", async () => {
  const testRecruiterId = "00000000-0000-4000-8000-000000000777";
  const testCandidateId = "00000000-0000-4000-8000-000000000778";
  const testJobId = "10000000-0000-4000-8000-000000000779";

  // Simulasi mock storage auth metadata user
  const userMetadataStore: Record<string, Record<string, unknown>> = {
    [testRecruiterId]: {
      custom_jobs: [
        {
          id: testJobId,
          recruiterId: testRecruiterId,
          title: "Cloud Software Engineer",
          companyName: "PT Cloud Persistindo",
          field: "informatics",
          targetRole: "Junior Web Developer",
          employmentType: "fulltime",
          workplaceType: "remote",
          location: "Jakarta",
          minEducation: "smk",
          experienceLevel: "fresh_graduate",
          compensationType: "paid",
          salaryMin: 6000000,
          salaryMax: 8000000,
          showSalary: true,
          benefits: [],
          highlights: ["H1", "H2", "H3"],
          responsibilities: ["R1"],
          requiredSkills: ["Next.js"],
          acceptedEvidenceTypes: ["github"],
          minSkillbridgeScore: 60,
          status: "active",
          createdAt: new Date().toISOString(),
          isDemo: false,
        },
      ],
      job_applications: [],
    },
    [testCandidateId]: {
      my_applications: [],
    },
  };

  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  globalThis.fetch = async (url, init) => {
    const urlStr = url.toString();
    // Supabase Auth Admin: /auth/v1/admin/users
    if (urlStr.includes("/auth/v1/admin/users")) {
      // listUsers endpoint
      if (urlStr.includes("?") && !urlStr.match(/\/auth\/v1\/admin\/users\/[0-9a-f-]{36}/i)) {
        return new Response(
          JSON.stringify({
            users: Object.entries(userMetadataStore).map(([id, meta]) => ({
              id,
              user_metadata: meta,
            })),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // getUserById / updateUserById endpoint: /auth/v1/admin/users/:id
      const parts = urlStr.split("/");
      const targetUserId = parts[parts.length - 1]?.split("?")[0];
      const method = init?.method || "GET";

      if (method === "PUT") {
        const body = JSON.parse(init?.body as string);
        if (body.user_metadata) {
          userMetadataStore[targetUserId] = {
            ...(userMetadataStore[targetUserId] || {}),
            ...body.user_metadata,
          };
        }
        return new Response(
          JSON.stringify({
            id: targetUserId,
            user_metadata: userMetadataStore[targetUserId] || {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          id: targetUserId,
          user_metadata: userMetadataStore[targetUserId] || {},
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // DB query mengembalikan error (tabel job_applications belum ada / PGRST204)
    return new Response(
      JSON.stringify({ code: "PGRST204", message: "relation public.job_applications does not exist" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    // 1. Kandidat melamar ke lowongan cloud
    const application = await applyToJob(testCandidateId, {
      jobId: testJobId,
      candidateName: "Kandidat Cloud",
      candidateEmail: "candidate.cloud@example.com",
      coverLetter: "Lamaran persisten cloud.",
    });

    assert.ok(application.id);
    assert.equal(application.status, "pending");

    // 2. SIMULASI COLD START / SERVERLESS INSTANCE BERBEDA
    // Kosongkan seluruh memori serverless!
    resetInMemoryApplicationsForTesting();

    // 3. HR membuka dashboard di instance serverless baru (memori kosong)
    const recruiterApps = await getJobApplicationsForRecruiter(testRecruiterId);
    assert.equal(recruiterApps.length, 1, "Lamaran harus tetap ada di serverless instance baru melalui Supabase Auth metadata");
    assert.equal(recruiterApps[0].id, application.id);
    assert.equal(recruiterApps[0].candidateName, "Kandidat Cloud");
    assert.equal(recruiterApps[0].status, "pending");

    // 4. Kandidat membuka halaman riwayat di instance serverless baru (memori kosong)
    resetInMemoryApplicationsForTesting();
    const candidateApps = await getJobApplicationsForCandidate(testCandidateId);
    assert.equal(candidateApps.length, 1, "Kandidat harus tetap melihat lamaran melalui metadata my_applications");
    assert.equal(candidateApps[0].id, application.id);

    // 5. HR mengubah status lamaran menjadi 'accepted'
    const updated = await updateApplicationStatus(testRecruiterId, application.id, "accepted");
    assert.equal(updated.status, "accepted");

    // 6. SIMULASI COLD START KEDUA
    resetInMemoryApplicationsForTesting();

    // HR mengecek kembali status di cold instance
    const recruiterAppsAfter = await getJobApplicationsForRecruiter(testRecruiterId);
    assert.equal(recruiterAppsAfter[0].status, "accepted", "Status yang diubah harus tersimpan persisten di metadata recruiter");

    // Kandidat mengecek status di cold instance
    const candidateAppsAfter = await getJobApplicationsForCandidate(testCandidateId);
    assert.equal(candidateAppsAfter[0].status, "accepted", "Status yang diubah harus tersimpan persisten di metadata kandidat");
  } finally {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});

test("Helper fungsi persistensi: saveApplicationToRecruiterMetadata dan updateApplicationStatusInRecruiterMetadata", async () => {
  const dummyRecruiterId = "00000000-0000-4000-8000-000000000999";
  let storedMeta: Record<string, unknown> = {};

  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  globalThis.fetch = async (url, init) => {
    const method = init?.method || "GET";
    if (method === "PUT") {
      const body = JSON.parse(init?.body as string);
      storedMeta = { ...storedMeta, ...body.user_metadata };
      return new Response(
        JSON.stringify({ id: dummyRecruiterId, user_metadata: storedMeta }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ id: dummyRecruiterId, user_metadata: storedMeta }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const sampleApp: JobApplication = {
      id: "app-helper-001",
      jobId: "job-helper-001",
      candidateId: "cand-helper-001",
      candidateName: "Budi Helper",
      candidateEmail: "budi@helper.test",
      status: "pending",
      appliedAt: new Date().toISOString(),
    };

    // Simpan lamaran via helper
    await saveApplicationToRecruiterMetadata(dummyRecruiterId, sampleApp);
    const savedApps = (storedMeta.job_applications || []) as JobApplication[];
    assert.equal(savedApps.length, 1);
    assert.equal(savedApps[0].id, "app-helper-001");
    assert.equal(savedApps[0].status, "pending");

    // Perbarui status via helper
    await updateApplicationStatusInRecruiterMetadata(dummyRecruiterId, "app-helper-001", "shortlisted");
    const updatedApps = (storedMeta.job_applications || []) as JobApplication[];
    assert.equal(updatedApps[0].status, "shortlisted");
  } finally {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});

test("applyToJob dengan berkas lampiran besar (1.5MB) berhasil disimpan ke metadata tanpa error body too large (GoTrue 1MB limit)", async () => {
  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  const testRecruiterId = "10000000-0000-4000-8000-000000000888";
  const testCandidateId = "20000000-0000-4000-8000-000000000888";
  const testJobId = "30000000-0000-4000-8000-000000000888";

  const userMetadataStore: Record<string, Record<string, unknown>> = {
    [testRecruiterId]: {
      custom_jobs: [
        {
          id: testJobId,
          title: "Senior Full-Stack Engineer",
          companyName: "Perusahaan Storage Cloud",
          field: "informatics",
          targetRole: "Senior Engineer",
          recruiterId: testRecruiterId,
          status: "active",
        },
      ],
      job_applications: [],
    },
    [testCandidateId]: {
      my_applications: [],
    },
  };

  let storageUploadCalled = false;
  let maxPutBodySize = 0;

  globalThis.fetch = async (url, init) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    const method = init?.method || "GET";

    // 1. Mock Supabase Storage upload
    if (urlStr.includes("/storage/v1/object/evidence-private/")) {
      storageUploadCalled = true;
      return new Response(
        JSON.stringify({ Key: "evidence-private/applications/test.pdf" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Mock Supabase Storage signed URL
    if (urlStr.includes("/storage/v1/object/sign/evidence-private/")) {
      return new Response(
        JSON.stringify({
          signedURL: "/storage/v1/object/sign/evidence-private/applications/test.pdf?token=valid_token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Mock Supabase Auth Admin users endpoint
    if (urlStr.includes("/auth/v1/admin/users")) {
      if (urlStr.endsWith("/auth/v1/admin/users") || urlStr.includes("/auth/v1/admin/users?")) {
        return new Response(
          JSON.stringify({
            users: Object.entries(userMetadataStore).map(([id, meta]) => ({
              id,
              user_metadata: meta,
            })),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const parts = urlStr.split("/");
      const targetUserId = parts[parts.length - 1]?.split("?")[0];

      if (method === "PUT") {
        const rawBody = typeof init?.body === "string" ? init.body : "";
        const bodyLength = Buffer.byteLength(rawBody, "utf-8");
        if (bodyLength > maxPutBodySize) {
          maxPutBodySize = bodyLength;
        }

        // SIMULASI BATASAN KETAT GOTRUE: 1MB (1048576 bytes)
        if (bodyLength > 1048576) {
          return new Response(
            JSON.stringify({
              code: 413,
              message: "Request body too large (max 1048576 bytes)",
            }),
            { status: 413, headers: { "Content-Type": "application/json" } },
          );
        }

        const body = JSON.parse(rawBody);
        if (body.user_metadata) {
          userMetadataStore[targetUserId] = {
            ...(userMetadataStore[targetUserId] || {}),
            ...body.user_metadata,
          };
        }
        return new Response(
          JSON.stringify({
            id: targetUserId,
            user_metadata: userMetadataStore[targetUserId] || {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          id: targetUserId,
          user_metadata: userMetadataStore[targetUserId] || {},
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // DB PGRST204
    return new Response(
      JSON.stringify({ code: "PGRST204", message: "relation public.job_applications does not exist" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    resetInMemoryApplicationsForTesting();

    // Buat berkas base64 besar: 1.5MB (> 1MB batas GoTrue)
    const largeBase64 = "data:application/pdf;base64," + "A".repeat(1500000);
    const largePhoto = "data:image/jpeg;base64," + "B".repeat(50000); // 50KB

    const application = await applyToJob(testCandidateId, {
      jobId: testJobId,
      candidateName: "Kandidat Portofolio Besar",
      candidateEmail: "besar@example.com",
      photoUrl: largePhoto,
      portfolioItems: [
        {
          id: "item-large-1",
          title: "Portofolio Raksasa",
          attachmentMode: "file",
          fileName: "portofolio_besar.pdf",
          fileSize: 1500000,
          fileType: "application/pdf",
          fileData: largeBase64,
          type: "case_study",
          verifiedSkills: ["Architecture", "Next.js"],
        },
      ],
    });

    assert.ok(application.id);
    assert.ok(storageUploadCalled, "Supabase Storage upload harus dipanggil");
    assert.ok(application.portfolioItems);
    assert.equal(application.portfolioItems.length, 1);
    assert.ok(application.portfolioItems[0].storagePath?.includes("0_portofolio_besar.pdf"));
    assert.ok(application.portfolioItems[0].url?.includes("valid_token"));
    // Di in-memory, fileData tetap dipertahankan
    assert.equal(application.portfolioItems[0].fileData, largeBase64);

    // Di metadata Supabase GoTrue, ukuran request body PUT jauh di bawah 1MB
    assert.ok(maxPutBodySize < 20000, `Ukuran request body PUT (${maxPutBodySize} bytes) harus jauh di bawah 1MB`);

    // Periksa bahwa metadata recruiter dan kandidat benar-benar tersimpan (tidak terlempar error 413)
    const recruiterSaved = (userMetadataStore[testRecruiterId].job_applications || []) as JobApplication[];
    assert.equal(recruiterSaved.length, 1, "Lamaran harus tersimpan di user_metadata recruiter");
    assert.equal(recruiterSaved[0].id, application.id);
    // fileData harus dibuang dari metadata
    assert.equal(recruiterSaved[0].portfolioItems?.[0].fileData, undefined);
    assert.ok(recruiterSaved[0].portfolioItems?.[0].storagePath);
    // photoUrl besar harus dipangkas dari metadata
    assert.equal(recruiterSaved[0].photoUrl, undefined);

    const candidateSaved = (userMetadataStore[testCandidateId].my_applications || []) as JobApplication[];
    assert.equal(candidateSaved.length, 1, "Lamaran harus tersimpan di user_metadata kandidat");
    assert.equal(candidateSaved[0].portfolioItems?.[0].fileData, undefined);

    // SIMULASI COLD START / SERVERLESS RESTART
    resetInMemoryApplicationsForTesting();

    const recruiterApps = await getJobApplicationsForRecruiter(testRecruiterId);
    assert.equal(recruiterApps.length, 1, "Lamaran tidak boleh hilang setelah cold start");
    assert.equal(recruiterApps[0].id, application.id);
    assert.ok(recruiterApps[0].portfolioItems?.[0].storagePath);
    assert.ok(recruiterApps[0].portfolioItems?.[0].url);

    const candidateApps = await getJobApplicationsForCandidate(testCandidateId);
    assert.equal(candidateApps.length, 1, "Kandidat tetap dapat melihat lamaran");
    assert.equal(candidateApps[0].id, application.id);
  } finally {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});

test("sanitizeApplicationForMetadata membuang fileData dan memangkas photoUrl besar namun mempertahankan field lainnya", () => {
  const sampleApp: JobApplication = {
    id: "app-sanitize-01",
    jobId: "job-sanitize-01",
    candidateId: "cand-sanitize-01",
    candidateName: "Sanitize Test",
    candidateEmail: "sanitize@test.com",
    photoUrl: "data:image/png;base64," + "X".repeat(20000), // > 10KB
    status: "pending",
    appliedAt: "2026-09-19T00:00:00Z",
    portfolioItems: [
      {
        id: "p1",
        title: "Proyek Keren",
        storagePath: "applications/app-sanitize-01/0_proyek.pdf",
        url: "https://example.com/signed.pdf",
        fileName: "proyek.pdf",
        fileSize: 102400,
        fileType: "application/pdf",
        fileData: "data:application/pdf;base64,JVBERi0xLjQK...",
        type: "certificate",
        verifiedSkills: ["React", "TypeScript"],
      },
    ],
  };

  const sanitized = sanitizeApplicationForMetadata(sampleApp);

  // fileData harus dibuang
  assert.equal(sanitized.portfolioItems?.[0].fileData, undefined);
  // storagePath, url, fileName, fileSize, fileType, verifiedSkills harus tetap ada
  assert.equal(sanitized.portfolioItems?.[0].storagePath, "applications/app-sanitize-01/0_proyek.pdf");
  assert.equal(sanitized.portfolioItems?.[0].url, "https://example.com/signed.pdf");
  assert.equal(sanitized.portfolioItems?.[0].fileName, "proyek.pdf");
  assert.equal(sanitized.portfolioItems?.[0].fileSize, 102400);
  assert.equal(sanitized.portfolioItems?.[0].fileType, "application/pdf");
  assert.deepEqual(sanitized.portfolioItems?.[0].verifiedSkills, ["React", "TypeScript"]);
  // photoUrl > 10KB harus dipangkas
  assert.equal(sanitized.photoUrl, undefined);

  // Jika photoUrl berupa URL biasa atau <10KB, harus dipertahankan
  const normalPhotoApp = sanitizeApplicationForMetadata({
    ...sampleApp,
    photoUrl: "https://cdn.example.com/photo.jpg",
  });
  assert.equal(normalPhotoApp.photoUrl, "https://cdn.example.com/photo.jpg");
});

test("isSignedUrlExpiring mendeteksi URL kedaluwarsa atau mendekati kedaluwarsa secara akurat", () => {
  assert.equal(isSignedUrlExpiring(undefined), true);
  assert.equal(isSignedUrlExpiring(""), true);

  // JWT kedaluwarsa di masa lalu
  const pastExp = Math.floor(Date.now() / 1000) - 3600;
  const tokenPast =
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify({ exp: pastExp })).toString("base64url") +
    ".sig";
  assert.equal(isSignedUrlExpiring(`https://test.supabase.co/storage/v1/object/sign/ev/f.pdf?token=${tokenPast}`), true);

  // JWT kedaluwarsa dalam 10 menit (< 60 menit)
  const soonExp = Math.floor(Date.now() / 1000) + 600;
  const tokenSoon =
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify({ exp: soonExp })).toString("base64url") +
    ".sig";
  assert.equal(isSignedUrlExpiring(`https://test.supabase.co/storage/v1/object/sign/ev/f.pdf?token=${tokenSoon}`), true);

  // JWT berlaku 6 hari ke depan (> 60 menit)
  const futureExp = Math.floor(Date.now() / 1000) + 6 * 24 * 3600;
  const tokenFuture =
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify({ exp: futureExp })).toString("base64url") +
    ".sig";
  assert.equal(isSignedUrlExpiring(`https://test.supabase.co/storage/v1/object/sign/ev/f.pdf?token=${tokenFuture}`), false);

  // Tautan publik biasa (bukan signed url bertoken)
  assert.equal(isSignedUrlExpiring("https://github.com/skillbridge/portfolio"), false);
});

test("mergeApplicationDetails mempertahankan data paling lengkap (fileData dari in-memory)", () => {
  const metadataApp: JobApplication = {
    id: "merge-app-01",
    jobId: "merge-job-01",
    candidateId: "merge-cand-01",
    candidateName: "Budi Merge",
    candidateEmail: "budi@merge.com",
    status: "shortlisted", // diperbarui di metadata
    appliedAt: "2026-09-19T10:00:00Z",
    portfolioItems: [
      {
        id: "p-01",
        title: "Dokumen CV",
        storagePath: "applications/merge-app-01/0_cv.pdf",
        url: "https://storage.supabase.co/new-signed-url",
        type: "certificate",
      },
    ],
  };

  const inMemApp: JobApplication = {
    ...metadataApp,
    status: "pending", // status lama di memori
    portfolioItems: [
      {
        id: "p-01",
        title: "Dokumen CV",
        fileData: "data:application/pdf;base64,ORIGINAL_RAW_DATA",
        type: "certificate",
      },
    ],
  };

  const merged = mergeApplicationDetails(metadataApp, inMemApp);

  // Status baru dari metadata dipertahankan
  assert.equal(merged.status, "shortlisted");
  // storagePath dan url baru dari metadata dipertahankan
  assert.equal(merged.portfolioItems?.[0].storagePath, "applications/merge-app-01/0_cv.pdf");
  assert.equal(merged.portfolioItems?.[0].url, "https://storage.supabase.co/new-signed-url");
  // fileData lengkap dari in-memory berhasil dipertahankan!
  assert.equal(merged.portfolioItems?.[0].fileData, "data:application/pdf;base64,ORIGINAL_RAW_DATA");
});

test("uploadApplicationFileToStorage mengunggah berkas base64 dan fail-safe", async () => {
  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  let uploadedPath = "";
  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes("/storage/v1/object/evidence-private/")) {
      uploadedPath = urlStr;
      return new Response(JSON.stringify({ Key: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (urlStr.includes("/storage/v1/object/sign/evidence-private/")) {
      return new Response(JSON.stringify({ signedURL: "/object/sign/evidence-private/item.pdf?token=123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  try {
    const res = await uploadApplicationFileToStorage(
      "test-app-id",
      0,
      "my portfolio.pdf",
      "application/pdf",
      "data:application/pdf;base64,SGVsbG8gV29ybGQ=",
    );
    assert.ok(res);
    assert.equal(res.storagePath, "applications/test-app-id/0_my_portfolio.pdf");
    assert.ok(res.url.includes("/object/sign/evidence-private/item.pdf?token=123"));
    assert.ok(uploadedPath.includes("0_my_portfolio.pdf"));

    // Fail-safe ketika input tidak valid atau kosong
    const emptyRes = await uploadApplicationFileToStorage("", 0, "", "", "");
    assert.equal(emptyRes, null);
  } finally {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});




