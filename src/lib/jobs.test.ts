import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_JOBS,
  DEMO_APPLICATIONS,
  filterJobs,
  getJobPostings,
  getJobPostingById,
  createJobPosting,
  applyToJob,
  getJobApplicationsForRecruiter,
  getJobApplicationsForCandidate,
  validateJobPostingInput,
  validateApplicationInput,
  isTableMissing,
} from "./jobs.ts";

test("DEMO_JOBS mematuhi skema data dan kriteria Proposal Kompres 16", () => {
  assert.ok(DEMO_JOBS.length >= 3, "Harus menyediakan minimal 3 lowongan demo");
  assert.ok(DEMO_APPLICATIONS.length >= 2, "Harus menyediakan minimal 2 lamaran demo");

  // Memastikan ketiga bidang terwakili

  const fields = DEMO_JOBS.map((j) => j.field);
  assert.ok(fields.includes("informatics"), "Bidang informatika harus tersedia");
  assert.ok(fields.includes("design"), "Bidang desain (DKV) harus tersedia");
  assert.ok(fields.includes("marketing"), "Bidang pemasaran digital harus tersedia");

  for (const job of DEMO_JOBS) {
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
  const webDev = DEMO_JOBS.find((j) => j.field === "informatics" && j.employmentType === "fulltime");
  assert.ok(webDev);
  assert.equal(webDev.minEducation, "smk");
  assert.equal(webDev.experienceLevel, "fresh_graduate");
  assert.ok(webDev.highlights[0].toLowerCase().includes("smk"));

  const graphicDev = DEMO_JOBS.find((j) => j.field === "design" && j.employmentType === "fulltime");
  assert.ok(graphicDev);
  assert.equal(graphicDev.minEducation, "smk");
  assert.equal(graphicDev.experienceLevel, "fresh_graduate");
  assert.ok(graphicDev.highlights[0].toLowerCase().includes("smk"));

  const marketingDev = DEMO_JOBS.find((j) => j.field === "marketing");
  assert.ok(marketingDev);
  assert.equal(marketingDev.minEducation, "smk");
  assert.equal(marketingDev.experienceLevel, "fresh_graduate");
  assert.ok(marketingDev.highlights[0].toLowerCase().includes("smk"));
});

test("filterJobs menyaring berdasarkan bidang (field)", () => {
  const infoJobs = filterJobs(DEMO_JOBS, { field: "informatics" });
  assert.ok(infoJobs.length > 0);
  assert.ok(infoJobs.every((j) => j.field === "informatics"));

  const designJobs = filterJobs(DEMO_JOBS, { field: "design" });
  assert.ok(designJobs.length > 0);
  assert.ok(designJobs.every((j) => j.field === "design"));

  const marketingJobs = filterJobs(DEMO_JOBS, { field: "marketing" });
  assert.ok(marketingJobs.length > 0);
  assert.ok(marketingJobs.every((j) => j.field === "marketing"));

  const allJobs = filterJobs(DEMO_JOBS, { field: "all" });
  assert.equal(allJobs.length, DEMO_JOBS.length);
});

test("filterJobs menyaring berdasarkan pendidikan minimal (minEducation)", () => {
  const smkJobs = filterJobs(DEMO_JOBS, { minEducation: "smk" });
  assert.ok(smkJobs.length >= 3);
  assert.ok(smkJobs.every((j) => j.minEducation === "smk"));

  const diplomaJobs = filterJobs(DEMO_JOBS, { minEducation: "diploma" });
  assert.ok(diplomaJobs.length >= 1);
  assert.ok(diplomaJobs.every((j) => j.minEducation === "diploma"));

  const bachelorJobs = filterJobs(DEMO_JOBS, { minEducation: "bachelor" });
  assert.equal(bachelorJobs.length, 0);
});

test("filterJobs menyaring berdasarkan kompensasi paid dan unpaid", () => {
  const paidJobs = filterJobs(DEMO_JOBS, { compensationType: "paid" });
  assert.ok(paidJobs.length >= 3);
  assert.ok(paidJobs.every((j) => j.compensationType === "paid"));

  const unpaidJobs = filterJobs(DEMO_JOBS, { compensationType: "unpaid" });
  assert.ok(unpaidJobs.length >= 1);
  assert.ok(unpaidJobs.every((j) => j.compensationType === "unpaid"));
});

test("filterJobs menyaring berdasarkan tipe kerja (employmentType)", () => {
  const fulltimeJobs = filterJobs(DEMO_JOBS, { employmentType: "fulltime" });
  assert.ok(fulltimeJobs.length >= 3);
  assert.ok(fulltimeJobs.every((j) => j.employmentType === "fulltime"));

  const internshipJobs = filterJobs(DEMO_JOBS, { employmentType: "internship" });
  assert.ok(internshipJobs.length >= 1);
  assert.ok(internshipJobs.every((j) => j.employmentType === "internship"));

  const contractJobs = filterJobs(DEMO_JOBS, { employmentType: "contract" });
  assert.ok(contractJobs.length >= 1);
  assert.ok(contractJobs.every((j) => j.employmentType === "contract"));
});

test("filterJobs menyaring berdasarkan workplaceType, candidateScore, dan searchQuery", () => {
  // Workplace filter
  const remoteJobs = filterJobs(DEMO_JOBS, { workplaceType: "remote" });
  assert.ok(remoteJobs.length >= 1);
  assert.ok(remoteJobs.every((j) => j.workplaceType === "remote"));

  // Candidate score filter (kandidat dengan skor 60 bisa melihat lowongan dengan minSkillbridgeScore <= 60)
  const accessibleForScore60 = filterJobs(DEMO_JOBS, { candidateScore: 60 });
  assert.ok(accessibleForScore60.length > 0);
  assert.ok(accessibleForScore60.every((j) => j.minSkillbridgeScore <= 60));

  // Search query
  const searchNext = filterJobs(DEMO_JOBS, { searchQuery: "Next.js" });
  assert.ok(searchNext.length >= 1);
  assert.ok(searchNext.some((j) => j.title.includes("Web") || j.requiredSkills.includes("Next.js")));

  const searchBandung = filterJobs(DEMO_JOBS, { searchQuery: "Bandung" });
  assert.ok(searchBandung.length >= 1);
  assert.equal(searchBandung[0].location, "Bandung, Jawa Barat");
});

test("Ketahanan fail-safe getJobPostings dan getJobPostingById saat database belum termigrasi", async () => {
  const jobs = await getJobPostings();
  assert.ok(Array.isArray(jobs), "Harus mengembalikan array");
  assert.ok(jobs.length >= 3, "Harus memuat data DEMO_JOBS secara fail-safe");

  // Filter bidang saat fail-safe
  const filtered = await getJobPostings({ field: "informatics" });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((j) => j.field === "informatics"));

  // getJobPostingById dengan id demo yang valid
  const firstDemoId = DEMO_JOBS[0].id;
  const found = await getJobPostingById(firstDemoId);
  assert.ok(found !== null);
  assert.equal(found?.id, firstDemoId);
  assert.equal(found?.companyName, DEMO_JOBS[0].companyName);

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
    jobId: DEMO_JOBS[0].id,
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
  assert.equal(application.jobId, DEMO_JOBS[0].id);
  assert.equal(application.candidateName, "Rian Pratama");
  assert.equal(application.status, "pending");
});

test("getJobApplicationsForRecruiter dan getJobApplicationsForCandidate bekerja fail-safe", async () => {
  // Recruiter queries applications
  const recruiterApps = await getJobApplicationsForRecruiter("recruiter-dummy-id");
  assert.ok(Array.isArray(recruiterApps));
  assert.ok(recruiterApps.length >= 1, "Harus memuat data demo lamaran");

  // Recruiter queries specific job applications
  const jobSpecificApps = await getJobApplicationsForRecruiter(
    "recruiter-dummy-id",
    DEMO_JOBS[0].id,
  );
  assert.ok(Array.isArray(jobSpecificApps));
  assert.ok(jobSpecificApps.every((a) => a.jobId === DEMO_JOBS[0].id));

  // Candidate queries own applications
  const candidateApps = await getJobApplicationsForCandidate(
    "00000000-0000-4000-8000-000000000002",
  );
  assert.ok(Array.isArray(candidateApps));
  assert.ok(candidateApps.length >= 1);
  assert.equal(candidateApps[0].candidateId, "00000000-0000-4000-8000-000000000002");
});
