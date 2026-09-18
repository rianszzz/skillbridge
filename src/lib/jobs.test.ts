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
  validateJobPostingUpdateInput,
  updateJobPosting,
  deleteJobPosting,
  isTableMissing,
  parseDeletedJobsCookie,
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
  assert.ok(application.fitEvaluation, "applyToJob harus memuat fitEvaluation");
  assert.ok([0, 25, 50, 75, 100].includes(application.fitEvaluation.score));
  assert.equal(application.skillbridgeScore, application.fitEvaluation.score);
});

test("DEMO_APPLICATIONS memuat 3 pelamar realistis dengan fitEvaluation terstruktur", () => {
  assert.equal(DEMO_APPLICATIONS.length, 3, "Harus memuat tepat 3 pelamar demo (Ahmad, Siti, Budi)");

  const names = DEMO_APPLICATIONS.map((a) => a.candidateName);
  assert.ok(names.some((n) => n.includes("Ahmad Fauzi")));
  assert.ok(names.some((n) => n.includes("Siti Rahma")));
  assert.ok(names.some((n) => n.includes("Budi Santoso")));

  for (const app of DEMO_APPLICATIONS) {
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
  // Demo job ke-5
  const demoTargetId = DEMO_JOBS[4].id;
  const originalTitle = DEMO_JOBS[4].title;

  const updatedDemo = await updateJobPosting("any-recruiter-id", demoTargetId, {
    title: "Senior UI/UX Designer & Product Lead",
    status: "closed",
    salaryMin: 9000000,
    salaryMax: 15000000,
  });

  assert.equal(updatedDemo.id, demoTargetId);
  assert.equal(updatedDemo.title, "Senior UI/UX Designer & Product Lead");
  assert.equal(updatedDemo.status, "closed");
  assert.equal(updatedDemo.salaryMin, 9000000);
  assert.equal(updatedDemo.salaryMax, 15000000);

  const foundDemo = await getJobPostingById(demoTargetId);
  assert.ok(foundDemo !== null);
  assert.equal(foundDemo?.title, "Senior UI/UX Designer & Product Lead");
  assert.equal(foundDemo?.status, "closed");

  // Restore original title for demo clean state
  await updateJobPosting("any-recruiter-id", demoTargetId, {
    title: originalTitle,
    status: "active",
    salaryMin: 6000000,
    salaryMax: 8500000,
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
  const jobsBefore = await getJobPostings();
  assert.ok(jobsBefore.length >= 2, "Harus ada lowongan awal");

  const targetJobId = jobsBefore[0].id;
  const otherJobId = jobsBefore[1].id;

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
  // targetJobId mungkin ada di list jika belum dihapus global
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
  assert.ok(jobs.length >= 1);
  assert.ok(!jobs.some((j) => j.id === "dummy-deleted-uuid-999"));
});


