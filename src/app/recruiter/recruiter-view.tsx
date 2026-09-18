"use client";

import Link from "next/link";
import { useEffect, useState, useId } from "react";
import { authHeaders, getSupabase } from "@/lib/auth-client";
import type {
  TalentCandidate,
  JobPosting,
  JobApplication,
  Field,
  MinEducation,
  EmploymentType,
  WorkplaceType,
  ExperienceLevel,
  CompensationType,
  ApplicationStatus,
} from "@/lib/types";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "candidate" }
  | { status: "recruiter"; user: { id: string; email?: string; companyName?: string } };

const FIELDS = [
  { id: "all", label: "Semua Bidang" },
  { id: "informatics", label: "Informatika" },
  { id: "design", label: "DKV" },
  { id: "marketing", label: "Pemasaran" },
] as const;

const SCORE_FILTERS = [
  { value: 0, label: "Semua Skor" },
  { value: 75, label: "Siap Kerja (Skor ≥ 75)" },
  { value: 50, label: "Menengah (Skor ≥ 50)" },
] as const;

function getEvidenceLabel(type: string, sourceUrl?: string): string {
  const source = sourceUrl ? ` (${sourceUrl})` : "";
  switch (type) {
    case "github":
      return `Repositori GitHub${source}`;
    case "image":
      return `Karya Desain PNG/JPG${source}`;
    case "pdf":
      return `Laporan Kasus PDF${source}`;
    default:
      return `Berkas Bukti Portofolio${source}`;
  }
}

function getFieldLabel(field: string): string {
  switch (field) {
    case "informatics":
      return "Informatika";
    case "design":
      return "DKV";
    case "marketing":
      return "Pemasaran";
    default:
      return field;
  }
}

function getFieldBg(field: string): string {
  switch (field) {
    case "informatics":
      return "#e0f2fe";
    case "design":
      return "#fce7f3";
    case "marketing":
      return "#fef3c7";
    default:
      return "#f3f4f6";
  }
}

function getApplicationBadge(status: ApplicationStatus) {
  switch (status) {
    case "pending":
      return { label: "Terkirim", bg: "#f3f4f6", color: "#374151" };
    case "reviewed":
      return { label: "Ditinjau HR", bg: "#e0f2fe", color: "#0369a1" };
    case "shortlisted":
      return { label: "Shortlisted", bg: "#e6f4ea", color: "#137333" };
    case "rejected":
      return { label: "Tidak Lolos", bg: "#fce8e6", color: "#c5221f" };
    case "accepted":
      return { label: "Diterima", bg: "#dcfce7", color: "#15803d" };
    default:
      return { label: status, bg: "#f3f4f6", color: "#374151" };
  }
}

