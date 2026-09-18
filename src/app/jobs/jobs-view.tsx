"use client";

import Link from "next/link";
import { useEffect, useState, useId } from "react";
import { authHeaders, getSupabase } from "@/lib/auth-client";
import type {
  JobPosting,
  Field,
  MinEducation,
  EmploymentType,
  WorkplaceType,
  CompensationType,
  AssessmentResult,
} from "@/lib/types";

const FIELDS: { id: Field | "all"; label: string }[] = [
  { id: "all", label: "Semua Bidang" },
  { id: "informatics", label: "Informatika" },
  { id: "design", label: "DKV" },
  { id: "marketing", label: "Pemasaran" },
];

const EDU_OPTIONS: { id: MinEducation | "all"; label: string }[] = [
  { id: "all", label: "Semua Jenjang" },
  { id: "smk", label: "SMK / Sederajat" },
  { id: "diploma", label: "D3 / Diploma" },
  { id: "bachelor", label: "S1 / Sarjana" },
];

const COMP_OPTIONS: { id: CompensationType | "all"; label: string }[] = [
  { id: "all", label: "Semua Kompensasi" },
  { id: "paid", label: "Berbayar (Paid)" },
  { id: "unpaid", label: "Uang Saku / Magang" },
];

const WORKPLACE_OPTIONS: { id: WorkplaceType | "all"; label: string }[] = [
  { id: "all", label: "Semua Tempat Kerja" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "Onsite" },
];

function formatSalary(min: number | null, max: number | null): string {
  if (min && max) {
    return `Rp ${min.toLocaleString("id-ID")} - Rp ${max.toLocaleString("id-ID")}`;
  }
  if (min) return `Mulai Rp ${min.toLocaleString("id-ID")}`;
  if (max) return `Hingga Rp ${max.toLocaleString("id-ID")}`;
  return "Kompensasi Kompetitif";
}

function getEmploymentLabel(type: EmploymentType): string {
  switch (type) {
    case "fulltime":
      return "Penuh Waktu";
    case "internship":
      return "Magang";
    case "contract":
      return "Kontrak";
    case "parttime":
      return "Paruh Waktu";
    default:
      return type;
  }
}

function getWorkplaceLabel(type: WorkplaceType): string {
  switch (type) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "onsite":
      return "Onsite";
    default:
      return type;
  }
}

function getFieldBadgeColor(field: Field): { bg: string; border: string } {
  switch (field) {
    case "informatics":
      return { bg: "#e0f2fe", border: "#bae6fd" };
    case "design":
      return { bg: "#fce7f3", border: "#fbcfe8" };
    case "marketing":
      return { bg: "#fef3c7", border: "#fde68a" };
    default:
      return { bg: "#f3f4f6", border: "#e5e7eb" };
  }
}

