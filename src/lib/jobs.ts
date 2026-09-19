import { createAdminSupabase, isTableMissing } from "./supabase.ts";
import { evaluateJobFit } from "./job-fit-evaluator.ts";
import { DEMO_SEEDS } from "./demo-seed.ts";
import type {
  Field,
  Role,
  EmploymentType,
  WorkplaceType,
  MinEducation,
  ExperienceLevel,
  CompensationType,
  JobStatus,
  ApplicationStatus,
  JobEvidenceType,
  JobPosting,
  JobApplication,
  JobFilters,
  JobFitEvaluation,
  AssessmentResult,
} from "./types.ts";

export { isTableMissing };
export type {
  EmploymentType,
  WorkplaceType,
  MinEducation,
  ExperienceLevel,
  CompensationType,
  JobStatus,
  ApplicationStatus,
  JobEvidenceType,
  JobPosting,
  JobApplication,
  JobFilters,
  JobFitEvaluation,
};
const inMemoryJobs = new Map<string, JobPosting>();
const inMemoryApplications = new Map<string, JobApplication>();
const applicationRecruiterMap = new Map<string, string>();
const deletedJobIds = new Set<string>([
  "10000000-0000-4000-8000-000000000004",
  "10000000-0000-4000-8000-000000000005",
]);
const applicationFitMap = new Map<string, JobFitEvaluation>();

export function resetInMemoryApplicationsForTesting(): void {
  inMemoryApplications.clear();
  applicationRecruiterMap.clear();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUuid(id: string | null | undefined): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export const DEMO_JOBS: JobPosting[] = [];

export const DEMO_APPLICATIONS: JobApplication[] = [];

export const MOCK_JOBS_FIXTURE: JobPosting[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    companyName: "PT Nusantara Cloud Solusindo",
    title: "Junior Front-End Web Developer",
    field: "informatics",
    targetRole: "Junior Web Developer",
    employmentType: "fulltime",
    workplaceType: "hybrid",
    location: "Jakarta Selatan, DKI Jakarta",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 5000000,
    salaryMax: 7500000,
    showSalary: true,
    benefits: [
      "BPJS Kesehatan & Ketenagakerjaan",
      "Tunjangan Internet & Laptop",
      "Mentoring 1-on-1 Tech Lead",
      "Jalur Karier Jelas",
    ],
    highlights: [
      "Ramah Lulusan SMK & Fresh Graduate (Penilaian Berbasis Portofolio Riil)",
      "Mentoring 1-on-1 Mingguan Bersama Tech Lead & Code Review Berkala",
      "Rentang Gaji Transparan Rp 5.000.000 - Rp 7.500.000 + Insentif Proyek",
    ],
    description:
      "Membuka kesempatan bagi lulusan SMK RPL / Teknik Komputer dan fresh graduate yang antusias membangun web modern berbasis Next.js dan TypeScript. Mengutamakan bukti karya nyata di GitHub.",
    responsibilities: [
      "Mengembangkan antarmuka web responsif dan ramah pengguna dengan Next.js dan Tailwind CSS",
      "Mengintegrasikan API RESTful dan mengelola data state aplikasi",
      "Menulis kode bersih, terdokumentasi, dan menjaga kebersihan arsitektur kode",
      "Berpartisipasi aktif dalam sprint harian dan kolaborasi tim",
    ],
    requiredSkills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Git & GitHub", "REST API"],
    acceptedEvidenceTypes: ["github"],
    minSkillbridgeScore: 60,
    status: "active",
    createdAt: "2026-08-15T08:00:00Z",
    isDemo: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    companyName: "Studio Karya Kreatif Visual",
    title: "Junior Graphic & Brand Identity Designer",
    field: "design",
    targetRole: "Junior Graphic Designer",
    employmentType: "fulltime",
    workplaceType: "onsite",
    location: "Bandung, Jawa Barat",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 4500000,
    salaryMax: 6500000,
    showSalary: true,
    benefits: [
      "Studio Kreatif Nyaman",
      "Langganan Adobe CC & Figma Org",
      "Bonus Proyek Berkala",
      "BPJS Kesehatan",
    ],
    highlights: [
      "Terbuka Luas untuk Lulusan SMK DKV / Multimedia & Fresh Graduate",
      "Terlibat Langsung Perancangan Brand Identity Skala Nasional",
      "Gaji Transparan Rp 4.500.000 - Rp 6.500.000 + Tunjangan Kreatif",
    ],
    description:
      "Mencari talenta muda kreatif dengan kepekaan visual yang kuat pada tipografi, visual hierarchy, dan eksplorasi warna. Bukti portofolio dan kesiapan kerja menjadi tolok ukur utama kami.",
    responsibilities: [
      "Merancang identitas visual merek, logo guidelines, dan materi promosi kampanye",
      "Membuat materi konten media sosial yang estetis dan komunikatif",
      "Mempersiapkan berkas cetak siap produksi serta aset digital responsif",
      "Mengikuti arahan art director dan merevisi desain sesuai masukan tim",
    ],
    requiredSkills: [
      "Figma",
      "Adobe Illustrator",
      "Adobe Photoshop",
      "Tipografi",
      "Color Theory",
      "Layout Hierarchy",
    ],
    acceptedEvidenceTypes: ["image", "pdf"],
    minSkillbridgeScore: 60,
    status: "active",
    createdAt: "2026-08-16T09:30:00Z",
    isDemo: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    companyName: "Artha Digital Growth",
    title: "Junior Digital Performance Marketer",
    field: "marketing",
    targetRole: "Junior Digital Marketer",
    employmentType: "fulltime",
    workplaceType: "remote",
    location: "Remote (Seluruh Indonesia)",
    minEducation: "smk",
    experienceLevel: "fresh_graduate",
    compensationType: "paid",
    salaryMin: 4500000,
    salaryMax: 7000000,
    showSalary: true,
    benefits: [
      "100% Kerja Remote Fleksibel",
      "Tunjangan Internet & Fasilitas Kerja",
      "Budget Kursus & Sertifikasi Google/Meta",
      "BPJS Kesehatan",
    ],
    highlights: [
      "Ramah Lulusan SMK Pemasaran / Bisnis Digital & Fresh Graduate",
      "100% Remote dengan Jam Kerja Fleksibel & Budaya Kerja Asinkron",
      "Gaji Pokok Transparan Rp 4.500.000 - Rp 7.000.000 + Bonus Konversi Iklan",
    ],
    description:
      "Mencari Digital Marketer muda yang menyukai analisa data dan eksekusi kampanye berbayar. Kami menghargai pemahaman metrik seperti ROAS, CTR, dan CPA dari studi kasus nyata.",
    responsibilities: [
      "Menyusun dan mengeksekusi kampanye iklan di Meta Ads, TikTok Ads, dan Google Search",
      "Menganalisis performa kampanye (CTR, CPC, Conversion Rate, ROAS)",
      "Melakukan pengujian copy dan visual iklan (A/B testing)",
      "Menyusun laporan mingguan dan usulan optimasi funnel pemasaran",
    ],
    requiredSkills: [
      "Meta Ads",
      "Google Ads",
      "TikTok Ads",
      "Copywriting",
      "Analisis Data (ROAS/CTR)",
      "SEO Dasar",
    ],
    acceptedEvidenceTypes: ["pdf"],
    minSkillbridgeScore: 55,
    status: "active",
    createdAt: "2026-08-17T10:15:00Z",
    isDemo: true,
  },
];