export default function RecruiterView() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<"talent-pool" | "my-jobs">("talent-pool");

  // Talent Pool State
  const [selectedField, setSelectedField] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Recruiter Jobs State
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [applications, setApplications] = useState<JobApplication[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<JobPosting | null>(null);

  // Form IDs
  const titleInputId = useId();
  const companyInputId = useId();
  const fieldSelectId = useId();
  const targetRoleInputId = useId();
  const employmentTypeSelectId = useId();
  const workplaceTypeSelectId = useId();
  const locationInputId = useId();
  const minEduSelectId = useId();
  const expLevelSelectId = useId();
  const compTypeSelectId = useId();
  const salaryMinInputId = useId();
  const salaryMaxInputId = useId();
  const minScoreInputId = useId();
  const hl1InputId = useId();
  const hl2InputId = useId();
  const hl3InputId = useId();
  const descInputId = useId();
  const respInputId = useId();
  const skillsInputId = useId();
  const benefitsInputId = useId();

  // Create Job Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formField, setFormField] = useState<Field>("informatics");
  const [formTargetRole, setFormTargetRole] = useState("Junior Web Developer");
  const [formEmploymentType, setFormEmploymentType] = useState<EmploymentType>("fulltime");
  const [formWorkplaceType, setFormWorkplaceType] = useState<WorkplaceType>("hybrid");
  const [formLocation, setFormLocation] = useState("Jakarta Selatan, DKI Jakarta");
  const [formMinEdu, setFormMinEdu] = useState<MinEducation>("smk");
  const [formExpLevel, setFormExpLevel] = useState<ExperienceLevel>("fresh_graduate");
  const [formCompType, setFormCompType] = useState<CompensationType>("paid");
  const [formSalaryMin, setFormSalaryMin] = useState<string>("5000000");
  const [formSalaryMax, setFormSalaryMax] = useState<string>("7500000");
  const [formShowSalary, setFormShowSalary] = useState(true);
  const [formMinScore, setFormMinScore] = useState<number>(60);
  const [formHighlight1, setFormHighlight1] = useState("Ramah Lulusan SMK & Fresh Graduate Berbasis Portofolio Riil");
  const [formHighlight2, setFormHighlight2] = useState("Mentoring 1-on-1 Berkala Bersama Senior Engineer");
  const [formHighlight3, setFormHighlight3] = useState("Rentang Gaji Transparan & Jalur Karier Jelas");
  const [formDesc, setFormDesc] = useState("Mencari talenta muda berbakat yang berfokus pada karya nyata.");
  const [formResponsibilities, setFormResponsibilities] = useState("Mengembangkan antarmuka web responsif\nMenjaga kebersihan dan dokumentasi kode\nBerkolaborasi dalam tim teknik");
  const [formRequiredSkills, setFormRequiredSkills] = useState("React, Next.js, TypeScript, Tailwind CSS, Git");
  const [formBenefits, setFormBenefits] = useState("BPJS Kesehatan, Tunjangan Internet, Laptop Perusahaan");
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [jobSubmitError, setJobSubmitError] = useState("");
  const [jobSuccessMessage, setJobSuccessMessage] = useState("");

  // Auth initialization
  useEffect(() => {
    let active = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        setAuthState({ status: "unauthenticated" });
        return;
      }
      const role =
        data.session.user.user_metadata?.role ||
        data.session.user.user_metadata?.account_role;
      if (role === "recruiter") {
        const company = (data.session.user.user_metadata?.company_name as string) || "PT Solusi Digital Pratama";
        setAuthState({
          status: "recruiter",
          user: {
            id: data.session.user.id,
            email: data.session.user.email,
            companyName: company,
          },
        });
        setFormCompany(company);
      } else {
        setAuthState({ status: "candidate" });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setAuthState({ status: "unauthenticated" });
        return;
      }
      const role =
        session.user.user_metadata?.role ||
        session.user.user_metadata?.account_role;
      if (role === "recruiter") {
        const company = (session.user.user_metadata?.company_name as string) || "PT Solusi Digital Pratama";
        setAuthState({
          status: "recruiter",
          user: {
            id: session.user.id,
            email: session.user.email,
            companyName: company,
          },
        });
        setFormCompany(company);
      } else {
        setAuthState({ status: "candidate" });
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch Talent Pool
  useEffect(() => {
    if (authState.status !== "recruiter" || activeTab !== "talent-pool") return;

    let active = true;
    const params = new URLSearchParams();
    if (selectedField !== "all") params.set("field", selectedField);
    if (selectedScore > 0) params.set("minScore", String(selectedScore));

    authHeaders()
      .then((headers) => {
        if (!active) return null;
        setError("");
        return fetch(`/api/talent-pool?${params.toString()}`, { headers });
      })
      .then(async (response) => {
        if (!response) return;
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Gagal memuat talent pool dari API.");
        }
        return response.json();
      })
      .then((data) => {
        if (active && data) {
          setCandidates(data);
        }
      })
      .catch((err) => {
        if (active) {
          setCandidates([]);
          setError(err instanceof Error ? err.message : "Gagal memuat talent pool.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authState.status, activeTab, selectedField, selectedScore]);

  // Fetch Recruiter Jobs & Applications
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (authState.status !== "recruiter" || activeTab !== "my-jobs") return;
    let active = true;

    Promise.all([
      fetch("/api/jobs").then((r) => (r.ok ? r.json() : [])),
      authHeaders().then((headers) =>
        fetch("/api/jobs/applications", { headers }).then((r) => (r.ok ? r.json() : [])),
      ),
    ])
      .then(([jobsData, appsData]: [JobPosting[], JobApplication[]]) => {
        if (active) {
          setJobs(jobsData);
          setApplications(appsData);
          setJobsError("");
        }
      })
      .catch((err) => {
        if (active) {
          setJobsError(err instanceof Error ? err.message : "Gagal memuat lowongan.");
        }
      })
      .finally(() => {
        if (active) {
          setJobsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authState.status, activeTab, refreshTrigger]);

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (authState.status !== "recruiter") return;

    setIsSubmittingJob(true);
    setJobSubmitError("");
    setJobSuccessMessage("");

    try {
      const headers = await authHeaders();

      const highlights = [formHighlight1.trim(), formHighlight2.trim(), formHighlight3.trim()].filter(Boolean);
      const responsibilities = formResponsibilities
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const requiredSkills = formRequiredSkills
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const benefits = formBenefits
        .split(/[,;\n]/)
        .map((b) => b.trim())
        .filter(Boolean);

      const payload = {
        title: formTitle.trim(),
        companyName: formCompany.trim() || authState.user.companyName || "Perusahaan Mitra",
        field: formField,
        targetRole: formTargetRole.trim(),
        employmentType: formEmploymentType,
        workplaceType: formWorkplaceType,
        location: formLocation.trim(),
        minEducation: formMinEdu,
        experienceLevel: formExpLevel,
        compensationType: formCompType,
        salaryMin: formCompType === "paid" && formSalaryMin ? Number(formSalaryMin) : null,
        salaryMax: formCompType === "paid" && formSalaryMax ? Number(formSalaryMax) : null,
        showSalary: formShowSalary,
        highlights: highlights.length > 0 ? highlights : ["Peluang berkembang pesat"],
        description: formDesc.trim(),
        responsibilities: responsibilities.length > 0 ? responsibilities : ["Melaksanakan tugas teknis dengan baik"],
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["Keahlian terkait"],
        benefits,
        minSkillbridgeScore: Number(formMinScore) || 0,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat lowongan pekerjaan.");
      }

      setJobSuccessMessage(`Lowongan "${payload.title}" berhasil dipublikasikan!`);
      setIsCreateModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setJobSubmitError(err instanceof Error ? err.message : "Gagal memproses pembuatan lowongan.");
    } finally {
      setIsSubmittingJob(false);
    }
  }

  if (authState.status === "loading") {
    return (
      <section className="section" style={{ paddingTop: "2rem", textAlign: "center" }}>
        <p className="hint">Memeriksa hak akses perekrut...</p>
      </section>
    );
  }

  if (authState.status === "unauthenticated") {
    return (
      <section className="section" style={{ paddingTop: "2rem" }}>
        <div
          className="panel"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "2.5rem 2rem",
            textAlign: "center",
            borderLeft: "4px solid var(--ink)",
          }}
        >
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>
            Akses Khusus Perekrut / HR
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: "2rem", lineHeight: 1.6 }}>
            Silakan masuk dengan akun Perekrut / HR untuk mengakses Talent Pool dan manajemen lowongan kerja.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link className="button" href="/auth?next=/recruiter&role=recruiter">
              Masuk
            </Link>
            <Link
              className="button secondary"
              href="/auth?mode=signup&role=recruiter&next=/recruiter"
            >
              Daftar
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (authState.status === "candidate") {
    return (
      <section className="section" style={{ paddingTop: "2rem" }}>
        <div
          className="panel"
          role="alert"
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            padding: "2.5rem 2rem",
            borderLeft: "4px solid #f59e0b",
            background: "#fffbeb",
          }}
        >
          <h2 style={{ fontSize: "1.35rem", marginBottom: "0.75rem", color: "#92400e" }}>
            Akses Terbatas
          </h2>
          <p style={{ color: "#78350f", marginBottom: "1.75rem", lineHeight: 1.6 }}>
            Akses Terbatas: Halaman Portal HR khusus untuk akun Perekrut / HR perusahaan mitra. Akun Anda saat ini terdaftar sebagai Kandidat.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Link className="button" href="/jobs">
              Ke Bursa Lowongan
            </Link>
            <Link className="button secondary" href="/auth?mode=signup&role=recruiter">
              Buat Akun Perekrut
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ paddingTop: "1rem" }}>
      {/* Sub-Navigasi Tab: [Talent Pool] | [Kelola Lowongan Saya] */}
      <div
        className="chips"
        role="tablist"
        aria-label="Navigasi Portal HR"
        style={{ marginBottom: "2rem" }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "talent-pool"}
          className="chip"
          style={{
            background: activeTab === "talent-pool" ? "var(--chalk)" : "white",
            borderColor: activeTab === "talent-pool" ? "var(--ink)" : "var(--line)",
            fontWeight: activeTab === "talent-pool" ? 700 : 500,
            cursor: "pointer",
            padding: "0.6rem 1.2rem",
            fontSize: "0.95rem",
          }}
          onClick={() => setActiveTab("talent-pool")}
        >
          Talent Pool Mitra Industri
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "my-jobs"}
          className="chip"
          style={{
            background: activeTab === "my-jobs" ? "var(--chalk)" : "white",
            borderColor: activeTab === "my-jobs" ? "var(--ink)" : "var(--line)",
            fontWeight: activeTab === "my-jobs" ? 700 : 500,
            cursor: "pointer",
            padding: "0.6rem 1.2rem",
            fontSize: "0.95rem",
          }}
          onClick={() => setActiveTab("my-jobs")}
        >
          Kelola Lowongan Saya ({jobs.length})
        </button>
      </div>

      {jobSuccessMessage && (
        <div className="notice" style={{ marginBottom: "1.5rem" }}>
          {jobSuccessMessage}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: TALENT POOL */}
      {/* ========================================================= */}
      {activeTab === "talent-pool" && (
        <>
          {error && (
            <div className="alert" role="alert" style={{ marginBottom: "2rem" }}>
              {error}
            </div>
          )}

          {/* Kontrol Filter */}
          <div
            className="panel"
            style={{
              marginBottom: "2rem",
              display: "grid",
              gap: "1.25rem",
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  color: "var(--muted)",
                  marginBottom: "0.5rem",
                }}
              >
                Saring Berdasarkan Bidang
              </span>
              <div className="chips" role="tablist" aria-label="Filter Bidang">
                {FIELDS.map((f) => {
                  const active = selectedField === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className="chip"
                      style={{
                        background: active ? "var(--chalk)" : "white",
                        borderColor: active ? "var(--ink)" : "var(--line)",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setLoading(true);
                        setSelectedField(f.id);
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  color: "var(--muted)",
                  marginBottom: "0.5rem",
                }}
              >
                Ambang Batas Skor Kesiapan Kerja
              </span>
              <div className="chips" role="tablist" aria-label="Filter Skor">
                {SCORE_FILTERS.map((s) => {
                  const active = selectedScore === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      className="chip"
                      style={{
                        background: active ? "var(--chalk)" : "white",
                        borderColor: active ? "var(--ink)" : "var(--line)",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setLoading(true);
                        setSelectedScore(s.value);
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status Loading */}
          {loading && (
            <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted)" }}>
              <p>Menyaring talent pool siap kerja...</p>
            </div>
          )}

          {/* Status Kosong */}
          {!loading && candidates.length === 0 && !error && (
            <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <h2>Tidak ada kandidat yang cocok.</h2>
              <p className="hint">
                Belum ditemukan kandidat pada kategori ini dengan batas skor yang dipilih. Coba pilih &quot;Semua Bidang&quot; atau turunkan ambang batas skor.
              </p>
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setSelectedField("all");
                    setSelectedScore(0);
                  }}
                >
                  Reset Semua Filter
                </button>
              </div>
            </div>
          )}

          {/* Daftar Kartu Kandidat */}
          {!loading && candidates.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                gap: "1.5rem",
                alignItems: "stretch",
              }}
            >
              {candidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "white",
                    border: "1px solid var(--line)",
                    padding: "clamp(1.2rem, 3vw, 1.75rem)",
                    wordBreak: "break-word",
                  }}
                >
                  {/* Header Kartu: Badge Bidang & Target Peran */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className="chip"
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          background: getFieldBg(candidate.field),
                          borderColor: "var(--line)",
                        }}
                      >
                        {getFieldLabel(candidate.field)}
                      </span>
                      {candidate.isDemo && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--muted)",
                            border: "1px dashed var(--line)",
                            padding: "0.15rem 0.4rem",
                            fontWeight: 600,
                          }}
                        >
                          Demo Terverifikasi
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.35rem", lineHeight: 1.25 }}>
                      {candidate.role}
                    </h2>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
                      {candidate.candidateName}
                    </p>
                  </div>

                  {/* Skor Kesiapan Kerja */}
                  <div
                    style={{
                      margin: "0.5rem 0 1.25rem",
                      display: "flex",
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                    }}
                  >
                    <span className="score" style={{ fontSize: "2.8rem", lineHeight: 1 }}>
                      {candidate.finalScore}
                    </span>
                    <span style={{ fontSize: "1.05rem", color: "var(--muted)", fontWeight: 700 }}>
                      /100
                    </span>
                    {candidate.finalScore >= 75 ? (
                      <span className="delta positive" style={{ marginLeft: "0.5rem" }}>
                        Siap Kerja
                      </span>
                    ) : candidate.finalScore >= 50 ? (
                      <span
                        className="delta"
                        style={{
                          marginLeft: "0.5rem",
                          background: "#fef3c7",
                          color: "#92400e",
                          borderColor: "#fde68a",
                        }}
                      >
                        Menengah
                      </span>
                    ) : (
                      <span className="delta neutral" style={{ marginLeft: "0.5rem" }}>
                        Perlu Penguatan
                      </span>
                    )}
                  </div>

                  {/* Label Validasi Bukti Nyata */}
                  <div
                    style={{
                      padding: "0.75rem 0.9rem",
                      background: "var(--paper)",
                      borderLeft: "3px solid var(--chalk)",
                      fontSize: "0.85rem",
                      lineHeight: 1.45,
                      marginBottom: "1.25rem",
                    }}
                  >
                    <strong style={{ display: "block", color: "var(--ink)", marginBottom: "0.2rem" }}>
                      Validasi Bukti Nyata:
                    </strong>
                    <span style={{ color: "var(--muted)" }}>
                      {getEvidenceLabel(candidate.evidenceType, candidate.sourceUrl)}
                    </span>
                  </div>

                  {/* Kekuatan Terbukti (2 poin) */}
                  <div style={{ marginBottom: "1rem" }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--ink)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Kekuatan Terbukti:
                    </strong>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1.2rem",
                        fontSize: "0.9rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {candidate.strengths.slice(0, 2).map((s, idx) => (
                        <li key={idx} style={{ marginBottom: "0.25rem" }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gap untuk Pertimbangan (1 poin) */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--danger)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Gap untuk Pertimbangan:
                    </strong>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1.2rem",
                        fontSize: "0.9rem",
                        lineHeight: 1.5,
                        color: "var(--muted)",
                      }}
                    >
                      {candidate.gaps.slice(0, 1).map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tombol Aksi */}
                  <div
                    className="actions"
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      className="button"
                      href={`/results/${candidate.assessmentId}`}
                      style={{ flex: "1 1 140px", textAlign: "center", fontSize: "0.9rem" }}
                    >
                      Lihat Bukti Lengkap
                    </Link>
                    <a
                      className="button secondary"
                      href={`mailto:${candidate.email}?subject=${encodeURIComponent(
                        `Skillbridge AI: Rekrutmen Posisi ${candidate.role}`,
                      )}&body=${encodeURIComponent(
                        `Halo ${candidate.candidateName},\n\nKami melihat hasil evaluasi kesiapan kerja Anda di Skillbridge AI untuk target peran ${candidate.role} dengan skor ${candidate.finalScore}/100.\n\nKualifikasi dan bukti nyata portofolio Anda menarik perhatian tim kami. Apakah Anda bersedia untuk berdiskusi lebih lanjut terkait peluang karier bersama kami?\n\nSalam,\nTim Rekruter / HR`,
                      )}`}
                      style={{ flex: "1 1 120px", textAlign: "center", fontSize: "0.9rem" }}
                    >
                      Kontak Kandidat
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KELOLA LOWONGAN SAYA */}
      {/* ========================================================= */}
      {activeTab === "my-jobs" && (
        <div>
          {/* Header Aksi Tab Lowongan */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem" }}>
                Manajemen Lowongan Kerja & Magang
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                Pasang lowongan berbasis bukti dan tinjau pelamar dengan skor kesiapan kerja terverifikasi.
              </p>
            </div>
            <button
              type="button"
              className="button"
              onClick={() => {
                setJobSubmitError("");
                setIsCreateModalOpen(true);
              }}
            >
              + Pasang Lowongan Baru
            </button>
          </div>

          {jobsError && (
            <div className="alert" role="alert" style={{ marginBottom: "1.5rem" }}>
              {jobsError}
            </div>
          )}

          {jobsLoading && (
            <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--muted)" }}>
              <p>Memuat daftar lowongan perusahaan...</p>
            </div>
          )}

          {!jobsLoading && jobs.length === 0 && (
            <div className="panel" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
              <h2>Belum Ada Lowongan yang Terdaftar</h2>
              <p className="hint" style={{ maxWidth: "560px", margin: "0.5rem auto 1.5rem" }}>
                Publikasikan lowongan kerja atau magang pertama Anda untuk menjaring talenta siap kerja berbasis bukti karya nyata.
              </p>
              <button
                type="button"
                className="button"
                onClick={() => setIsCreateModalOpen(true)}
              >
                + Pasang Lowongan Sekarang
              </button>
            </div>
          )}

          {!jobsLoading && jobs.length > 0 && (
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {jobs.map((job) => {
                // Count applications for this job
                const jobApplicants = applications.filter((app) => app.jobId === job.id);

                return (
                  <article
                    key={job.id}
                    className="card"
                    style={{
                      background: "white",
                      border: "1px solid var(--line)",
                      padding: "1.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 320px" }}>
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        <span
                          className="chip"
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            background: getFieldBg(job.field),
                          }}
                        >
                          {getFieldLabel(job.field)}
                        </span>
                        <span className="chip" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}>
                          {job.employmentType === "fulltime"
                            ? "Full-time"
                            : job.employmentType === "internship"
                              ? "Magang"
                              : job.employmentType === "contract"
                                ? "Kontrak"
                                : "Part-time"}
                        </span>
                        <span className="chip" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}>
                          {job.workplaceType}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#15803d",
                            background: "#e6f4ea",
                            border: "1px solid #ceead6",
                            padding: "0.2rem 0.5rem",
                          }}
                        >
                          Aktif
                        </span>
                        {job.isDemo && (
                          <span style={{ fontSize: "0.7rem", color: "var(--muted)", border: "1px dashed var(--line)", padding: "0.15rem 0.4rem" }}>
                            Demo Mitra
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", fontFamily: "var(--font-display)" }}>
                        {job.title}
                      </h3>
                      <p style={{ margin: "0 0 0.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
                        {job.companyName} · {job.location} · Syarat Skor: ≥ {job.minSkillbridgeScore}/100
                      </p>
                      <div style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
                        <strong>Highlights: </strong>
                        <span>{job.highlights?.[0] || "Peluang kerja berbasis bukti"}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "0.75rem",
                        flex: "0 0 auto",
                      }}
                    >
                      <div
                        style={{
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          padding: "0.4rem 0.85rem",
                          textAlign: "right",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "var(--muted)" }}>Pelamar Masuk: </span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
                          {jobApplicants.length} Orang
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="button secondary"
                        style={{ fontSize: "0.88rem", minHeight: "40px" }}
                        onClick={() => setSelectedJobForApplicants(job)}
                      >
                        Lihat Pelamar ({jobApplicants.length})
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LIHAT PELAMAR LOWONGAN */}
      {/* ========================================================= */}
      {selectedJobForApplicants && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="applicants-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 33, 61, 0.65)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedJobForApplicants(null);
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "780px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              padding: "clamp(1.5rem, 4vw, 2.5rem)",
            }}
          >
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setSelectedJobForApplicants(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: "1.5rem" }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Pelamar Masuk
              </p>
              <h2 id="applicants-modal-title" style={{ fontSize: "1.45rem", margin: "0.25rem 0" }}>
                {selectedJobForApplicants.title}
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                {selectedJobForApplicants.companyName} · Syarat Minimal: Skor ≥ {selectedJobForApplicants.minSkillbridgeScore}/100
              </p>
            </div>

            {/* List Pelamar */}
            {(() => {
              const jobApps = applications.filter((a) => a.jobId === selectedJobForApplicants.id);

              if (jobApps.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "var(--paper)", border: "1px dashed var(--line)" }}>
                    <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>Belum Ada Pelamar Masuk</p>
                    <p className="hint" style={{ margin: 0 }}>
                      Kandidat yang melamar posisi ini akan muncul di sini beserta bukti portofolio dan skor Skillbridge mereka.
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {jobApps.map((app) => {
                    const badge = getApplicationBadge(app.status);
                    return (
                      <article
                        key={app.id}
                        style={{
                          background: "white",
                          border: "1px solid var(--line)",
                          padding: "1.25rem",
                          display: "grid",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                background: badge.bg,
                                color: badge.color,
                                marginBottom: "0.4rem",
                              }}
                            >
                              Status: {badge.label}
                            </span>
                            <h3 style={{ margin: "0 0 0.2rem", fontSize: "1.2rem" }}>
                              {app.candidateName}
                            </h3>
                            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
                              {app.candidateEmail} · Melamar pada{" "}
                              {new Date(app.appliedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>

                          {/* Skillbridge Score */}
                          {app.skillbridgeScore !== null && app.skillbridgeScore !== undefined ? (
                            <div
                              style={{
                                background: "var(--paper)",
                                border: "1px solid var(--line)",
                                padding: "0.4rem 0.8rem",
                                textAlign: "right",
                              }}
                            >
                              <span style={{ display: "block", fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700 }}>
                                Skor Portofolio
                              </span>
                              <span
                                style={{
                                  fontSize: "1.4rem",
                                  fontWeight: 700,
                                  fontFamily: "var(--font-display)",
                                  color:
                                    app.skillbridgeScore >= selectedJobForApplicants.minSkillbridgeScore
                                      ? "#15803d"
                                      : "var(--ink)",
                                }}
                              >
                                {app.skillbridgeScore}
                                <small style={{ fontSize: "0.8rem", color: "var(--muted)" }}>/100</small>
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                              Skor belum dilampirkan
                            </span>
                          )}
                        </div>

                        {app.coverLetter && (
                          <div
                            style={{
                              background: "#f9fafb",
                              borderLeft: "3px solid var(--line)",
                              padding: "0.6rem 0.85rem",
                              fontSize: "0.88rem",
                              lineHeight: 1.5,
                            }}
                          >
                            <strong style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.2rem" }}>
                              Catatan Pelamar:
                            </strong>
                            <p style={{ margin: 0, fontStyle: "italic" }}>&ldquo;{app.coverLetter}&rdquo;</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                            alignItems: "center",
                            paddingTop: "0.5rem",
                            borderTop: "1px solid var(--line)",
                          }}
                        >
                          {app.assessmentId && (
                            <Link
                              className="button secondary"
                              href={`/results/${app.assessmentId}`}
                              style={{ fontSize: "0.85rem", minHeight: "36px" }}
                            >
                              Lihat Bukti Portofolio
                            </Link>
                          )}
                          {app.portfolioUrl && (
                            <a
                              className="button secondary"
                              href={app.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "0.85rem", minHeight: "36px" }}
                            >
                              Buka Tautan Portofolio
                            </a>
                          )}
                          <a
                            className="button"
                            href={`mailto:${app.candidateEmail}?subject=${encodeURIComponent(
                              `Skillbridge AI: Tindak Lanjut Lamaran ${selectedJobForApplicants.title}`,
                            )}&body=${encodeURIComponent(
                              `Halo ${app.candidateName},\n\nTerima kasih telah melamar posisi ${selectedJobForApplicants.title} di ${selectedJobForApplicants.companyName} melalui Skillbridge AI.\n\nKami telah meninjau bukti portofolio dan skor kesiapan kerja Anda. Kami ingin mengundang Anda untuk tahap wawancara/diskusi teknis.\n\nSalam,\nTim HR ${selectedJobForApplicants.companyName}`,
                            )}`}
                            style={{ fontSize: "0.85rem", minHeight: "36px", marginLeft: "auto" }}
                          >
                            Hubungi Pelamar
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelectedJobForApplicants(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PASANG LOWONGAN BARU */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-job-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 33, 61, 0.65)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingJob) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "740px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              position: "relative",
              padding: "clamp(1.5rem, 4vw, 2.5rem)",
            }}
          >
            <button
              type="button"
              aria-label="Tutup"
              disabled={isSubmittingJob}
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: "1.5rem" }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Portal Perekrut / HR
              </p>
              <h2 id="create-job-modal-title" style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
                Pasang Lowongan Pekerjaan Baru
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                Isi rincian lowongan secara transparan untuk memvalidasi pelamar berdasarkan standar bukti Skillbridge.
              </p>
            </div>

            {jobSubmitError && (
              <div className="alert" role="alert" style={{ marginBottom: "1.5rem" }}>
                {jobSubmitError}
              </div>
            )}

            <form onSubmit={handleCreateJob} style={{ display: "grid", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={titleInputId}>Judul Lowongan</label>
                  <input
                    id={titleInputId}
                    type="text"
                    required
                    placeholder="Cth: Junior Front-End Web Developer"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={companyInputId}>Nama Perusahaan</label>
                  <input
                    id={companyInputId}
                    type="text"
                    required
                    placeholder="Cth: PT Nusantara Solusi Teknologi"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={fieldSelectId}>Bidang</label>
                  <select
                    id={fieldSelectId}
                    value={formField}
                    onChange={(e) => setFormField(e.target.value as Field)}
                  >
                    <option value="informatics">Informatika</option>
                    <option value="design">DKV</option>
                    <option value="marketing">Pemasaran</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={targetRoleInputId}>Target Peran</label>
                  <input
                    id={targetRoleInputId}
                    type="text"
                    required
                    placeholder="Cth: Junior Web Developer"
                    value={formTargetRole}
                    onChange={(e) => setFormTargetRole(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={employmentTypeSelectId}>Tipe Kerja</label>
                  <select
                    id={employmentTypeSelectId}
                    value={formEmploymentType}
                    onChange={(e) => setFormEmploymentType(e.target.value as EmploymentType)}
                  >
                    <option value="fulltime">Penuh Waktu (Full-time)</option>
                    <option value="internship">Magang (Internship)</option>
                    <option value="contract">Kontrak</option>
                    <option value="parttime">Paruh Waktu</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={workplaceTypeSelectId}>Tempat Kerja</label>
                  <select
                    id={workplaceTypeSelectId}
                    value={formWorkplaceType}
                    onChange={(e) => setFormWorkplaceType(e.target.value as WorkplaceType)}
                  >
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote (Jarak Jauh)</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={locationInputId}>Lokasi</label>
                  <input
                    id={locationInputId}
                    type="text"
                    required
                    placeholder="Cth: Jakarta Selatan"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={minEduSelectId}>Minimal Pendidikan</label>
                  <select
                    id={minEduSelectId}
                    value={formMinEdu}
                    onChange={(e) => setFormMinEdu(e.target.value as MinEducation)}
                  >
                    <option value="smk">SMK / Sederajat (Ramah SMK)</option>
                    <option value="diploma">D3 / Diploma</option>
                    <option value="bachelor">S1 / Sarjana</option>
                    <option value="any">Semua Jenjang</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={expLevelSelectId}>Tingkat Pengalaman</label>
                  <select
                    id={expLevelSelectId}
                    value={formExpLevel}
                    onChange={(e) => setFormExpLevel(e.target.value as ExperienceLevel)}
                  >
                    <option value="fresh_graduate">Fresh Graduate</option>
                    <option value="under_1_year">&lt; 1 Tahun Pengalaman</option>
                    <option value="1_to_2_years">1 - 2 Tahun Pengalaman</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={minScoreInputId}>Syarat Minimal Skor Skillbridge</label>
                  <input
                    id={minScoreInputId}
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={formMinScore}
                    onChange={(e) => setFormMinScore(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Kompensasi & Gaji */}
              <div style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "1rem" }}>
                <strong style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                  Kebijakan Kompensasi
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "0.75rem" }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor={compTypeSelectId}>Tipe Kompensasi</label>
                    <select
                      id={compTypeSelectId}
                      value={formCompType}
                      onChange={(e) => setFormCompType(e.target.value as CompensationType)}
                    >
                      <option value="paid">Berbayar (Paid)</option>
                      <option value="unpaid">Uang Saku / Magang (Unpaid)</option>
                    </select>
                  </div>

                  {formCompType === "paid" && (
                    <>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor={salaryMinInputId}>Gaji Min (Rp)</label>
                        <input
                          id={salaryMinInputId}
                          type="number"
                          min={0}
                          placeholder="5000000"
                          value={formSalaryMin}
                          onChange={(e) => setFormSalaryMin(e.target.value)}
                        />
                      </div>

                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor={salaryMaxInputId}>Gaji Max (Rp)</label>
                        <input
                          id={salaryMaxInputId}
                          type="number"
                          min={0}
                          placeholder="7500000"
                          value={formSalaryMax}
                          onChange={(e) => setFormSalaryMax(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {formCompType === "paid" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formShowSalary}
                      onChange={(e) => setFormShowSalary(e.target.checked)}
                      style={{ width: "16px", minHeight: "16px" }}
                    />
                    Tampilkan rentang gaji secara transparan di kartu lowongan
                  </label>
                )}
              </div>

              {/* 3 Highlights */}
              <div>
                <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  3 Highlights Utama Lowongan (Disarankan 3 poin)
                </span>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <input
                    id={hl1InputId}
                    type="text"
                    required
                    placeholder="Highlight 1: Cth: Ramah Lulusan SMK & Fresh Graduate Berbasis Portofolio Riil"
                    value={formHighlight1}
                    onChange={(e) => setFormHighlight1(e.target.value)}
                  />
                  <input
                    id={hl2InputId}
                    type="text"
                    required
                    placeholder="Highlight 2: Cth: Mentoring 1-on-1 Mingguan Bersama Tech Lead"
                    value={formHighlight2}
                    onChange={(e) => setFormHighlight2(e.target.value)}
                  />
                  <input
                    id={hl3InputId}
                    type="text"
                    placeholder="Highlight 3: Cth: Rentang Gaji Transparan Rp 5.000.000 - Rp 7.500.000"
                    value={formHighlight3}
                    onChange={(e) => setFormHighlight3(e.target.value)}
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={descInputId}>Deskripsi Singkat</label>
                <textarea
                  id={descInputId}
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {/* Tanggung Jawab */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={respInputId}>Tanggung Jawab Pekerjaan (Satu per baris)</label>
                <textarea
                  id={respInputId}
                  rows={3}
                  required
                  placeholder="Mengembangkan fitur web&#10;Menjaga kualitas kode&#10;Kolaborasi tim"
                  value={formResponsibilities}
                  onChange={(e) => setFormResponsibilities(e.target.value)}
                />
              </div>

              {/* Skills */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={skillsInputId}>Keahlian yang Dibutuhkan (Pisahkan dengan koma)</label>
                <input
                  id={skillsInputId}
                  type="text"
                  required
                  placeholder="React, Next.js, TypeScript, Tailwind CSS, REST API"
                  value={formRequiredSkills}
                  onChange={(e) => setFormRequiredSkills(e.target.value)}
                />
              </div>

              {/* Benefits */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={benefitsInputId}>Fasilitas & Benefit (Pisahkan dengan koma)</label>
                <input
                  id={benefitsInputId}
                  type="text"
                  placeholder="BPJS, Tunjangan Laptop, Tunjangan Internet"
                  value={formBenefits}
                  onChange={(e) => setFormBenefits(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={isSubmittingJob}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={isSubmittingJob}>
                  {isSubmittingJob ? "Mempublikasikan..." : "Publikasikan Lowongan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