export default function JobsView() {
  const searchInputId = useId();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [field, setField] = useState<Field | "all">("all");
  const [minEducation, setMinEducation] = useState<MinEducation | "all">("all");
  const [compensationType, setCompensationType] = useState<CompensationType | "all">("all");
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType | "all">("all");
  const [search, setSearch] = useState("");

  // Auth & Assessments
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [userAssessments, setUserAssessments] = useState<AssessmentResult[]>([]);

  // Modals
  const [detailJob, setDetailJob] = useState<JobPosting | null>(null);
  const [applyJob, setApplyJob] = useState<JobPosting | null>(null);

  // Application form state
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Check auth & load user assessments
  useEffect(() => {
    let active = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      const u = data.session.user;
      const name =
        (u.user_metadata?.name as string | undefined) ||
        (u.user_metadata?.full_name as string | undefined) ||
        u.email?.split("@")[0] ||
        "Kandidat";
      setCurrentUser({ id: u.id, email: u.email, name });
      setApplicantName(name);
      setApplicantEmail(u.email || "");

      // Fetch assessments
      authHeaders()
        .then((headers) => fetch("/api/assessments", { headers }))
        .then((res) => (res.ok ? res.json() : []))
        .then((items: AssessmentResult[]) => {
          if (active && Array.isArray(items)) {
            setUserAssessments(items);
            if (items.length > 0) {
              setSelectedAssessmentId(items[0].id);
            }
          }
        })
        .catch(() => {});
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!active) return;
      if (session?.user) {
        const u = session.user;
        const name =
          (u.user_metadata?.name as string | undefined) ||
          (u.user_metadata?.full_name as string | undefined) ||
          u.email?.split("@")[0] ||
          "Kandidat";
        setCurrentUser({ id: u.id, email: u.email, name });
        setApplicantName(name);
        setApplicantEmail(u.email || "");
      } else {
        setCurrentUser(null);
        setUserAssessments([]);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch jobs
  useEffect(() => {
    let active = true;

    const params = new URLSearchParams();
    if (field !== "all") params.set("field", field);
    if (minEducation !== "all") params.set("minEducation", minEducation);
    if (compensationType !== "all") params.set("compensationType", compensationType);
    if (workplaceType !== "all") params.set("workplaceType", workplaceType);
    if (search.trim().length > 0) params.set("search", search.trim());

    fetch(`/api/jobs?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Gagal memuat lowongan.");
        }
        return res.json();
      })
      .then((data: JobPosting[]) => {
        if (active) {
          setJobs(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat lowongan.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [field, minEducation, compensationType, workplaceType, search]);

  function getFieldFromRole(role: string): Field | null {
    if (role === "Junior Web Developer") return "informatics";
    if (role === "Junior Graphic Designer") return "design";
    if (role === "Junior Digital Marketer") return "marketing";
    return null;
  }

  function handleOpenApply(job: JobPosting) {
    setDetailJob(null);
    setApplyJob(job);
    setSubmitSuccess(false);
    setSubmitError("");
    setCoverLetter("");
    if (currentUser) {
      setApplicantName(currentUser.name || "");
      setApplicantEmail(currentUser.email || "");
    }
    // Pre-select assessment matching field or highest score
    const matching = userAssessments.find((a) => getFieldFromRole(a.role) === job.field);
    if (matching) {
      setSelectedAssessmentId(matching.id);
    } else if (userAssessments.length > 0) {
      setSelectedAssessmentId(userAssessments[0].id);
    }
  }

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applyJob || !currentUser) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const selectedAssessment = userAssessments.find((a) => a.id === selectedAssessmentId);
      const headers = await authHeaders();

      const payload = {
        candidateName: applicantName.trim(),
        candidateEmail: applicantEmail.trim(),
        assessmentId: selectedAssessment ? selectedAssessment.id : null,
        skillbridgeScore: selectedAssessment?.finalScore ?? null,
        portfolioUrl: portfolioUrl.trim() || undefined,
        coverLetter: coverLetter.trim() || undefined,
      };

      const res = await fetch(`/api/jobs/${applyJob.id}/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Gagal mengirimkan lamaran.");
      }

      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim lamaran.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Find user's best score for each job
  function getUserScoreForJob(job: JobPosting): { score: number; meetsRequirement: boolean } | null {
    if (userAssessments.length === 0) return null;
    const fieldMatch = userAssessments.filter(
      (a) => getFieldFromRole(a.role) === job.field && a.finalScore !== null,
    );
    if (fieldMatch.length > 0) {
      const max = Math.max(...fieldMatch.map((a) => a.finalScore!));
      return { score: max, meetsRequirement: max >= job.minSkillbridgeScore };
    }
    // Fallback to highest overall score
    const validScores = userAssessments.filter((a) => a.finalScore !== null).map((a) => a.finalScore!);
    if (validScores.length > 0) {
      const max = Math.max(...validScores);
      return { score: max, meetsRequirement: max >= job.minSkillbridgeScore };
    }
    return null;
  }

  return (
    <section style={{ paddingBottom: "5rem" }}>
      {/* Search & Filter Bar */}
      <div
        className="panel"
        style={{
          marginBottom: "2rem",
          display: "grid",
          gap: "1.25rem",
          background: "white",
        }}
      >
        {/* Search Input */}
        <div>
          <label
            htmlFor={searchInputId}
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
            Cari Berdasarkan Peran, Keahlian, atau Perusahaan
          </label>
          <input
            id={searchInputId}
            type="search"
            placeholder="Cth: Next.js, Frontend, DKV, Brand Identity, Remote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", background: "#fafaf8" }}
          />
        </div>

        {/* Filter Chips: Bidang */}
        <div>
          <span
            style={{
              display: "block",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              color: "var(--muted)",
              marginBottom: "0.4rem",
            }}
          >
            Bidang Keahlian
          </span>
          <div className="chips" role="tablist" aria-label="Filter Bidang">
            {FIELDS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip"
                style={{
                  background: field === f.id ? "var(--chalk)" : "white",
                  borderColor: field === f.id ? "var(--ink)" : "var(--line)",
                  fontWeight: field === f.id ? 700 : 500,
                  cursor: "pointer",
                }}
                onClick={() => setField(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Grid: Jenjang, Kompensasi, Kebijakan */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--muted)",
                marginBottom: "0.35rem",
              }}
            >
              Minimal Pendidikan
            </label>
            <select
              value={minEducation}
              onChange={(e) => setMinEducation(e.target.value as MinEducation | "all")}
            >
              {EDU_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--muted)",
                marginBottom: "0.35rem",
              }}
            >
              Jenis Kompensasi
            </label>
            <select
              value={compensationType}
              onChange={(e) => setCompensationType(e.target.value as CompensationType | "all")}
            >
              {COMP_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--muted)",
                marginBottom: "0.35rem",
              }}
            >
              Kebijakan Tempat Kerja
            </label>
            <select
              value={workplaceType}
              onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType | "all")}
            >
              {WORKPLACE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert" role="alert" style={{ marginBottom: "2rem" }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--muted)" }}>
          <p>Mencari lowongan kerja tervalidasi...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && jobs.length === 0 && !error && (
        <div className="panel" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <h2>Tidak Ada Lowongan yang Cocok</h2>
          <p className="hint" style={{ maxWidth: "560px", margin: "0.5rem auto 1.5rem" }}>
            Tidak ditemukan lowongan dengan kriteria filter yang Anda pilih. Coba sesuaikan kata kunci pencarian atau setel kembali filter.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setField("all");
              setMinEducation("all");
              setCompensationType("all");
              setWorkplaceType("all");
              setSearch("");
            }}
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* Jobs Listing Grid */}
      {!loading && jobs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
            gap: "1.5rem",
            alignItems: "stretch",
          }}
        >
          {jobs.map((job) => {
            const badgeColor = getFieldBadgeColor(job.field);
            const userScoreInfo = getUserScoreForJob(job);
            const isSmkFriendly = job.minEducation === "smk" || job.minEducation === "any";

            return (
              <article
                key={job.id}
                className="card"
                style={{
                  background: "white",
                  border: "1px solid var(--line)",
                  padding: "clamp(1.25rem, 3vw, 1.75rem)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        className="chip"
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          background: badgeColor.bg,
                          borderColor: badgeColor.border,
                        }}
                      >
                        {job.field === "informatics"
                          ? "Informatika"
                          : job.field === "design"
                            ? "DKV"
                            : "Pemasaran"}
                      </span>
                      <span
                        className="chip"
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.55rem",
                          background: "#f9fafb",
                        }}
                      >
                        {getEmploymentLabel(job.employmentType)}
                      </span>
                      <span
                        className="chip"
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.55rem",
                          background: "#f9fafb",
                        }}
                      >
                        {getWorkplaceLabel(job.workplaceType)}
                      </span>
                    </div>

                    {isSmkFriendly && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                          padding: "0.2rem 0.5rem",
                        }}
                      >
                        Ramah Lulusan SMK
                      </span>
                    )}
                  </div>

                  {/* Title & Company */}
                  <h2
                    style={{
                      fontSize: "1.35rem",
                      margin: "0 0 0.35rem",
                      lineHeight: 1.3,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {job.title}
                  </h2>
                  <p style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", color: "var(--muted)", fontWeight: 600 }}>
                    {job.companyName} · <span style={{ fontWeight: 400 }}>{job.location}</span>
                  </p>

                  {/* Transparent Compensation Badge */}
                  <div
                    style={{
                      padding: "0.6rem 0.85rem",
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <span style={{ display: "block", fontSize: "0.7rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
                        Transparansi Kompensasi:
                      </span>
                      <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>
                        {job.compensationType === "paid" && job.showSalary
                          ? `${formatSalary(job.salaryMin, job.salaryMax)} / bln`
                          : job.compensationType === "paid"
                            ? "Kompensasi Berbayar Kompetitif"
                            : "Uang Saku / Sertifikat Magang"}
                      </strong>
                    </div>
                    {job.isDemo && (
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)", border: "1px dashed var(--line)", padding: "0.1rem 0.35rem" }}>
                        Mitra Demo
                      </span>
                    )}
                  </div>

                  {/* 3 Highlights */}
                  {job.highlights && job.highlights.length > 0 && (
                    <div style={{ marginBottom: "1.25rem" }}>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--ink)",
                          marginBottom: "0.4rem",
                        }}
                      >
                        Highlights Utama:
                      </strong>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "1.2rem",
                          fontSize: "0.88rem",
                          lineHeight: 1.45,
                          color: "var(--ink)",
                        }}
                      >
                        {job.highlights.slice(0, 3).map((hl, idx) => (
                          <li key={idx} style={{ marginBottom: "0.3rem" }}>
                            {hl}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skillbridge Score Requirement Indicator */}
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderLeft: "3px solid var(--chalk)",
                      background: "#fffdf5",
                      fontSize: "0.85rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)" }}>
                        Syarat Skor Skillbridge: <strong>≥ {job.minSkillbridgeScore}/100</strong>
                      </span>
                    </div>

                    {userScoreInfo && (
                      <div style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}>
                        {userScoreInfo.meetsRequirement ? (
                          <span style={{ color: "#15803d", fontWeight: 700 }}>
                            ✓ Skor Anda {userScoreInfo.score}/100 (Memenuhi kriteria)
                          </span>
                        ) : (
                          <span style={{ color: "#b45309", fontWeight: 600 }}>
                            ℹ Skor Anda {userScoreInfo.score}/100 (Perlu penguatan +{job.minSkillbridgeScore - userScoreInfo.score} poin)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <button
                    type="button"
                    className="button secondary"
                    style={{ flex: "1 1 120px", fontSize: "0.88rem" }}
                    onClick={() => setDetailJob(job)}
                  >
                    Lihat Detail
                  </button>
                  <button
                    type="button"
                    className="button"
                    style={{ flex: "1 1 140px", fontSize: "0.88rem" }}
                    onClick={() => handleOpenApply(job)}
                  >
                    Lamar Sekarang
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Detail Lowongan */}
      {detailJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-job-title"
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
            if (e.target === e.currentTarget) setDetailJob(null);
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              padding: "clamp(1.5rem, 4vw, 2.5rem)",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setDetailJob(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                lineHeight: 1,
                padding: "0.25rem",
              }}
            >
              ×
            </button>

            <div style={{ paddingRight: "2rem", marginBottom: "1.25rem" }}>
              <span
                className="chip"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  marginBottom: "0.5rem",
                  display: "inline-block",
                  ...getFieldBadgeColor(detailJob.field),
                }}
              >
                {detailJob.field === "informatics"
                  ? "Informatika"
                  : detailJob.field === "design"
                    ? "DKV"
                    : "Pemasaran"}
              </span>
              <h2 id="detail-job-title" style={{ fontSize: "1.65rem", margin: "0.35rem 0", lineHeight: 1.25 }}>
                {detailJob.title}
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "1rem", fontWeight: 600 }}>
                {detailJob.companyName} · {detailJob.location}
              </p>
            </div>

            {/* Quick Specs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
                padding: "1rem",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                marginBottom: "1.5rem",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Tipe Kerja:</span>
                <strong>{getEmploymentLabel(detailJob.employmentType)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Tempat Kerja:</span>
                <strong>{getWorkplaceLabel(detailJob.workplaceType)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Minimal Pendidikan:</span>
                <strong>
                  {detailJob.minEducation === "smk"
                    ? "SMK / Sederajat"
                    : detailJob.minEducation === "diploma"
                      ? "D3 / Diploma"
                      : detailJob.minEducation === "bachelor"
                        ? "S1 / Sarjana"
                        : "Semua Jenjang"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Syarat Skor:</span>
                <strong>≥ {detailJob.minSkillbridgeScore}/100</strong>
              </div>
            </div>

            {/* Compensation Info */}
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "0.85rem 1rem",
                borderLeft: "4px solid var(--ink)",
                background: "#f4f5f7",
              }}
            >
              <strong style={{ display: "block", fontSize: "0.8rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.2rem" }}>
                Kompensasi & Tunjangan:
              </strong>
              <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                {detailJob.compensationType === "paid" && detailJob.showSalary
                  ? `${formatSalary(detailJob.salaryMin, detailJob.salaryMax)} per bulan`
                  : detailJob.compensationType === "paid"
                    ? "Kompensasi Berbayar Kompetitif"
                    : "Uang Saku & Penggantian Transportasi"}
              </p>
            </div>

            {/* Deskripsi */}
            {detailJob.description && (
              <div style={{ marginBottom: "1.5rem" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Tentang Posisi Ini:
                </strong>
                <p style={{ margin: 0, lineHeight: 1.65, color: "var(--ink)" }}>{detailJob.description}</p>
              </div>
            )}

            {/* Tanggung Jawab */}
            {detailJob.responsibilities && detailJob.responsibilities.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Tanggung Jawab Utama:
                </strong>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
                  {detailJob.responsibilities.map((res, i) => (
                    <li key={i} style={{ marginBottom: "0.35rem" }}>
                      {res}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keahlian yang Dibutuhkan */}
            {detailJob.requiredSkills && detailJob.requiredSkills.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Keahlian & Perkakas yang Dibutuhkan:
                </strong>
                <div className="chips">
                  {detailJob.requiredSkills.map((skill, i) => (
                    <span key={i} className="chip" style={{ background: "white", fontSize: "0.85rem", fontWeight: 600 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {detailJob.benefits && detailJob.benefits.length > 0 && (
              <div style={{ marginBottom: "2rem" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Fasilitas & Benefit:
                </strong>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
                  {detailJob.benefits.map((b, i) => (
                    <li key={i} style={{ marginBottom: "0.25rem" }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDetailJob(null)}
                style={{ flex: "1 1 120px" }}
              >
                Tutup
              </button>
              <button
                type="button"
                className="button"
                onClick={() => handleOpenApply(detailJob)}
                style={{ flex: "2 1 200px" }}
              >
                Lamar Posisi Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Lamar Pekerjaan */}
      {applyJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-job-title"
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
            if (e.target === e.currentTarget && !isSubmitting) setApplyJob(null);
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "600px",
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
              disabled={isSubmitting}
              onClick={() => setApplyJob(null)}
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

            {!currentUser ? (
              // Prompt Login jika belum autentikasi
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <h2 id="apply-job-title" style={{ fontSize: "1.45rem", marginBottom: "0.75rem" }}>
                  Masuk untuk Melamar
                </h2>
                <p style={{ color: "var(--muted)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                  Anda perlu masuk ke akun Skillbridge AI agar dapat melampirkan skor kesiapan kerja dan portofolio ke <strong>{applyJob.companyName}</strong>.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="button" href="/auth?next=/jobs">
                    Masuk Sekarang
                  </Link>
                  <Link className="button secondary" href="/auth?mode=signup&next=/jobs">
                    Daftar Akun Baru
                  </Link>
                </div>
              </div>
            ) : submitSuccess ? (
              // Sukses Pengiriman
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    margin: "0 auto 1rem",
                    background: "#e6f4ea",
                    color: "#137333",
                    border: "2px solid #137333",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "1.75rem",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
                <h2 id="apply-job-title" style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                  Lamaran Berhasil Terkirim!
                </h2>
                <p style={{ color: "var(--muted)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                  Lamaran Anda untuk posisi <strong>{applyJob.title}</strong> di <strong>{applyJob.companyName}</strong> telah diterima oleh tim HR bersama bukti skor portofolio Anda.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="button" href="/history">
                    Pantau Status di Riwayat
                  </Link>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setApplyJob(null)}
                  >
                    Kembali ke Lowongan
                  </button>
                </div>
              </div>
            ) : (
              // Form Pengajuan Lamaran
              <form onSubmit={handleApplySubmit}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <p className="eyebrow" style={{ margin: 0 }}>
                    Formulir Lamaran Pekerjaan
                  </p>
                  <h2 id="apply-job-title" style={{ fontSize: "1.45rem", margin: "0.25rem 0" }}>
                    {applyJob.title}
                  </h2>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                    {applyJob.companyName} · Syarat Skor: ≥ {applyJob.minSkillbridgeScore}/100
                  </p>
                </div>

                {submitError && (
                  <div className="alert" role="alert" style={{ marginBottom: "1.25rem" }}>
                    {submitError}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="applicant-name">Nama Lengkap</label>
                  <input
                    id="applicant-name"
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="applicant-email">Alamat Email</label>
                  <input
                    id="applicant-email"
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                  />
                </div>

                {/* Pilih Asesmen Portofolio */}
                <div className="field">
                  <label htmlFor="applicant-assessment">
                    Lampirkan Hasil Asesmen Portofolio Skillbridge
                  </label>
                  {userAssessments.length > 0 ? (
                    <>
                      <select
                        id="applicant-assessment"
                        value={selectedAssessmentId}
                        onChange={(e) => setSelectedAssessmentId(e.target.value)}
                      >
                        {userAssessments.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.role} — Skor: {a.finalScore ?? "—"}/100 ({new Date(a.createdAt).toLocaleDateString("id-ID")})
                          </option>
                        ))}
                      </select>
                      <p className="hint">
                        HR akan melihat skor tervalidasi dan kutipan bukti portofolio Anda.
                      </p>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: "0.85rem",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        fontSize: "0.85rem",
                        color: "#92400e",
                      }}
                    >
                      <p style={{ margin: "0 0 0.5rem" }}>
                        Anda belum memiliki hasil evaluasi portofolio.
                      </p>
                      <Link href="/assess" style={{ textDecoration: "underline", fontWeight: 700 }}>
                        Nilai Bukti Portofolio Sekarang →
                      </Link>
                    </div>
                  )}
                </div>

                {/* URL Bukti Portofolio Tambahan */}
                <div className="field">
                  <label htmlFor="applicant-portfolio">
                    Tautan Bukti Portofolio (Opsional)
                  </label>
                  <input
                    id="applicant-portfolio"
                    type="url"
                    placeholder="https://github.com/... atau https://behance.net/..."
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                  <p className="hint">
                    Repositori GitHub, profil Behance/Dribbble, Figma, atau dokumen pendukung.
                  </p>
                </div>

                {/* Surat Pengantar */}
                <div className="field">
                  <label htmlFor="applicant-cover-letter">
                    Surat Pengantar Singkat (Cover Letter)
                  </label>
                  <textarea
                    id="applicant-cover-letter"
                    rows={4}
                    placeholder="Jelaskan secara ringkas motivasi Anda, pengalaman relevan, atau sorotan karya terbaik..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.75rem" }}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={isSubmitting}
                    onClick={() => setApplyJob(null)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="button" disabled={isSubmitting}>
                    {isSubmitting ? "Mengirimkan Lamaran..." : "Kirimkan Lamaran"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