export const MOCK_APPLICATIONS_FIXTURE: JobApplication[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    jobId: "10000000-0000-4000-8000-000000000001",
    candidateId: "00000000-0000-4000-8000-000000000002",
    candidateName: "Ahmad Fauzi (INF-02)",
    candidateEmail: "ahmad.fauzi@demo.skillbridge.id",
    assessmentId: "00000000-0000-4000-8000-000000000002",
    skillbridgeScore: 75,
    portfolioUrl: "https://github.com/skillbridge-demo/portfolio-ahmad",
    coverLetter:
      "Saya lulusan SMK dengan portofolio Next.js dan skor Skillbridge 75. Sangat berminat berkontribusi di PT Nusantara Cloud Solusindo.",
    status: "shortlisted",
    appliedAt: "2026-08-20T10:00:00Z",
    isDemo: true,
    jobTitle: "Junior Front-End Web Developer",
    companyName: "PT Nusantara Cloud Solusindo",
    fitEvaluation: {
      score: 75,
      fitLevel: "high",
      matchingCriteria: [
        "Keahlian terverifikasi: Next.js, React, TypeScript, dan Tailwind CSS",
        "Kualitas struktur kode modul web rapi dan responsif",
        "Tautan portofolio GitHub aktif terlampir untuk verifikasi karya nyata",
      ],
      missingCriteria: [
        "Automated unit testing dan integrasi pengujian CI/CD",
      ],
      summary:
        "Kandidat Ahmad Fauzi menunjukkan tingkat kesesuaian tinggi (75/100) untuk posisi Junior Front-End Web Developer di PT Nusantara Cloud Solusindo dengan penguasaan framework modern yang kuat.",
      recommendation:
        "Sangat disarankan untuk dijadwalkan ke tahap wawancara teknis dan code walk-through.",
    },
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    jobId: "10000000-0000-4000-8000-000000000002",
    candidateId: "00000000-0000-4000-8000-000000000022",
    candidateName: "Siti Rahma (DKV-02)",
    candidateEmail: "siti.rahma@demo.skillbridge.id",
    assessmentId: "00000000-0000-4000-8000-000000000022",
    skillbridgeScore: 75,
    portfolioUrl: "https://karyasitirahma.portfolio.id",
    coverLetter:
      "Portofolio brand identity saya telah dinilai Skillbridge dengan skor 75. Siap berkarya di Studio Karya Kreatif Visual.",
    status: "reviewed",
    appliedAt: "2026-08-21T11:30:00Z",
    isDemo: true,
    jobTitle: "Junior Graphic & Brand Identity Designer",
    companyName: "Studio Karya Kreatif Visual",
    fitEvaluation: {
      score: 75,
      fitLevel: "high",
      matchingCriteria: [
        "Perancangan identitas visual merek, logo guidelines, dan eksplorasi tipografi di Figma",
        "Keharmonisan teori warna (color harmony) dan hierarki tata letak visual",
        "Portofolio digital aktif dengan studi kasus komprehensif",
      ],
      missingCriteria: [
        "Dokumentasi persiapan berkas cetak siap produksi (print production ready)",
      ],
      summary:
        "Kandidat Siti Rahma memiliki kepekaan visual yang sangat baik dan kesesuaian tinggi (75/100) untuk peran Junior Graphic & Brand Identity Designer di Studio Karya Kreatif Visual.",
      recommendation:
        "Disarankan untuk peninjauan portofolio langsung bersama Lead Designer / Art Director.",
    },
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    jobId: "10000000-0000-4000-8000-000000000003",
    candidateId: "00000000-0000-4000-8000-000000000032",
    candidateName: "Budi Santoso (MKT-02)",
    candidateEmail: "budi.santoso@demo.skillbridge.id",
    assessmentId: "00000000-0000-4000-8000-000000000032",
    skillbridgeScore: 75,
    portfolioUrl: "https://storage.demo.skillbridge.id/marketing/laporan-kampanye-budi.pdf",
    coverLetter:
      "Saya memiliki pengalaman mengelola kampanye multi-kanal dengan analisis performa berbasis data dan metrik ROAS.",
    status: "reviewed",
    appliedAt: "2026-08-22T09:00:00Z",
    isDemo: true,
    jobTitle: "Junior Digital Performance Marketer",
    companyName: "Artha Digital Growth",
    fitEvaluation: {
      score: 75,
      fitLevel: "high",
      matchingCriteria: [
        "Perancangan dan eksekusi kampanye berbayar multi-kanal (Meta Ads & Google Ads)",
        "Analisis performa metrik kuantitatif (CTR, CPC, Conversion Rate, dan ROAS)",
        "Pengujian variasi copy dan visual iklan (A/B testing)",
      ],
      missingCriteria: [
        "Penyajian data baseline historis jangka panjang untuk perbandingan pertumbuhan",
      ],
      summary:
        "Kandidat Budi Santoso menunjukkan kemampuan analitis yang kuat dan kesesuaian tinggi (75/100) untuk posisi Junior Digital Performance Marketer di Artha Digital Growth.",
      recommendation:
        "Direkomendasikan untuk uji studi kasus analisa efisiensi ROAS dan alokasi anggaran kampanye.",
    },
  },
];

for (const app of [...DEMO_APPLICATIONS, ...MOCK_APPLICATIONS_FIXTURE]) {
  if (app.fitEvaluation) {
    applicationFitMap.set(app.id, app.fitEvaluation);
  }
}

export function filterJobs(jobs: JobPosting[], filters?: JobFilters): JobPosting[] {
  let result = [...jobs];

  if (filters?.status && filters.status !== "all") {
    result = result.filter((j) => j.status === filters.status);
  }

  if (filters?.field && filters.field !== "all") {
    result = result.filter((j) => j.field === filters.field);
  }

  if (filters?.targetRole && filters.targetRole !== "all") {
    result = result.filter(
      (j) => j.targetRole.toLowerCase() === filters.targetRole!.toLowerCase(),
    );
  }

  if (filters?.employmentType && filters.employmentType !== "all") {
    result = result.filter((j) => j.employmentType === filters.employmentType);
  }

  if (filters?.workplaceType && filters.workplaceType !== "all") {
    result = result.filter((j) => j.workplaceType === filters.workplaceType);
  }

  if (filters?.minEducation && filters.minEducation !== "all") {
    result = result.filter((j) => j.minEducation === filters.minEducation);
  }

  if (filters?.experienceLevel && filters.experienceLevel !== "all") {
    result = result.filter((j) => j.experienceLevel === filters.experienceLevel);
  }

  if (filters?.compensationType && filters.compensationType !== "all") {
    result = result.filter((j) => j.compensationType === filters.compensationType);
  }

  if (typeof filters?.minScore === "number" && !Number.isNaN(filters.minScore)) {
    result = result.filter((j) => j.minSkillbridgeScore >= filters.minScore!);
  }

  if (typeof filters?.candidateScore === "number" && !Number.isNaN(filters.candidateScore)) {
    result = result.filter((j) => j.minSkillbridgeScore <= filters.candidateScore!);
  }

  if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim().toLowerCase();
    result = result.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.companyName.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.responsibilities.some((r) => r.toLowerCase().includes(q)) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
        j.highlights.some((h) => h.toLowerCase().includes(q)),
    );
  }

  // Sort: newest first
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return result;
}

type DbJobRow = {
  id: string;
  recruiter_id?: string | null;
  company_name: string;
  company_logo?: string | null;
  title: string;
  field: Field;
  target_role: Role | string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  location: string;
  min_education: MinEducation;
  experience_level: ExperienceLevel;
  compensation_type: CompensationType;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  show_salary?: boolean | null;
  benefits?: string[] | null;
  highlights?: string[] | null;
  description?: string | null;
  responsibilities?: string[] | null;
  required_skills?: string[] | null;
  accepted_evidence_types?: JobEvidenceType[] | null;
  min_skillbridge_score?: number | string | null;
  status: JobStatus;
  created_at: string;
  updated_at?: string | null;
  is_demo?: boolean | null;
};

type DbApplicationRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  phone?: string | null;
  location?: string | null;
  photo_url?: string | null;
  resume_file_name?: string | null;
  resume_url?: string | null;
  cover_letter_mode?: "upload" | "write" | "none" | null;
  cover_letter_file_name?: string | null;
  assessment_id?: string | null;
  skillbridge_score?: number | string | null;
  portfolio_url?: string | null;
  cover_letter?: string | null;
  fit_evaluation?: unknown;
  status: ApplicationStatus;
  is_demo?: boolean | null;
  created_at: string;
  job_postings?: {
    id?: string;
    title?: string;
    company_name?: string;
    recruiter_id?: string;
  } | null;
};

function mapDbJobToPosting(row: DbJobRow): JobPosting {
  return {
    id: row.id,
    recruiterId: row.recruiter_id ?? undefined,
    companyName: row.company_name,
    companyLogo: row.company_logo ?? undefined,
    title: row.title,
    field: row.field,
    targetRole: row.target_role,
    employmentType: row.employment_type,
    workplaceType: row.workplace_type,
    location: row.location,
    minEducation: row.min_education,
    experienceLevel: row.experience_level,
    compensationType: row.compensation_type,
    salaryMin: row.salary_min !== null && row.salary_min !== undefined ? Number(row.salary_min) : null,
    salaryMax: row.salary_max !== null && row.salary_max !== undefined ? Number(row.salary_max) : null,
    showSalary: row.show_salary ?? true,
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    description: row.description ?? "",
    responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
    requiredSkills: Array.isArray(row.required_skills) ? row.required_skills : [],
    acceptedEvidenceTypes: Array.isArray(row.accepted_evidence_types)
      ? row.accepted_evidence_types
      : ["github", "image", "pdf"],
    minSkillbridgeScore:
      row.min_skillbridge_score !== null && row.min_skillbridge_score !== undefined
        ? Number(row.min_skillbridge_score)
        : 0,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    isDemo: Boolean(row.is_demo),
  };
}

function mapDbApplication(row: DbApplicationRow): JobApplication {
  const cachedFit = applicationFitMap.get(row.id);
  const cachedMem = inMemoryApplications.get(row.id);
  const dbFit =
    row.fit_evaluation && typeof row.fit_evaluation === "object"
      ? (row.fit_evaluation as JobFitEvaluation)
      : null;

  const recruiterId =
    row.job_postings?.recruiter_id ??
    cachedMem?.recruiterId ??
    applicationRecruiterMap.get(row.id) ??
    undefined;

  if (recruiterId) {
    applicationRecruiterMap.set(row.id, recruiterId);
  }

  return {
    id: row.id,
    jobId: row.job_id,
    recruiterId,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    phone: row.phone ?? cachedMem?.phone ?? undefined,
    location: row.location ?? cachedMem?.location ?? undefined,
    photoUrl: row.photo_url ?? cachedMem?.photoUrl ?? undefined,
    resumeFileName: row.resume_file_name ?? cachedMem?.resumeFileName ?? undefined,
    resumeUrl: row.resume_url ?? cachedMem?.resumeUrl ?? undefined,
    coverLetterMode: (row.cover_letter_mode as "upload" | "write" | "none" | undefined) ?? cachedMem?.coverLetterMode ?? undefined,
    coverLetterFileName: row.cover_letter_file_name ?? cachedMem?.coverLetterFileName ?? undefined,
    assessmentId: row.assessment_id ?? cachedMem?.assessmentId ?? null,
    skillbridgeScore:
      row.skillbridge_score !== null && row.skillbridge_score !== undefined
        ? Number(row.skillbridge_score)
        : cachedMem?.skillbridgeScore ?? null,
    portfolioUrl: row.portfolio_url ?? cachedMem?.portfolioUrl ?? undefined,
    coverLetter: row.cover_letter ?? cachedMem?.coverLetter ?? undefined,
    fitEvaluation: dbFit ?? cachedFit ?? cachedMem?.fitEvaluation ?? null,
    status: row.status ?? cachedMem?.status ?? "pending",
    appliedAt: row.created_at || cachedMem?.appliedAt || new Date().toISOString(),
    isDemo: Boolean(row.is_demo),
    jobTitle: row.job_postings?.title ?? cachedMem?.jobTitle ?? undefined,
    companyName: row.job_postings?.company_name ?? cachedMem?.companyName ?? undefined,
  };
}

export function parseDeletedJobsCookie(cookieHeader: string | null | undefined): string[] {
  if (!cookieHeader || typeof cookieHeader !== "string") return [];
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("skillbridge_deleted_jobs=")) {
      const rawValue = trimmed.slice("skillbridge_deleted_jobs=".length);
      try {
        const decoded = decodeURIComponent(rawValue);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0,
          );
        }
      } catch {
        return [];
      }
    }
  }
  return [];
}

async function saveCustomJobToRecruiterMetadata(
  recruiterId: string,
  posting: JobPosting,
): Promise<void> {
  if (!recruiterId || !isValidUuid(recruiterId)) return;
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(recruiterId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      const currentCustom: JobPosting[] = Array.isArray(metadata.custom_jobs)
        ? (metadata.custom_jobs as JobPosting[])
        : [];
      const updatedCustom = [...currentCustom.filter((j) => j && j.id !== posting.id), posting];
      const currentDeleted: string[] = Array.isArray(metadata.deleted_job_ids)
        ? (metadata.deleted_job_ids as string[])
        : [];
      const updatedDeleted = currentDeleted.filter((id) => id !== posting.id);

      await admin.auth.admin.updateUserById(recruiterId, {
        user_metadata: {
          ...metadata,
          custom_jobs: updatedCustom,
          deleted_job_ids: updatedDeleted,
        },
      });
    }
  } catch {
    // Fail-safe: abaikan jika Supabase auth admin tidak tersedia
  }
}

export async function saveApplicationToRecruiterMetadata(
  recruiterId: string,
  application: JobApplication,
): Promise<void> {
  if (!recruiterId || !isValidUuid(recruiterId)) return;
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(recruiterId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      const currentApps: JobApplication[] = Array.isArray(metadata.job_applications)
        ? (metadata.job_applications as JobApplication[])
        : [];
      const updatedApps = [
        ...currentApps.filter((a) => a && typeof a === "object" && a.id !== application.id),
        application,
      ];

      await admin.auth.admin.updateUserById(recruiterId, {
        user_metadata: {
          ...metadata,
          job_applications: updatedApps,
        },
      });
    }
  } catch {
    // Fail-safe: abaikan jika Supabase auth admin tidak tersedia
  }
}

export async function updateApplicationStatusInRecruiterMetadata(
  recruiterId: string,
  applicationId: string,
  newStatus: ApplicationStatus,
): Promise<void> {
  if (!recruiterId || !isValidUuid(recruiterId) || !applicationId) return;
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(recruiterId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      const currentApps: JobApplication[] = Array.isArray(metadata.job_applications)
        ? (metadata.job_applications as JobApplication[])
        : [];
      let modified = false;
      const updatedApps = currentApps.map((a) => {
        if (a && typeof a === "object" && a.id === applicationId) {
          modified = true;
          return { ...a, status: newStatus };
        }
        return a;
      });

      if (modified) {
        await admin.auth.admin.updateUserById(recruiterId, {
          user_metadata: {
            ...metadata,
            job_applications: updatedApps,
          },
        });
      }
    }
  } catch {
    // Fail-safe: abaikan jika Supabase auth admin tidak tersedia
  }
}

export async function saveApplicationToCandidateMetadata(
  candidateId: string,
  application: JobApplication,
): Promise<void> {
  if (!candidateId || !isValidUuid(candidateId)) return;
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(candidateId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      const currentApps: JobApplication[] = Array.isArray(metadata.my_applications)
        ? (metadata.my_applications as JobApplication[])
        : [];
      const updatedApps = [
        ...currentApps.filter((a) => a && typeof a === "object" && a.id !== application.id),
        application,
      ];

      await admin.auth.admin.updateUserById(candidateId, {
        user_metadata: {
          ...metadata,
          my_applications: updatedApps,
        },
      });
    }
  } catch {
    // Fail-safe: abaikan jika Supabase auth admin tidak tersedia
  }
}

export async function updateApplicationStatusInCandidateMetadata(
  candidateId: string,
  applicationId: string,
  newStatus: ApplicationStatus,
): Promise<void> {
  if (!candidateId || !isValidUuid(candidateId) || !applicationId) return;
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(candidateId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      const currentApps: JobApplication[] = Array.isArray(metadata.my_applications)
        ? (metadata.my_applications as JobApplication[])
        : [];
      let modified = false;
      const updatedApps = currentApps.map((a) => {
        if (a && typeof a === "object" && a.id === applicationId) {
          modified = true;
          return { ...a, status: newStatus };
        }
        return a;
      });

      if (modified) {
        await admin.auth.admin.updateUserById(candidateId, {
          user_metadata: {
            ...metadata,
            my_applications: updatedApps,
          },
        });
      }
    }
  } catch {
    // Fail-safe: abaikan jika Supabase auth admin tidak tersedia
  }
}

export async function getJobPostings(
  filters?: JobFilters & { deletedIds?: string[]; recruiterId?: string },
): Promise<JobPosting[]> {
  let dbJobs: JobPosting[] = [];
  let metadataCustomJobs: JobPosting[] = [];
  let metadataDeletedIds: string[] = [];

  // Jika ada recruiterId, coba ambil user_metadata dari auth.admin
  if (filters?.recruiterId) {
    try {
      const admin = createAdminSupabase();
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(
        filters.recruiterId,
      );
      if (!userError && userData?.user) {
        const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
        if (Array.isArray(metadata.custom_jobs)) {
          metadataCustomJobs = metadata.custom_jobs.filter(
            (j): j is JobPosting => Boolean(j && typeof j === "object" && typeof j.id === "string"),
          );
        }
        if (Array.isArray(metadata.deleted_job_ids)) {
          metadataDeletedIds = metadata.deleted_job_ids.filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0,
          );
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  try {
    const db = createAdminSupabase();
    let query = db.from("job_postings").select("*");

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    } else if (!filters?.status) {
      query = query.eq("status", "active");
    }

    if (filters?.field && filters.field !== "all") {
      query = query.eq("field", filters.field);
    }

    if (filters?.employmentType && filters.employmentType !== "all") {
      query = query.eq("employment_type", filters.employmentType);
    }

    if (filters?.minEducation && filters.minEducation !== "all") {
      query = query.eq("min_education", filters.minEducation);
    }

    if (filters?.compensationType && filters.compensationType !== "all") {
      query = query.eq("compensation_type", filters.compensationType);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      if (!isTableMissing(error) && process.env.NODE_ENV !== "test") {
        console.warn("Database query error, using demo jobs:", error.message);
      }
    } else if (data && data.length > 0) {
      dbJobs = data.map((d) => mapDbJobToPosting(d as DbJobRow));
    }
  } catch {
    // Graceful fallback: when DB is unconfigured or table missing, rely on demo jobs
  }

  // Ketika mencari lowongan di DB dan tabel job_postings belum ada / kosong (dbJobs.length === 0),
  // panggil admin.auth.admin.listUsers() untuk mengumpulkan custom_jobs dan deleted_job_ids dari seluruh akun recruiter (fail-safe).
  // Hal ini memastikan setiap lowongan yang dibuat sendiri oleh HR (seperti lowongan milik akun HR xilehaosi@gmail.com)
  // akan otomatis muncul di /jobs untuk semua kandidat/pengunjung publik, bahkan tanpa parameter recruiterId.
  if (dbJobs.length === 0) {
    try {
      const admin = createAdminSupabase();
      const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
      if (!listError && usersData && Array.isArray(usersData.users)) {
        for (const user of usersData.users) {
          const meta = (user.user_metadata || {}) as Record<string, unknown>;
          if (Array.isArray(meta.custom_jobs)) {
            const userCustom = meta.custom_jobs.filter(
              (j): j is JobPosting => Boolean(j && typeof j === "object" && typeof j.id === "string"),
            );
            metadataCustomJobs.push(...userCustom);
          }
          if (Array.isArray(meta.deleted_job_ids)) {
            const userDeleted = meta.deleted_job_ids.filter(
              (id): id is string => typeof id === "string" && id.trim().length > 0,
            );
            metadataDeletedIds.push(...userDeleted);
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  // Deduplikasi metadataCustomJobs
  const uniqueMetaCustomJobs: JobPosting[] = [];
  const seenMetaJobIds = new Set<string>();
  for (const j of metadataCustomJobs) {
    if (!seenMetaJobIds.has(j.id)) {
      seenMetaJobIds.add(j.id);
      uniqueMetaCustomJobs.push(j);
    }
  }

  // Gabungkan deletedJobIds internal + filters?.deletedIds + metadata.deleted_job_ids
  const allDeletedIds = new Set<string>([
    ...deletedJobIds,
    ...(filters?.deletedIds || []),
    ...metadataDeletedIds,
  ]);

  // Combine DB jobs with in-memory jobs, custom jobs from metadata, and DEMO_JOBS
  const existingIds = new Set(dbJobs.map((j) => j.id));

  // Tambahkan lowongan dari user_metadata.custom_jobs (jika belum ada di dbJobs)
  const metaCustomToAdd = uniqueMetaCustomJobs.filter((j) => !existingIds.has(j.id));
  for (const j of metaCustomToAdd) {
    existingIds.add(j.id);
    inMemoryJobs.set(j.id, j);
  }

  const inMemList = Array.from(inMemoryJobs.values()).filter((j) => !existingIds.has(j.id));
  for (const j of inMemList) existingIds.add(j.id);

  const demoToAdd = DEMO_JOBS.filter((j) => !existingIds.has(j.id));

  // Saring semua lowongan sehingga TIDAK ADA yang id-nya ada di daftar deletedIds gabungan
  const combined = [...dbJobs, ...metaCustomToAdd, ...inMemList, ...demoToAdd].filter(
    (j) => !allDeletedIds.has(j.id),
  );

  return filterJobs(combined, filters);
}

export async function getJobPostingById(
  id: string,
  options?: { deletedIds?: string[]; recruiterId?: string; checkMockFixture?: boolean },
): Promise<JobPosting | null> {
  if (!id || typeof id !== "string") return null;
  if (deletedJobIds.has(id)) return null;
  if (options?.deletedIds && options.deletedIds.includes(id)) return null;

  let metadataDeletedIds: string[] = [];
  let metadataCustomJobs: JobPosting[] = [];

  if (options?.recruiterId) {
    try {
      const admin = createAdminSupabase();
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(
        options.recruiterId,
      );
      if (!userError && userData?.user) {
        const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
        if (Array.isArray(metadata.deleted_job_ids)) {
          metadataDeletedIds = metadata.deleted_job_ids.filter(
            (item): item is string => typeof item === "string",
          );
        }
        if (Array.isArray(metadata.custom_jobs)) {
          metadataCustomJobs = metadata.custom_jobs.filter(
            (j): j is JobPosting => Boolean(j && typeof j === "object" && typeof j.id === "string"),
          );
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  if (metadataDeletedIds.includes(id)) return null;

  try {
    const db = createAdminSupabase();
    const { data, error } = await db
      .from("job_postings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return mapDbJobToPosting(data as DbJobRow);
    }
  } catch {
    // Graceful fallback: when DB is unconfigured or table missing, check in-memory / custom jobs
  }

  const inMem = inMemoryJobs.get(id);
  if (
    inMem &&
    !deletedJobIds.has(id) &&
    (!options?.deletedIds || !options.deletedIds.includes(id))
  ) {
    return inMem;
  }

  const customMatch = metadataCustomJobs.find((j) => j && j.id === id);
  if (
    customMatch &&
    !deletedJobIds.has(id) &&
    (!options?.deletedIds || !options.deletedIds.includes(id))
  ) {
    return customMatch;
  }

  // Jika belum ditemukan, periksa seluruh custom_jobs recruiter via listUsers()
  try {
    const admin = createAdminSupabase();
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    if (!listError && usersData && Array.isArray(usersData.users)) {
      for (const u of usersData.users) {
        const meta = (u.user_metadata || {}) as Record<string, unknown>;
        if (Array.isArray(meta.deleted_job_ids) && meta.deleted_job_ids.includes(id)) {
          return null;
        }
        if (Array.isArray(meta.custom_jobs)) {
          const match = meta.custom_jobs.find(
            (j): j is JobPosting => Boolean(j && typeof j === "object" && j.id === id),
          );
          if (
            match &&
            !deletedJobIds.has(id) &&
            (!options?.deletedIds || !options.deletedIds.includes(id))
          ) {
            inMemoryJobs.set(id, match);
            return match;
          }
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  const demoMatch = DEMO_JOBS.find((j) => j.id === id);
  if (
    demoMatch &&
    !deletedJobIds.has(id) &&
    (!options?.deletedIds || !options.deletedIds.includes(id))
  ) {
    return demoMatch;
  }

  // Hanya periksa MOCK_JOBS_FIXTURE jika secara eksplisit dipanggil dengan checkMockFixture atau dari test environment
  const isTest =
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "test" ||
      (Array.isArray(process.execArgv) && process.execArgv.includes("--test")) ||
      (Array.isArray(process.argv) &&
        process.argv.some(
          (arg) => typeof arg === "string" && (arg.includes(".test.") || arg.includes("--test")),
        )));
  if (options?.checkMockFixture || isTest) {
    const fixtureMatch = MOCK_JOBS_FIXTURE.find((j) => j.id === id);
    if (
      fixtureMatch &&
      !deletedJobIds.has(id) &&
      (!options?.deletedIds || !options.deletedIds.includes(id))
    ) {
      return fixtureMatch;
    }
  }

  return null;
}

export type CreateJobInput = {
  title: string;
  field: Field;
  targetRole: Role | string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location: string;
  minEducation: MinEducation;
  experienceLevel: ExperienceLevel;
  compensationType: CompensationType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  showSalary?: boolean;
  benefits?: string[];
  highlights: string[];
  description?: string;
  responsibilities: string[];
  requiredSkills: string[];
  acceptedEvidenceTypes?: JobEvidenceType[];
  minSkillbridgeScore?: number;
  companyLogo?: string;
  status?: JobStatus;
};

export function validateJobPostingInput(
  recruiterId: string,
  companyName: string,
  data: CreateJobInput,
): void {
  if (!recruiterId || typeof recruiterId !== "string" || recruiterId.trim().length === 0) {
    throw new Error("ID perekrut (recruiterId) wajib diisi.");
  }
  if (!companyName || typeof companyName !== "string" || companyName.trim().length === 0) {
    throw new Error("Nama perusahaan (companyName) wajib diisi.");
  }
  if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
    throw new Error("Judul lowongan (title) wajib diisi.");
  }
  const validFields: Field[] = ["informatics", "design", "marketing"];
  if (!validFields.includes(data.field)) {
    throw new Error("Bidang lowongan tidak valid (harus informatics, design, atau marketing).");
  }
  const validEmploymentTypes: EmploymentType[] = ["fulltime", "internship", "contract", "parttime"];
  if (!validEmploymentTypes.includes(data.employmentType)) {
    throw new Error("Tipe kerja tidak valid.");
  }
  const validWorkplaceTypes: WorkplaceType[] = ["onsite", "hybrid", "remote"];
  if (!validWorkplaceTypes.includes(data.workplaceType)) {
    throw new Error("Tempat kerja tidak valid.");
  }
  const validMinEducations: MinEducation[] = ["smk", "diploma", "bachelor", "any"];
  if (!validMinEducations.includes(data.minEducation)) {
    throw new Error("Pendidikan minimal tidak valid.");
  }
  const validExperienceLevels: ExperienceLevel[] = ["fresh_graduate", "under_1_year", "1_to_2_years"];
  if (!validExperienceLevels.includes(data.experienceLevel)) {
    throw new Error("Tingkat pengalaman tidak valid.");
  }
  const validCompensationTypes: CompensationType[] = ["paid", "unpaid"];
  if (!validCompensationTypes.includes(data.compensationType)) {
    throw new Error("Tipe kompensasi tidak valid.");
  }
  if (data.compensationType === "paid") {
    if (data.salaryMin !== undefined && data.salaryMin !== null && data.salaryMin < 0) {
      throw new Error("Gaji minimum tidak boleh bernilai negatif.");
    }
    if (
      data.salaryMin !== undefined &&
      data.salaryMin !== null &&
      data.salaryMax !== undefined &&
      data.salaryMax !== null &&
      data.salaryMax < data.salaryMin
    ) {
      throw new Error("Gaji maksimum tidak boleh lebih kecil dari gaji minimum.");
    }
  }
  if (!Array.isArray(data.highlights) || data.highlights.length === 0) {
    throw new Error("Highlights lowongan wajib memiliki minimal 1 poin (disarankan 3 poin).");
  }
  if (!Array.isArray(data.responsibilities) || data.responsibilities.length === 0) {
    throw new Error("Tanggung jawab pekerjaan (responsibilities) wajib diisi.");
  }
  if (!Array.isArray(data.requiredSkills) || data.requiredSkills.length === 0) {
    throw new Error("Keahlian yang dibutuhkan (requiredSkills) wajib diisi.");
  }
  if (data.minSkillbridgeScore !== undefined && data.minSkillbridgeScore !== null) {
    if (
      typeof data.minSkillbridgeScore !== "number" ||
      data.minSkillbridgeScore < 0 ||
      data.minSkillbridgeScore > 100
    ) {
      throw new Error("Skor minimal Skillbridge harus berupa angka antara 0 dan 100.");
    }
  }
}

export async function createJobPosting(
  recruiterId: string,
  companyName: string,
  data: CreateJobInput,
): Promise<JobPosting> {
  validateJobPostingInput(recruiterId, companyName, data);

  const newPosting: JobPosting = {
    id: crypto.randomUUID(),
    recruiterId,
    companyName: companyName.trim(),
    companyLogo: data.companyLogo,
    title: data.title.trim(),
    field: data.field,
    targetRole: data.targetRole,
    employmentType: data.employmentType,
    workplaceType: data.workplaceType,
    location: data.location.trim(),
    minEducation: data.minEducation,
    experienceLevel: data.experienceLevel,
    compensationType: data.compensationType,
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    showSalary: data.showSalary ?? true,
    benefits: data.benefits ?? [],
    highlights: data.highlights,
    description: data.description ?? "",
    responsibilities: data.responsibilities,
    requiredSkills: data.requiredSkills,
    acceptedEvidenceTypes: data.acceptedEvidenceTypes ?? ["github", "image", "pdf"],
    minSkillbridgeScore: data.minSkillbridgeScore ?? 0,
    status: data.status ?? "active",
    createdAt: new Date().toISOString(),
    isDemo: false,
  };

  inMemoryJobs.set(newPosting.id, newPosting);
  deletedJobIds.delete(newPosting.id);

  try {
    const db = createAdminSupabase();
    const { data: inserted, error } = await db
      .from("job_postings")
      .insert({
        id: newPosting.id,
        recruiter_id: recruiterId,
        company_name: newPosting.companyName,
        company_logo: newPosting.companyLogo ?? null,
        title: newPosting.title,
        field: newPosting.field,
        target_role: newPosting.targetRole,
        employment_type: newPosting.employmentType,
        workplace_type: newPosting.workplaceType,
        location: newPosting.location,
        min_education: newPosting.minEducation,
        experience_level: newPosting.experienceLevel,
        compensation_type: newPosting.compensationType,
        salary_min: newPosting.salaryMin,
        salary_max: newPosting.salaryMax,
        show_salary: newPosting.showSalary,
        benefits: newPosting.benefits,
        highlights: newPosting.highlights,
        description: newPosting.description,
        responsibilities: newPosting.responsibilities,
        required_skills: newPosting.requiredSkills,
        accepted_evidence_types: newPosting.acceptedEvidenceTypes,
        min_skillbridge_score: newPosting.minSkillbridgeScore,
        status: newPosting.status,
        is_demo: false,
      })
      .select()
      .single();

    if (error) {
      await saveCustomJobToRecruiterMetadata(recruiterId, newPosting);
      if (isTableMissing(error)) {
        return newPosting;
      }
      return newPosting;
    }

    const mapped = mapDbJobToPosting(inserted as DbJobRow);
    inMemoryJobs.set(mapped.id, mapped);
    return mapped;
  } catch (cause) {
    await saveCustomJobToRecruiterMetadata(recruiterId, newPosting);
    if (
      isTableMissing(cause) ||
      (cause instanceof Error && cause.message.includes("Konfigurasi Supabase"))
    ) {
      return newPosting;
    }
    return newPosting;
  }
}

export function validateJobPostingUpdateInput(
  recruiterId: string,
  jobId: string,
  data: Partial<CreateJobInput>,
): void {
  if (!recruiterId || typeof recruiterId !== "string" || recruiterId.trim().length === 0) {
    throw new Error("ID perekrut (recruiterId) wajib diisi.");
  }
  if (!jobId || typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new Error("ID lowongan (jobId) wajib diisi.");
  }
  if (data.title !== undefined) {
    if (typeof data.title !== "string" || data.title.trim().length === 0) {
      throw new Error("Judul lowongan (title) tidak boleh kosong.");
    }
  }
  if (data.field !== undefined) {
    const validFields: Field[] = ["informatics", "design", "marketing"];
    if (!validFields.includes(data.field)) {
      throw new Error("Bidang lowongan tidak valid (harus informatics, design, atau marketing).");
    }
  }
  if (data.employmentType !== undefined) {
    const validEmploymentTypes: EmploymentType[] = ["fulltime", "internship", "contract", "parttime"];
    if (!validEmploymentTypes.includes(data.employmentType)) {
      throw new Error("Tipe kerja tidak valid.");
    }
  }
  if (data.workplaceType !== undefined) {
    const validWorkplaceTypes: WorkplaceType[] = ["onsite", "hybrid", "remote"];
    if (!validWorkplaceTypes.includes(data.workplaceType)) {
      throw new Error("Tempat kerja tidak valid.");
    }
  }
  if (data.minEducation !== undefined) {
    const validMinEducations: MinEducation[] = ["smk", "diploma", "bachelor", "any"];
    if (!validMinEducations.includes(data.minEducation)) {
      throw new Error("Pendidikan minimal tidak valid.");
    }
  }
  if (data.experienceLevel !== undefined) {
    const validExperienceLevels: ExperienceLevel[] = ["fresh_graduate", "under_1_year", "1_to_2_years"];
    if (!validExperienceLevels.includes(data.experienceLevel)) {
      throw new Error("Tingkat pengalaman tidak valid.");
    }
  }
  if (data.compensationType !== undefined) {
    const validCompensationTypes: CompensationType[] = ["paid", "unpaid"];
    if (!validCompensationTypes.includes(data.compensationType)) {
      throw new Error("Tipe kompensasi tidak valid.");
    }
  }
  if (data.salaryMin !== undefined && data.salaryMin !== null) {
    if (typeof data.salaryMin !== "number" || data.salaryMin < 0) {
      throw new Error("Gaji minimum tidak boleh bernilai negatif.");
    }
  }
  if (
    data.salaryMin !== undefined &&
    data.salaryMin !== null &&
    data.salaryMax !== undefined &&
    data.salaryMax !== null
  ) {
    if (data.salaryMax < data.salaryMin) {
      throw new Error("Gaji maksimum tidak boleh lebih kecil dari gaji minimum.");
    }
  }
  if (data.highlights !== undefined) {
    if (!Array.isArray(data.highlights) || data.highlights.length === 0) {
      throw new Error("Highlights lowongan wajib memiliki minimal 1 poin (disarankan 3 poin).");
    }
  }
  if (data.responsibilities !== undefined) {
    if (!Array.isArray(data.responsibilities) || data.responsibilities.length === 0) {
      throw new Error("Tanggung jawab pekerjaan (responsibilities) wajib diisi.");
    }
  }
  if (data.requiredSkills !== undefined) {
    if (!Array.isArray(data.requiredSkills) || data.requiredSkills.length === 0) {
      throw new Error("Keahlian yang dibutuhkan (requiredSkills) wajib diisi.");
    }
  }
  if (data.minSkillbridgeScore !== undefined && data.minSkillbridgeScore !== null) {
    if (
      typeof data.minSkillbridgeScore !== "number" ||
      data.minSkillbridgeScore < 0 ||
      data.minSkillbridgeScore > 100
    ) {
      throw new Error("Skor minimal Skillbridge harus berupa angka antara 0 dan 100.");
    }
  }
  if (data.status !== undefined) {
    const validStatuses: JobStatus[] = ["active", "closed"];
    if (!validStatuses.includes(data.status)) {
      throw new Error("Status lowongan tidak valid (harus active atau closed).");
    }
  }
}

export async function updateJobPosting(
  recruiterId: string,
  jobId: string,
  data: Partial<CreateJobInput>,
): Promise<JobPosting> {
  validateJobPostingUpdateInput(recruiterId, jobId, data);

  const isMock = MOCK_JOBS_FIXTURE.some((j) => j.id === jobId);
  const isDemo = DEMO_JOBS.some((j) => j.id === jobId) || isMock;

  const updateInMemory = (): JobPosting => {
    const demoIndex = DEMO_JOBS.findIndex((j) => j.id === jobId);
    const mockIndex = MOCK_JOBS_FIXTURE.findIndex((j) => j.id === jobId);
    const existing =
      inMemoryJobs.get(jobId) ??
      (demoIndex !== -1 ? DEMO_JOBS[demoIndex] : null) ??
      (mockIndex !== -1 ? MOCK_JOBS_FIXTURE[mockIndex] : null);

    const minSalary = data.salaryMin !== undefined ? data.salaryMin : (existing?.salaryMin ?? null);
    const maxSalary = data.salaryMax !== undefined ? data.salaryMax : (existing?.salaryMax ?? null);
    if (
      minSalary !== null &&
      maxSalary !== null &&
      maxSalary < minSalary &&
      (data.compensationType === "paid" || (!data.compensationType && existing?.compensationType === "paid"))
    ) {
      throw new Error("Gaji maksimum tidak boleh lebih kecil dari gaji minimum.");
    }

    const updated: JobPosting = {
      id: jobId,
      recruiterId: existing?.recruiterId ?? recruiterId,
      companyName: existing?.companyName ?? "Perusahaan Mitra",
      companyLogo: data.companyLogo !== undefined ? data.companyLogo : existing?.companyLogo,
      title: data.title !== undefined ? data.title.trim() : (existing?.title ?? "Lowongan Pekerjaan"),
      field: data.field ?? existing?.field ?? "informatics",
      targetRole: data.targetRole ?? existing?.targetRole ?? "Junior Web Developer",
      employmentType: data.employmentType ?? existing?.employmentType ?? "fulltime",
      workplaceType: data.workplaceType ?? existing?.workplaceType ?? "hybrid",
      location: data.location !== undefined ? data.location.trim() : (existing?.location ?? "Indonesia"),
      minEducation: data.minEducation ?? existing?.minEducation ?? "smk",
      experienceLevel: data.experienceLevel ?? existing?.experienceLevel ?? "fresh_graduate",
      compensationType: data.compensationType ?? existing?.compensationType ?? "paid",
      salaryMin: minSalary,
      salaryMax: maxSalary,
      showSalary: data.showSalary !== undefined ? data.showSalary : (existing?.showSalary ?? true),
      benefits: data.benefits ?? existing?.benefits ?? [],
      highlights: data.highlights ?? existing?.highlights ?? ["Kesempatan berkarier menarik"],
      description: data.description !== undefined ? data.description : (existing?.description ?? ""),
      responsibilities: data.responsibilities ?? existing?.responsibilities ?? ["Melaksanakan tugas teknis"],
      requiredSkills: data.requiredSkills ?? existing?.requiredSkills ?? ["Keahlian teknis utama"],
      acceptedEvidenceTypes: data.acceptedEvidenceTypes ?? existing?.acceptedEvidenceTypes ?? ["github"],
      minSkillbridgeScore:
        data.minSkillbridgeScore !== undefined
          ? data.minSkillbridgeScore
          : (existing?.minSkillbridgeScore ?? 0),
      status: data.status ?? existing?.status ?? "active",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: existing?.isDemo ?? isDemo,
    };

    if (demoIndex !== -1) {
      DEMO_JOBS[demoIndex] = updated;
    }
    if (mockIndex !== -1) {
      MOCK_JOBS_FIXTURE[mockIndex] = updated;
    }
    inMemoryJobs.set(jobId, updated);
    deletedJobIds.delete(jobId);
    return updated;
  };

  if (isDemo) {
    return updateInMemory();
  }

  try {
    const db = createAdminSupabase();
    const dbUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.title !== undefined) dbUpdate.title = data.title.trim();
    if (data.field !== undefined) dbUpdate.field = data.field;
    if (data.targetRole !== undefined) dbUpdate.target_role = data.targetRole;
    if (data.employmentType !== undefined) dbUpdate.employment_type = data.employmentType;
    if (data.workplaceType !== undefined) dbUpdate.workplace_type = data.workplaceType;
    if (data.location !== undefined) dbUpdate.location = data.location.trim();
    if (data.minEducation !== undefined) dbUpdate.min_education = data.minEducation;
    if (data.experienceLevel !== undefined) dbUpdate.experience_level = data.experienceLevel;
    if (data.compensationType !== undefined) dbUpdate.compensation_type = data.compensationType;
    if (data.salaryMin !== undefined) dbUpdate.salary_min = data.salaryMin;
    if (data.salaryMax !== undefined) dbUpdate.salary_max = data.salaryMax;
    if (data.showSalary !== undefined) dbUpdate.show_salary = data.showSalary;
    if (data.benefits !== undefined) dbUpdate.benefits = data.benefits;
    if (data.highlights !== undefined) dbUpdate.highlights = data.highlights;
    if (data.description !== undefined) dbUpdate.description = data.description;
    if (data.responsibilities !== undefined) dbUpdate.responsibilities = data.responsibilities;
    if (data.requiredSkills !== undefined) dbUpdate.required_skills = data.requiredSkills;
    if (data.acceptedEvidenceTypes !== undefined) dbUpdate.accepted_evidence_types = data.acceptedEvidenceTypes;
    if (data.minSkillbridgeScore !== undefined) dbUpdate.min_skillbridge_score = data.minSkillbridgeScore;
    if (data.companyLogo !== undefined) dbUpdate.company_logo = data.companyLogo;
    if (data.status !== undefined) dbUpdate.status = data.status;

    const { data: updatedRow, error } = await db
      .from("job_postings")
      .update(dbUpdate)
      .eq("id", jobId)
      .eq("recruiter_id", recruiterId)
      .select()
      .maybeSingle();

    if (error) {
      if (isTableMissing(error)) {
        return updateInMemory();
      }
      throw new Error(`Gagal memperbarui lowongan: ${error.message}`);
    }

    if (!updatedRow) {
      if (inMemoryJobs.has(jobId)) {
        return updateInMemory();
      }
      throw new Error("Lowongan tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya.");
    }

    const posting = mapDbJobToPosting(updatedRow as DbJobRow);
    inMemoryJobs.set(jobId, posting);
    return posting;
  } catch (cause) {
    if (
      isTableMissing(cause) ||
      (cause instanceof Error && cause.message.includes("Konfigurasi Supabase"))
    ) {
      return updateInMemory();
    }
    throw cause;
  }
}

export async function deleteJobPosting(
  recruiterId: string,
  jobId: string,
): Promise<boolean> {
  if (!recruiterId || typeof recruiterId !== "string" || recruiterId.trim().length === 0) {
    throw new Error("ID perekrut (recruiterId) wajib diisi.");
  }
  if (!jobId || typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new Error("ID lowongan (jobId) wajib diisi.");
  }

  // Hapus dari inMemoryJobs dan tambahkan ke deletedJobIds
  deletedJobIds.add(jobId);
  inMemoryJobs.delete(jobId);
  for (const [appId, app] of inMemoryApplications.entries()) {
    if (app.jobId === jobId) {
      inMemoryApplications.delete(appId);
    }
  }
  const demoIndex = DEMO_JOBS.findIndex((j) => j.id === jobId);
  if (demoIndex !== -1) {
    DEMO_JOBS.splice(demoIndex, 1);
  }

  // Jika recruiterId ada, coba ambil user_metadata akun recruiter via auth.admin.getUserById(recruiterId)
  if (recruiterId) {
    try {
      const admin = createAdminSupabase();
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(recruiterId);
      if (!userError && userData?.user) {
        const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
        const currentDeleted: string[] = Array.isArray(metadata.deleted_job_ids)
          ? (metadata.deleted_job_ids as string[])
          : [];
        const updatedDeleted = Array.from(new Set([...currentDeleted, jobId]));
        const currentCustom: JobPosting[] = Array.isArray(metadata.custom_jobs)
          ? (metadata.custom_jobs as JobPosting[])
          : [];
        const updatedCustom = currentCustom.filter((j) => j && j.id !== jobId);

        await admin.auth.admin.updateUserById(recruiterId, {
          user_metadata: {
            ...metadata,
            deleted_job_ids: updatedDeleted,
            custom_jobs: updatedCustom,
          },
        });
      }
    } catch {
      // Fail-safe jika auth admin unconfigured atau user tidak ada
    }
  }

  // Lakukan query delete ke Supabase job_postings (fail-safe jika table missing)
  try {
    const db = createAdminSupabase();
    try {
      await db.from("job_applications").delete().eq("job_id", jobId);
    } catch {
      // Abaikan jika tabel job_applications tidak ada
    }

    const { error } = await db
      .from("job_postings")
      .delete()
      .eq("id", jobId)
      .eq("recruiter_id", recruiterId)
      .select("id");

    if (error && !isTableMissing(error) && process.env.NODE_ENV !== "test") {
      console.warn("Gagal menghapus lowongan dari database:", error.message);
    }
  } catch (cause) {
    if (
      !isTableMissing(cause) &&
      !(cause instanceof Error && cause.message.includes("Konfigurasi Supabase")) &&
      process.env.NODE_ENV !== "test"
    ) {
      console.warn("Gagal mengeksekusi delete ke database:", cause);
    }
  }

  return true;
}

export type ApplyJobInput = {
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  resumeFileName?: string;
  resumeUrl?: string;
  coverLetterMode?: "upload" | "write" | "none";
  coverLetterFileName?: string;
  assessmentId?: string | null;
  skillbridgeScore?: number | null;
  portfolioUrl?: string;
  coverLetter?: string;
};

export function validateApplicationInput(candidateId: string, data: ApplyJobInput): void {
  if (!candidateId || typeof candidateId !== "string" || candidateId.trim().length === 0) {
    throw new Error("ID kandidat (candidateId) wajib diisi.");
  }
  if (!data.jobId || typeof data.jobId !== "string" || data.jobId.trim().length === 0) {
    throw new Error("ID lowongan (jobId) wajib diisi.");
  }
  if (
    !data.candidateName ||
    typeof data.candidateName !== "string" ||
    data.candidateName.trim().length === 0
  ) {
    throw new Error("Nama kandidat wajib diisi.");
  }
  if (
    !data.candidateEmail ||
    typeof data.candidateEmail !== "string" ||
    !data.candidateEmail.includes("@")
  ) {
    throw new Error("Email kandidat harus berupa alamat email yang valid.");
  }
  if (data.skillbridgeScore !== undefined && data.skillbridgeScore !== null) {
    if (
      typeof data.skillbridgeScore !== "number" ||
      data.skillbridgeScore < 0 ||
      data.skillbridgeScore > 100
    ) {
      throw new Error("Skor Skillbridge harus berupa angka antara 0 dan 100.");
    }
  }
}

async function findAssessment(assessmentId: string): Promise<AssessmentResult | null> {
  const demo = DEMO_SEEDS.find((s) => s.id === assessmentId);
  if (demo) return demo;

  try {
    const db = createAdminSupabase();
    const { data: asm, error } = await db
      .from("assessments")
      .select(`
        id,
        created_at,
        rubric_version,
        evidence_sufficiency,
        final_score,
        strengths,
        gaps,
        limitations,
        rubrics (
          target_role
        ),
        evidence (
          source_url,
          evidence_type
        )
      `)
      .eq("id", assessmentId)
      .maybeSingle();

    if (!error && asm) {
      const rubric = asm.rubrics as unknown as { target_role: Role } | null;
      const ev = asm.evidence as unknown as {
        source_url?: string;
        evidence_type?: "github" | "image" | "pdf";
      } | null;
      return {
        id: asm.id,
        createdAt: asm.created_at,
        role: rubric?.target_role ?? "Junior Web Developer",
        sourceUrl: ev?.source_url ?? "",
        evidenceType: ev?.evidence_type ?? "github",
        rubric_version: (asm.rubric_version as "1.0" | "1.1") ?? "1.1",
        evidence_sufficiency: asm.evidence_sufficiency as
          | "sufficient"
          | "insufficient_evidence",
        finalScore: asm.final_score !== null ? Number(asm.final_score) : null,
        strengths: Array.isArray(asm.strengths) ? (asm.strengths as string[]) : [],
        gaps: Array.isArray(asm.gaps) ? (asm.gaps as string[]) : [],
        limitations: Array.isArray(asm.limitations)
          ? (asm.limitations as string[])
          : [],
        criteria: [],
      };
    }
  } catch {
    // Non-fatal
  }
  return null;
}

export async function applyToJob(
  candidateId: string,
  data: ApplyJobInput,
): Promise<JobApplication> {
  validateApplicationInput(candidateId, data);

  const job = await getJobPostingById(data.jobId, { checkMockFixture: true });
  if (!job) {
    throw new Error("Lowongan pekerjaan tidak ditemukan.");
  }

  // Cari recruiterId dari job.recruiterId atau dari metadata pemilik lowongan / in-memory
  let recruiterId = job.recruiterId;
  if (!recruiterId && inMemoryJobs.has(job.id)) {
    recruiterId = inMemoryJobs.get(job.id)?.recruiterId;
  }
  if (!recruiterId) {
    try {
      const admin = createAdminSupabase();
      const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
      if (!listError && usersData && Array.isArray(usersData.users)) {
        for (const u of usersData.users) {
          const meta = (u.user_metadata || {}) as Record<string, unknown>;
          if (Array.isArray(meta.custom_jobs)) {
            const found = meta.custom_jobs.some(
              (cj) => cj && typeof cj === "object" && cj.id === job.id,
            );
            if (found) {
              recruiterId = u.id;
              break;
            }
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  let assessment: AssessmentResult | null = null;
  if (data.assessmentId) {
    assessment = await findAssessment(data.assessmentId);
  }

  const fitEvaluation = await evaluateJobFit(job, {
    name: data.candidateName,
    email: data.candidateEmail,
    assessment,
    portfolioUrl: data.portfolioUrl,
    coverLetter: data.coverLetter,
  });

  const newApplication: JobApplication = {
    id: crypto.randomUUID(),
    jobId: data.jobId,
    recruiterId: recruiterId ?? undefined,
    candidateId,
    candidateName: data.candidateName.trim(),
    candidateEmail: data.candidateEmail.trim(),
    phone: data.phone?.trim() || undefined,
    location: data.location?.trim() || undefined,
    photoUrl: data.photoUrl?.trim() || undefined,
    resumeFileName: data.resumeFileName?.trim() || undefined,
    resumeUrl: data.resumeUrl?.trim() || undefined,
    coverLetterMode: data.coverLetterMode || undefined,
    coverLetterFileName: data.coverLetterFileName?.trim() || undefined,
    assessmentId: data.assessmentId ?? null,
    skillbridgeScore: fitEvaluation.score,
    portfolioUrl: data.portfolioUrl?.trim() ?? undefined,
    coverLetter: data.coverLetter?.trim() ?? undefined,
    fitEvaluation,
    status: "pending",
    appliedAt: new Date().toISOString(),
    isDemo: Boolean(job.isDemo),
    jobTitle: job.title,
    companyName: job.companyName,
  };

  applicationFitMap.set(newApplication.id, fitEvaluation);
  inMemoryApplications.set(newApplication.id, newApplication);
  if (recruiterId) {
    applicationRecruiterMap.set(newApplication.id, recruiterId);
  }

  let inserted: unknown = null;
  try {
    const db = createAdminSupabase();
    const basePayload = {
      id: newApplication.id,
      job_id: data.jobId,
      candidate_id: candidateId,
      candidate_name: newApplication.candidateName,
      candidate_email: newApplication.candidateEmail,
      phone: newApplication.phone ?? null,
      location: newApplication.location ?? null,
      photo_url: newApplication.photoUrl ?? null,
      resume_file_name: newApplication.resumeFileName ?? null,
      resume_url: newApplication.resumeUrl ?? null,
      cover_letter_mode: newApplication.coverLetterMode ?? null,
      cover_letter_file_name: newApplication.coverLetterFileName ?? null,
      assessment_id: newApplication.assessmentId,
      skillbridge_score: newApplication.skillbridgeScore,
      portfolio_url: newApplication.portfolioUrl ?? null,
      cover_letter: newApplication.coverLetter ?? null,
      status: newApplication.status,
      is_demo: false,
    };

    const resWithFit = await db
      .from("job_applications")
      .insert({
        ...basePayload,
        fit_evaluation: fitEvaluation,
      })
      .select(`
        *,
        job_postings (
          id,
          title,
          company_name,
          recruiter_id
        )
      `)
      .single();

    if (!resWithFit.error && resWithFit.data) {
      inserted = resWithFit.data;
    } else if (
      resWithFit.error &&
      (resWithFit.error.code === "42703" ||
        resWithFit.error.message.includes("fit_evaluation") ||
        resWithFit.error.message.includes("phone") ||
        resWithFit.error.message.includes("column"))
    ) {
      const resWithoutFit = await db
        .from("job_applications")
        .insert(basePayload)
        .select(`
          *,
          job_postings (
            id,
            title,
            company_name,
            recruiter_id
          )
        `)
        .single();

      if (!resWithoutFit.error && resWithoutFit.data) {
        inserted = resWithoutFit.data;
      } else if (
        resWithoutFit.error &&
        (resWithoutFit.error.code === "42703" ||
          resWithoutFit.error.message.includes("phone") ||
          resWithoutFit.error.message.includes("column"))
      ) {
        const legacyPayload = {
          id: newApplication.id,
          job_id: data.jobId,
          candidate_id: candidateId,
          candidate_name: newApplication.candidateName,
          candidate_email: newApplication.candidateEmail,
          assessment_id: newApplication.assessmentId,
          skillbridge_score: newApplication.skillbridgeScore,
          portfolio_url: newApplication.portfolioUrl ?? null,
          cover_letter: newApplication.coverLetter ?? null,
          status: newApplication.status,
          is_demo: false,
        };
        const resLegacy = await db
          .from("job_applications")
          .insert(legacyPayload)
          .select(`
            *,
            job_postings (
              id,
              title,
              company_name,
              recruiter_id
            )
          `)
          .single();

        if (!resLegacy.error && resLegacy.data) {
          inserted = resLegacy.data;
        } else if (resLegacy.error && !isTableMissing(resLegacy.error)) {
          throw new Error(`Gagal mengirimkan lamaran: ${resLegacy.error.message}`);
        }
      } else if (resWithoutFit.error && !isTableMissing(resWithoutFit.error)) {
        throw new Error(`Gagal mengirimkan lamaran: ${resWithoutFit.error.message}`);
      }
    } else if (resWithFit.error && !isTableMissing(resWithFit.error)) {
      throw new Error(`Gagal mengirimkan lamaran: ${resWithFit.error.message}`);
    }
  } catch (cause) {
    if (
      !isTableMissing(cause) &&
      !(
        cause instanceof Error &&
        (cause.message.includes("Konfigurasi Supabase") ||
          cause.message.toLowerCase().includes("supabase") ||
          cause.message.toLowerCase().includes("fetch failed"))
      )
    ) {
      throw cause;
    }
  }

  let finalApp = newApplication;
  if (inserted) {
    const mapped = mapDbApplication(inserted as DbApplicationRow);
    finalApp = {
      ...newApplication,
      ...mapped,
      phone: mapped.phone ?? newApplication.phone,
      location: mapped.location ?? newApplication.location,
      photoUrl: mapped.photoUrl ?? newApplication.photoUrl,
      resumeFileName: mapped.resumeFileName ?? newApplication.resumeFileName,
      resumeUrl: mapped.resumeUrl ?? newApplication.resumeUrl,
      coverLetterMode: mapped.coverLetterMode ?? newApplication.coverLetterMode,
      coverLetterFileName: mapped.coverLetterFileName ?? newApplication.coverLetterFileName,
      fitEvaluation: mapped.fitEvaluation ?? fitEvaluation,
      recruiterId: recruiterId ?? mapped.recruiterId,
    };
    inMemoryApplications.set(finalApp.id, finalApp);
    if (recruiterId) {
      applicationRecruiterMap.set(finalApp.id, recruiterId);
    }
  }

  // Persistensi ke Supabase Auth Metadata:
  // 1. Simpan ke metadata recruiter agar HR dapat melihat lamaran secara persisten di cloud Supabase
  if (recruiterId) {
    await saveApplicationToRecruiterMetadata(recruiterId, finalApp);
  }
  // 2. Simpan ke metadata kandidat agar kandidat dapat melihat riwayat lamaran secara persisten
  await saveApplicationToCandidateMetadata(candidateId, finalApp);

  return finalApp;
}

export async function getJobApplicationsForRecruiter(
  recruiterId: string,
  jobId?: string,
): Promise<JobApplication[]> {
  if (!recruiterId || typeof recruiterId !== "string") return [];

  let dbApps: JobApplication[] = [];
  let metadataApps: JobApplication[] = [];
  let metadataDeletedJobIds: string[] = [];
  let metadataDeletedAppIds: string[] = [];
  const recruiterJobIds = new Set<string>();

  // 1. Ambil data recruiter dari user_metadata
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(recruiterId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      if (Array.isArray(metadata.deleted_job_ids)) {
        metadataDeletedJobIds = metadata.deleted_job_ids.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        );
      }
      if (Array.isArray(metadata.deleted_application_ids)) {
        metadataDeletedAppIds = metadata.deleted_application_ids.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        );
      }
      if (Array.isArray(metadata.custom_jobs)) {
        for (const j of metadata.custom_jobs) {
          if (j && typeof j === "object" && typeof j.id === "string") {
            recruiterJobIds.add(j.id);
          }
        }
      }
      if (Array.isArray(metadata.job_applications)) {
        metadataApps = metadata.job_applications.filter(
          (a): a is JobApplication => Boolean(a && typeof a === "object" && typeof a.id === "string"),
        );
        for (const a of metadataApps) {
          if (a.jobId) recruiterJobIds.add(a.jobId);
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  // 2. Tambahkan lowongan milik recruiter dari memori
  for (const [id, j] of inMemoryJobs.entries()) {
    if (j.recruiterId === recruiterId) {
      recruiterJobIds.add(id);
    }
  }

  const allDeletedJobIds = new Set<string>([
    ...deletedJobIds,
    ...metadataDeletedJobIds,
  ]);
  const deletedAppIds = new Set<string>(metadataDeletedAppIds);

  // 3. Query DB jika ada tabel job_applications
  try {
    const db = createAdminSupabase();
    let query = db
      .from("job_applications")
      .select(`
        *,
        job_postings!inner (
          id,
          title,
          company_name,
          recruiter_id
        )
      `)
      .eq("job_postings.recruiter_id", recruiterId);

    if (jobId) {
      query = query.eq("job_id", jobId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      dbApps = data.map((d) => mapDbApplication(d as DbApplicationRow));
      for (const d of data) {
        const row = d as DbApplicationRow;
        if (row.job_id) recruiterJobIds.add(row.job_id);
      }
    }
  } catch {
    // Graceful fallback
  }

  // 4. Jika jobId spesifik diminta, verifikasi bahwa lowongan tersebut milik recruiter
  if (jobId) {
    if (!recruiterJobIds.has(jobId)) {
      const job = await getJobPostingById(jobId, { recruiterId, checkMockFixture: true });
      if (job) {
        if (job.recruiterId && job.recruiterId !== recruiterId) {
          // Lowongan ini milik recruiter lain -> kembalikan array kosong (isolasi data ketat)
          return [];
        }
        if (job.recruiterId === recruiterId || job.isDemo) {
          recruiterJobIds.add(jobId);
        }
      } else {
        // Lowongan tidak ditemukan atau dihapus
        return [];
      }
    }
  }

  // 5. Filter dbApps
  const filteredDb = dbApps.filter(
    (a) => !allDeletedJobIds.has(a.jobId) && !deletedAppIds.has(a.id) && (!jobId || a.jobId === jobId),
  );

  // 6. Filter metadataApps (dari user_metadata.job_applications)
  const filteredMeta = metadataApps.filter(
    (a) => !allDeletedJobIds.has(a.jobId) && !deletedAppIds.has(a.id) && (!jobId || a.jobId === jobId),
  );

  // 7. Filter in-memory applications: HANYA yang terkait dengan recruiterId atau lowongan milik recruiter ini
  const filteredInMem = Array.from(inMemoryApplications.values()).filter((a) => {
    if (allDeletedJobIds.has(a.jobId) || deletedAppIds.has(a.id)) return false;
    if (jobId && a.jobId !== jobId) return false;
    if (a.isDemo) return false; // Demo apps ditangani tersendiri lewat demoApps
    const appRecruiter = a.recruiterId || applicationRecruiterMap.get(a.id);
    if (appRecruiter) {
      return appRecruiter === recruiterId;
    }
    return recruiterJobIds.has(a.jobId) || inMemoryJobs.get(a.jobId)?.recruiterId === recruiterId;
  });

  // 8. Demo applications (jika ada di DEMO_APPLICATIONS)
  const filteredDemo = DEMO_APPLICATIONS.filter((a) => {
    if (allDeletedJobIds.has(a.jobId) || deletedAppIds.has(a.id)) return false;
    if (jobId && a.jobId !== jobId) return false;
    return true;
  });

  // 9. Gabungkan tanpa duplikat berdasarkan ID (DB > Metadata > In-Memory > Demo)
  const seenIds = new Set<string>();
  const combined: JobApplication[] = [];

  for (const app of filteredDb) {
    if (!seenIds.has(app.id)) {
      seenIds.add(app.id);
      combined.push(app);
    }
  }

  for (const app of filteredMeta) {
    if (!seenIds.has(app.id)) {
      seenIds.add(app.id);
      inMemoryApplications.set(app.id, app);
      applicationRecruiterMap.set(app.id, recruiterId);
      combined.push(app);
    }
  }

  for (const app of filteredInMem) {
    if (!seenIds.has(app.id)) {
      seenIds.add(app.id);
      combined.push(app);
    }
  }

  for (const app of filteredDemo) {
    if (!seenIds.has(app.id)) {
      seenIds.add(app.id);
      combined.push(app);
    }
  }

  return combined.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

export async function getJobApplicationsForCandidate(
  candidateId: string,
): Promise<JobApplication[]> {
  if (!candidateId || typeof candidateId !== "string") return [];

  let dbApps: JobApplication[] = [];
  let metadataApps: JobApplication[] = [];

  // 1. Baca dari candidate user_metadata.my_applications
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(candidateId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      if (Array.isArray(metadata.my_applications)) {
        metadataApps = metadata.my_applications.filter(
          (a): a is JobApplication => Boolean(a && typeof a === "object" && typeof a.id === "string"),
        );
      }
    }
  } catch {
    // Graceful fallback
  }

  // 2. Baca dari DB jika ada
  try {
    const db = createAdminSupabase();
    const { data, error } = await db
      .from("job_applications")
      .select(`
        *,
        job_postings (
          title,
          company_name
        )
      `)
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbApps = data.map((d) => mapDbApplication(d as DbApplicationRow));
    }
  } catch {
    // Graceful fallback
  }

  const demoApps = DEMO_APPLICATIONS.filter((a) => a.candidateId === candidateId);
  const inMemApps = Array.from(inMemoryApplications.values()).filter((a) => a.candidateId === candidateId);

  const seenIds = new Set<string>();
  const combined: JobApplication[] = [];

  for (const a of dbApps) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      combined.push(a);
    }
  }

  for (const a of metadataApps) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      inMemoryApplications.set(a.id, a);
      combined.push(a);
    }
  }

  for (const a of inMemApps) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      combined.push(a);
    }
  }

  for (const a of demoApps) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      combined.push(a);
    }
  }

  return combined.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

export async function updateApplicationStatus(
  recruiterId: string,
  applicationId: string,
  status: ApplicationStatus,
): Promise<JobApplication> {
  const validStatuses: ApplicationStatus[] = ["pending", "reviewed", "shortlisted", "accepted", "rejected"];
  if (!validStatuses.includes(status)) {
    throw new Error("Status lamaran tidak valid.");
  }
  if (!recruiterId || typeof recruiterId !== "string" || recruiterId.trim().length === 0) {
    throw new Error("ID perekrut wajib diisi.");
  }
  if (!applicationId || typeof applicationId !== "string" || applicationId.trim().length === 0) {
    throw new Error("ID lamaran wajib diisi.");
  }

  // 1. Update demo applications (jika sedang dalam skenario pengujian fixture)
  const demoIdx = DEMO_APPLICATIONS.findIndex((a) => a.id === applicationId);
  if (demoIdx !== -1) {
    DEMO_APPLICATIONS[demoIdx] = {
      ...DEMO_APPLICATIONS[demoIdx],
      status,
    };
    return DEMO_APPLICATIONS[demoIdx];
  }

  let dbApp: JobApplication | null = null;
  let metaApp: JobApplication | null = null;
  let candidateIdToUpdate: string | undefined;

  // 2. Update status di database (jika tabel job_applications ada dan lowongan milik recruiterId)
  try {
    const db = createAdminSupabase();
    const { data, error } = await db
      .from("job_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId)
      .select(`
        *,
        job_postings!inner (
          id,
          title,
          company_name,
          recruiter_id
        )
      `)
      .eq("job_postings.recruiter_id", recruiterId)
      .maybeSingle();

    if (!error && data) {
      dbApp = mapDbApplication(data as DbApplicationRow);
      inMemoryApplications.set(dbApp.id, dbApp);
      candidateIdToUpdate = dbApp.candidateId;
    }
  } catch {
    // Graceful fail-safe fallback
  }

  // 3. Update status di user_metadata.job_applications milik recruiter
  try {
    const admin = createAdminSupabase();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(recruiterId);
    if (!userError && userData?.user) {
      const metadata = (userData.user.user_metadata || {}) as Record<string, unknown>;
      const currentApps: JobApplication[] = Array.isArray(metadata.job_applications)
        ? (metadata.job_applications as JobApplication[])
        : [];
      const targetIdx = currentApps.findIndex(
        (a) => a && typeof a === "object" && a.id === applicationId,
      );
      if (targetIdx !== -1) {
        metaApp = { ...currentApps[targetIdx], status };
        currentApps[targetIdx] = metaApp;
        candidateIdToUpdate = metaApp.candidateId;
        await admin.auth.admin.updateUserById(recruiterId, {
          user_metadata: {
            ...metadata,
            job_applications: currentApps,
          },
        });
      }
    }
  } catch {
    // Fail-safe
  }

  // 4. Update status in memory (jika ada di memori dan diverifikasi milik recruiter ini)
  const memApp = inMemoryApplications.get(applicationId);
  let updatedMemApp: JobApplication | null = null;
  if (memApp) {
    const appRecruiter = memApp.recruiterId || applicationRecruiterMap.get(memApp.id);
    const jobRecruiter = inMemoryJobs.get(memApp.jobId)?.recruiterId;
    const isOwner =
      appRecruiter === recruiterId ||
      jobRecruiter === recruiterId ||
      Boolean(metaApp) ||
      Boolean(dbApp);

    if (isOwner) {
      memApp.status = status;
      inMemoryApplications.set(applicationId, memApp);
      updatedMemApp = memApp;
      if (!candidateIdToUpdate) {
        candidateIdToUpdate = memApp.candidateId;
      }
    } else if (!metaApp && !dbApp) {
      // Ada di memori tapi milik recruiter lain -> tolak akses!
      throw new Error("Lamaran tidak ditemukan atau Anda tidak memiliki akses.");
    }
  }

  const finalResult = dbApp || metaApp || updatedMemApp;
  if (finalResult) {
    inMemoryApplications.set(finalResult.id, finalResult);
    if (candidateIdToUpdate) {
      await updateApplicationStatusInCandidateMetadata(candidateIdToUpdate, applicationId, status);
    }
    return finalResult;
  }

  throw new Error("Lamaran tidak ditemukan atau Anda tidak memiliki akses.");
}

