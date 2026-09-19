"use client";

import Link from "next/link";
import { useEffect, useState, useId, useCallback, useRef } from "react";
import { authHeaders, getSupabase } from "@/lib/auth-client";
import { setupJobRealtimeSync, broadcastJobSync } from "@/lib/realtime-jobs";
import {
  getDeletedJobIds,
  markJobAsDeleted,
  filterOutDeletedJobs,
} from "@/lib/job-tombstone";
import type {
  JobPosting,
  JobApplication,
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
  const [phoneCountryCode, setPhoneCountryCode] = useState("+62");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Resumé state (Jobstreet reference)
  const [resumeOption, setResumeOption] = useState<"attached" | "none">("attached");
  const [resumeFileName, setResumeFileName] = useState("2_CV_Mochamad Triandra Andantyo.pdf");
  const [resumeUploadTime, setResumeUploadTime] = useState("Ditambahkan 1 hari yang lalu");
  const [isPrimaryCv, setIsPrimaryCv] = useState(true);
  const [showResumeMenu, setShowResumeMenu] = useState(false);
  const [resumeFileBlob, setResumeFileBlob] = useState<File | null>(null);

  // Cover letter state (Jobstreet reference)
  const [coverLetterMode, setCoverLetterMode] = useState<"upload" | "write" | "none">("write");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterFileName, setCoverLetterFileName] = useState("");

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<JobApplication | null>(null);

  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const coverLetterFileInputRef = useRef<HTMLInputElement>(null);

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
      // applicantName tetap kosong tanpa nilai default
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
        // applicantName tetap kosong tanpa nilai default
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
  const fetchJobs = useCallback(() => {
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
          setJobs(filterOutDeletedJobs(data));
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

  useEffect(() => {
    const cancel = fetchJobs();
    return () => {
      cancel?.();
    };
  }, [fetchJobs]);

  // 3-Lapis Real-time Synchronization (Supabase Realtime + BroadcastChannel + Window focus)
  useEffect(() => {
    const unsubscribe = setupJobRealtimeSync({
      onJobCreated: () => {
        fetchJobs();
      },
      onJobUpdated: (updatedJob) => {
        const isDeleted = getDeletedJobIds().has(updatedJob.id);
        // Jika status lowongan ditutup oleh HR atau telah dihapus, buang dari portal pelamar
        setJobs((prev) =>
          isDeleted || updatedJob.status === "closed"
            ? prev.filter((j) => j.id !== updatedJob.id)
            : prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)),
        );

        setDetailJob((prev) => {
          if (!prev || prev.id !== updatedJob.id) return prev;
          return isDeleted || updatedJob.status === "closed" ? null : updatedJob;
        });

        // Sinkronisasi data filter dengan server
        fetchJobs();
      },
      onJobDeleted: (deletedJobId) => {
        markJobAsDeleted(deletedJobId);
        setJobs((prev) => prev.filter((j) => j.id !== deletedJobId));
        setDetailJob((prev) => (prev?.id === deletedJobId ? null : prev));
        setApplyJob((prev) => (prev?.id === deletedJobId ? null : prev));
      },
      onRefresh: () => {
        fetchJobs();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [fetchJobs]);

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
    setSubmittedApp(null);
    setSubmitError("");
    setApplicantName(""); // Heading [Nama Lengkap] kosong tanpa nilai default
    if (currentUser) {
      setApplicantEmail(currentUser.email || "");
    } else {
      setApplicantEmail("");
    }
    setPhone("");
    setPhoneCountryCode("+62");
    setLocation("");
    setResumeOption("attached");
    setResumeFileName("2_CV_Mochamad Triandra Andantyo.pdf");
    setResumeUploadTime("Ditambahkan 1 hari yang lalu");
    setIsPrimaryCv(true);
    setShowResumeMenu(false);
    setResumeFileBlob(null);
    setCoverLetterMode("write");
    setCoverLetter("");
    setCoverLetterFileName("");

    // Pre-select assessment matching field or highest score
    if (userAssessments.length > 0) {
      const matchField = userAssessments.find((a) => {
        if (job.field === "informatics") return a.role.toLowerCase().includes("web");
        if (job.field === "design") return a.role.toLowerCase().includes("graphic");
        if (job.field === "marketing") return a.role.toLowerCase().includes("marketer");
        return false;
      });
      setSelectedAssessmentId(matchField ? matchField.id : userAssessments[0].id);
    } else {
      setSelectedAssessmentId("");
    }
  }

  function handleResumeFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file melebihi batas 5MB.");
      return;
    }
    setResumeFileBlob(file);
    setResumeFileName(file.name);
    setResumeUploadTime("Baru saja diunggah");
    setResumeOption("attached");
    setShowResumeMenu(false);
  }

  function handleDownloadResume() {
    if (resumeFileBlob) {
      const url = URL.createObjectURL(resumeFileBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeFileName || "CV_Resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const candidateInfo = [
        "Curriculum Vitae / Resume",
        `Nama: ${applicantName || "Kandidat"}`,
        `Email: ${applicantEmail || ""}`,
        phone ? `Telepon: ${phoneCountryCode} ${phone}` : "",
        location ? `Lokasi: ${location}` : "",
        `Berkas: ${resumeFileName}`,
      ]
        .filter(Boolean)
        .join("\n");
      const blob = new Blob([candidateInfo], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeFileName && resumeFileName.endsWith(".pdf") ? resumeFileName : `${resumeFileName || "Resume"}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setShowResumeMenu(false);
  }

  function handleDeleteResume() {
    setResumeFileBlob(null);
    setResumeFileName("");
    setResumeOption("none");
    setShowResumeMenu(false);
  }

  function handleCoverLetterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file melebihi batas 5MB.");
      return;
    }
    setCoverLetterFileName(file.name);
  }

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applyJob || !currentUser) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const selectedAssessment = userAssessments.find((a) => a.id === selectedAssessmentId);
      const headers = await authHeaders();

      const cleanPhone = phone.trim();
      const fullPhone = cleanPhone
        ? cleanPhone.startsWith("+")
          ? cleanPhone
          : `${phoneCountryCode} ${cleanPhone.replace(/^0+/, "")}`
        : undefined;

      const payload = {
        candidateName: applicantName.trim(),
        candidateEmail: applicantEmail.trim(),
        phone: fullPhone,
        location: location.trim() || undefined,
        resumeFileName:
          resumeOption === "attached"
            ? resumeFileName.trim() || "2_CV_Mochamad Triandra Andantyo.pdf"
            : undefined,
        coverLetterMode,
        coverLetter: coverLetterMode === "write" ? coverLetter.trim() || undefined : undefined,
        coverLetterFileName:
          coverLetterMode === "upload" ? coverLetterFileName.trim() || undefined : undefined,
        assessmentId: selectedAssessment ? selectedAssessment.id : null,
        skillbridgeScore: selectedAssessment?.finalScore ?? null,
        portfolioUrl: portfolioUrl.trim() || undefined,
      };

      const res = await fetch(`/api/jobs/${applyJob.id}/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as JobApplication & { error?: string };
      if (!res.ok) {
        throw new Error(body.error || "Gagal mengirimkan lamaran.");
      }

      setSubmittedApp(body);
      setSubmitSuccess(true);
      broadcastJobSync({ type: "JOBS_REFRESH" });
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
          {field !== "all" || minEducation !== "all" || compensationType !== "all" || workplaceType !== "all" || search.trim().length > 0 ? (
            <>
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
            </>
          ) : (
            <>
              <h2>Belum Ada Lowongan Terdaftar</h2>
              <p className="hint" style={{ maxWidth: "560px", margin: "0.5rem auto 1.5rem" }}>
                Saat ini belum ada lowongan pekerjaan yang dibuka oleh mitra perusahaan. Silakan cek kembali secara berkala atau pantau pembaharuan dari kami.
              </p>
            </>
          )}
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
            background: "rgba(20, 33, 61, 0.75)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            overflow: "hidden",
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
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              transform: "translateZ(0)",
              willChange: "scroll-position",
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
            background: "rgba(20, 33, 61, 0.75)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            overflow: "hidden",
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
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              transform: "translateZ(0)",
              willChange: "scroll-position",
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
              // Sukses Pengiriman & Evaluasi AI Kriteria Lowongan
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    margin: "0 auto 0.75rem",
                    background: "#e6f4ea",
                    color: "#137333",
                    border: "2px solid #137333",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
                <h2 id="apply-job-title" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
                  Lamaran Berhasil Terkirim!
                </h2>
                <p style={{ color: "var(--muted)", marginBottom: "1.25rem", lineHeight: 1.5, fontSize: "0.95rem" }}>
                  Lamaran Anda untuk posisi <strong>{applyJob.title}</strong> di <strong>{applyJob.companyName}</strong> telah diterima oleh tim HR bersama bukti portofolio Anda.
                </p>

                {/* Kartu Ringkasan Hasil Evaluasi Kecocokan AI */}
                {submittedApp?.fitEvaluation && (
                  <div
                    style={{
                      textAlign: "left",
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1.25rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    {/* Header Kartu: Judul & Level Kesesuaian */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid var(--line)",
                        paddingBottom: "0.75rem",
                        marginBottom: "1rem",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            display: "block",
                          }}
                        >
                          Transparansi Penilaian Berbasis Kriteria Lowongan
                        </span>
                        <h3 style={{ margin: "0.15rem 0 0", fontSize: "1.1rem" }}>
                          Hasil Evaluasi Kecocokan AI
                        </h3>
                      </div>

                      {/* Level Kesesuaian Badge */}
                      {(() => {
                        const level = submittedApp.fitEvaluation.fitLevel;
                        const score = submittedApp.fitEvaluation.score;
                        if (level === "high" || score >= 75) {
                          return (
                            <span
                              className="chip"
                              style={{
                                background: "#e6f4ea",
                                color: "#137333",
                                borderColor: "#b7e1cd",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                padding: "0.25rem 0.65rem",
                              }}
                            >
                              Tingkat Kesesuaian: Tinggi
                            </span>
                          );
                        }
                        if (level === "medium" || score >= 50) {
                          return (
                            <span
                              className="chip"
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                borderColor: "#fde68a",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                padding: "0.25rem 0.65rem",
                              }}
                            >
                              Tingkat Kesesuaian: Menengah
                            </span>
                          );
                        }
                        return (
                          <span
                            className="chip"
                            style={{
                              background: "#f3f4f6",
                              color: "#4b5563",
                              borderColor: "var(--line)",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              padding: "0.25rem 0.65rem",
                            }}
                          >
                            Tingkat Kesesuaian: Perlu Penguatan
                          </span>
                        );
                      })()}
                    </div>

                    {/* Skor Kesesuaian dengan Lowongan */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.4rem",
                        marginBottom: "1rem",
                        paddingBottom: "0.85rem",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span
                        className="score"
                        style={{
                          fontSize: "2.4rem",
                          lineHeight: 1,
                          color:
                            submittedApp.fitEvaluation.score >= 75
                              ? "#15803d"
                              : submittedApp.fitEvaluation.score >= 50
                              ? "#0284c7"
                              : "var(--ink)",
                        }}
                      >
                        {submittedApp.fitEvaluation.score}
                      </span>
                      <span style={{ fontSize: "1.05rem", color: "var(--muted)", fontWeight: 700 }}>
                        /100
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted)", marginLeft: "0.5rem" }}>
                        Skor Kesesuaian dengan Lowongan ({applyJob.title})
                      </span>
                    </div>

                    {/* Ringkasan Penilaian AI */}
                    {submittedApp.fitEvaluation.summary && (
                      <div
                        style={{
                          background: "white",
                          border: "1px solid var(--line)",
                          borderLeft: "3px solid var(--chalk)",
                          padding: "0.75rem 0.9rem",
                          borderRadius: "6px",
                          marginBottom: "1rem",
                          fontSize: "0.88rem",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            color: "var(--ink)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Ringkasan Penilaian AI:
                        </strong>
                        <p style={{ margin: 0, color: "var(--ink)" }}>
                          {submittedApp.fitEvaluation.summary}
                        </p>
                      </div>
                    )}

                    {/* Poin-poin Kriteria Lowongan yang Berhasil Dipenuhi */}
                    {submittedApp.fitEvaluation.matchingCriteria &&
                      submittedApp.fitEvaluation.matchingCriteria.length > 0 && (
                        <div style={{ marginBottom: "1rem" }}>
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontSize: "0.82rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "#15803d",
                              marginBottom: "0.35rem",
                            }}
                          >
                            <span>✓</span> Kriteria Lowongan yang Berhasil Anda Penuhi:
                          </strong>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "1.25rem",
                              fontSize: "0.88rem",
                              lineHeight: 1.5,
                              color: "var(--ink)",
                            }}
                          >
                            {submittedApp.fitEvaluation.matchingCriteria.map((item, idx) => (
                              <li key={idx} style={{ marginBottom: "0.2rem" }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Catatan Pengembangan Diri jika ada kriteria belum terpenuhi */}
                    {submittedApp.fitEvaluation.missingCriteria &&
                      submittedApp.fitEvaluation.missingCriteria.length > 0 && (
                        <div style={{ marginBottom: "0.85rem" }}>
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontSize: "0.82rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--danger)",
                              marginBottom: "0.35rem",
                            }}
                          >
                            <span>⚠</span> Catatan Pengembangan Diri (Kriteria Belum Terpenuhi):
                          </strong>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "1.25rem",
                              fontSize: "0.88rem",
                              lineHeight: 1.5,
                              color: "var(--muted)",
                            }}
                          >
                            {submittedApp.fitEvaluation.missingCriteria.map((item, idx) => (
                              <li key={idx} style={{ marginBottom: "0.2rem" }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Rekomendasi AI */}
                    {submittedApp.fitEvaluation.recommendation && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.65rem 0.85rem",
                          background: "#fff",
                          border: "1px solid var(--line)",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          lineHeight: 1.45,
                        }}
                      >
                        <strong style={{ color: "var(--ink)" }}>Rekomendasi AI: </strong>
                        <span style={{ color: "var(--muted)" }}>
                          {submittedApp.fitEvaluation.recommendation}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="button" href="/history">
                    Pantau Status di Riwayat
                  </Link>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setApplyJob(null);
                      setSubmittedApp(null);
                    }}
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

                {/* Headline [Informasi Pribadi] */}
                <div style={{ marginTop: "1.5rem", marginBottom: "1.25rem" }}>
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      margin: "0 0 1rem",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Informasi Pribadi
                  </h3>

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

                  <div className="field">
                    <label htmlFor="applicant-location">Lokasi rumah</label>
                    <input
                      id="applicant-location"
                      type="text"
                      placeholder="Depok, Jawa Barat"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="applicant-phone">Nomor telepon</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(160px, auto) 1fr",
                        gap: "0.5rem",
                      }}
                    >
                      <select
                        id="applicant-phone-code"
                        value={phoneCountryCode}
                        onChange={(e) => setPhoneCountryCode(e.target.value)}
                        aria-label="Kode Negara"
                        style={{
                          minHeight: "48px",
                          padding: "0.75rem",
                          border: "1px solid #8d908c",
                          background: "white",
                        }}
                      >
                        <option value="+62">Indonesia (+62)</option>
                        <option value="+65">Singapura (+65)</option>
                        <option value="+60">Malaysia (+60)</option>
                        <option value="+61">Australia (+61)</option>
                        <option value="+1">Amerika Serikat (+1)</option>
                      </select>
                      <input
                        id="applicant-phone"
                        type="tel"
                        placeholder="Masukkan nomor telepon"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Headline [Resumé] */}
                <div style={{ marginTop: "1.75rem", marginBottom: "1.25rem" }}>
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      margin: "0 0 0.85rem",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Resumé
                  </h3>

                  {/* Radio Option 1: File Resume Terlampir */}
                  <div
                    style={{
                      border:
                        resumeOption === "attached"
                          ? "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      background:
                        resumeOption === "attached"
                          ? "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="resumeOption"
                        value="attached"
                        checked={resumeOption === "attached"}
                        onChange={() => setResumeOption("attached")}
                        style={{
                          width: "18px",
                          minHeight: "18px",
                          marginTop: "0.25rem",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Kartu Berkas Resume */}
                        {resumeFileName ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "var(--paper)",
                              border: "1px solid var(--line)",
                              borderRadius: "6px",
                              padding: "0.75rem 0.9rem",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.65rem",
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{ fontSize: "1.4rem", lineHeight: 1 }}
                                aria-hidden="true"
                              >
                                📄
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: "0.9rem",
                                      color: "var(--ink)",
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {resumeFileName}
                                  </span>
                                  <span
                                    className="chip"
                                    style={{
                                      background: "#e0f2fe",
                                      color: "#0369a1",
                                      borderColor: "#bae6fd",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.45rem",
                                      borderRadius: "999px",
                                    }}
                                  >
                                    Utama
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: "0.15rem 0 0",
                                    fontSize: "0.78rem",
                                    color: "var(--muted)",
                                  }}
                                >
                                  {resumeUploadTime}
                                </p>
                              </div>
                            </div>
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowResumeMenu((prev) => !prev);
                                }}
                                aria-label="Opsi berkas resume"
                                title="Opsi berkas resume"
                                style={{
                                  background: showResumeMenu ? "rgba(0, 0, 0, 0.06)" : "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "1.25rem",
                                  padding: "0.25rem 0.6rem",
                                  minHeight: "auto",
                                  color: "var(--muted)",
                                  lineHeight: 1,
                                  borderRadius: "6px",
                                  transition: "background 0.15s ease",
                                }}
                              >
                                ⋮
                              </button>

                              {showResumeMenu && (
                                <>
                                  <div
                                    style={{
                                      position: "fixed",
                                      inset: 0,
                                      zIndex: 50,
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowResumeMenu(false);
                                    }}
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      right: 0,
                                      top: "calc(100% + 4px)",
                                      background: "#ffffff",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "10px",
                                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14)",
                                      zIndex: 51,
                                      minWidth: "140px",
                                      overflow: "hidden",
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    {/* Menu Opsi 1: Unduh */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDownloadResume();
                                      }}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.65rem",
                                        width: "100%",
                                        padding: "0.75rem 1.1rem",
                                        background: "#ffffff",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "0.92rem",
                                        fontWeight: 600,
                                        color: "#1e293b",
                                        textAlign: "left",
                                        minHeight: "auto",
                                        transition: "background 0.15s ease",
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                                    >
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                      </svg>
                                      <span>Unduh</span>
                                    </button>

                                    {/* Menu Opsi 2: Hapus */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteResume();
                                      }}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.65rem",
                                        width: "100%",
                                        padding: "0.75rem 1.1rem",
                                        background: "#fee2e2",
                                        border: "none",
                                        borderTop: "1px solid #fecaca",
                                        cursor: "pointer",
                                        fontSize: "0.92rem",
                                        fontWeight: 600,
                                        color: "#dc2626",
                                        textAlign: "left",
                                        minHeight: "auto",
                                        transition: "background 0.15s ease",
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fca5a5")}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fee2e2")}
                                    >
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                      <span>Hapus</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "0.75rem 0.9rem",
                              background: "var(--paper)",
                              border: "1px dashed var(--line)",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              color: "var(--muted)",
                            }}
                          >
                            Belum ada resume terlampir. Gunakan tombol <strong>Unggah</strong> di bawah untuk menambahkan resume Anda.
                          </div>
                        )}

                        {/* Box sub-pilihan: Jadikan CV utama */}
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.45rem",
                            marginTop: "0.65rem",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            color: "var(--ink)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isPrimaryCv}
                            onChange={(e) => setIsPrimaryCv(e.target.checked)}
                            style={{
                              width: "16px",
                              minHeight: "16px",
                              margin: 0,
                              cursor: "pointer",
                            }}
                          />
                          <span>Jadikan CV utama</span>
                          <span
                            title="CV utama akan otomatis digunakan saat Anda melamar lowongan pekerjaan berikutnya."
                            style={{
                              color: "var(--muted)",
                              cursor: "help",
                              fontSize: "0.85rem",
                              display: "inline-block",
                            }}
                          >
                            ⓘ
                          </span>
                        </label>
                      </div>
                    </label>
                  </div>

                  {/* Radio Option 2: Jangan sertakan resume */}
                  <div
                    style={{
                      border:
                        resumeOption === "none"
                          ? "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "0.85rem 1rem",
                      marginBottom: "0.75rem",
                      background:
                        resumeOption === "none"
                          ? "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        fontSize: "0.92rem",
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="radio"
                        name="resumeOption"
                        value="none"
                        checked={resumeOption === "none"}
                        onChange={() => setResumeOption("none")}
                        style={{
                          width: "18px",
                          minHeight: "18px",
                          margin: 0,
                          cursor: "pointer",
                        }}
                      />
                      <span>Jangan sertakan resume</span>
                    </label>
                  </div>

                  {/* Tombol [ ↑ Unggah ] untuk memilih file dokumen baru */}
                  <div style={{ marginTop: "0.65rem", marginBottom: "0.35rem" }}>
                    <input
                      ref={resumeFileInputRef}
                      type="file"
                      accept=".doc,.docx,.pdf,.txt,.rtf"
                      style={{ display: "none" }}
                      onChange={handleResumeFileChange}
                    />
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => resumeFileInputRef.current?.click()}
                      style={{
                        minHeight: "38px",
                        padding: "0.45rem 1rem",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <span style={{ fontSize: "1rem" }}>↑</span> Unggah
                    </button>
                  </div>
                  <p
                    className="hint"
                    style={{
                      margin: "0.35rem 0 1rem",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    Jenis file yang diterima: .doc, .docx, .pdf, .txt, dan .rtf (batas 5MB).
                  </p>

                  {/* Pilih Asesmen Portofolio Skillbridge */}
                  <div className="field" style={{ marginTop: "1rem" }}>
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
                              {a.role} — Skor: {a.finalScore ?? "—"}/100 (
                              {new Date(a.createdAt).toLocaleDateString("id-ID")})
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
                        <Link
                          href="/assess"
                          style={{ textDecoration: "underline", fontWeight: 700 }}
                        >
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
                </div>

                {/* Headline [Surat lamaran] */}
                <div style={{ marginTop: "1.75rem", marginBottom: "1.25rem" }}>
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      margin: "0 0 0.85rem",
                      borderBottom: "1px solid var(--line)",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Surat lamaran
                  </h3>

                  {/* Radio 1: Unggah surat lamaran */}
                  <div
                    style={{
                      border:
                        coverLetterMode === "upload"
                          ? "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      background:
                        coverLetterMode === "upload"
                          ? "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.92rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="coverLetterMode"
                        value="upload"
                        checked={coverLetterMode === "upload"}
                        onChange={() => setCoverLetterMode("upload")}
                        style={{
                          width: "18px",
                          minHeight: "18px",
                          marginTop: "0.2rem",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <span>Unggah surat lamaran</span>
                        {coverLetterMode === "upload" && (
                          <div style={{ marginTop: "0.75rem" }}>
                            <input
                              ref={coverLetterFileInputRef}
                              type="file"
                              accept=".doc,.docx,.pdf,.txt,.rtf"
                              style={{ display: "none" }}
                              onChange={handleCoverLetterFileChange}
                            />
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => coverLetterFileInputRef.current?.click()}
                              style={{
                                minHeight: "38px",
                                padding: "0.45rem 1rem",
                                fontSize: "0.88rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>↑</span> Unggah
                            </button>
                            <p
                              className="hint"
                              style={{
                                margin: "0.35rem 0 0",
                                fontSize: "0.8rem",
                                color: "var(--muted)",
                              }}
                            >
                              Jenis file yang diterima: .doc, .docx, .pdf, .txt, dan .rtf (batas 5MB).
                            </p>

                            {coverLetterFileName && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  background: "var(--paper)",
                                  border: "1px solid var(--line)",
                                  borderRadius: "6px",
                                  padding: "0.6rem 0.85rem",
                                  marginTop: "0.65rem",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <span>📄</span>
                                  <span
                                    style={{
                                      fontSize: "0.88rem",
                                      fontWeight: 600,
                                      color: "var(--ink)",
                                    }}
                                  >
                                    {coverLetterFileName}
                                  </span>
                                  <span
                                    className="chip"
                                    style={{
                                      background: "#e6f4ea",
                                      color: "#137333",
                                      borderColor: "#b7e1cd",
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.4rem",
                                      borderRadius: "999px",
                                    }}
                                  >
                                    Terunggah
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  aria-label="Hapus berkas surat lamaran"
                                  onClick={() => setCoverLetterFileName("")}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "1.1rem",
                                    color: "var(--muted)",
                                    minHeight: "auto",
                                    padding: "0.2rem",
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Radio 2: Tulis surat lamaran */}
                  <div
                    style={{
                      border:
                        coverLetterMode === "write"
                          ? "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      background:
                        coverLetterMode === "write"
                          ? "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.92rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="coverLetterMode"
                        value="write"
                        checked={coverLetterMode === "write"}
                        onChange={() => setCoverLetterMode("write")}
                        style={{
                          width: "18px",
                          minHeight: "18px",
                          marginTop: "0.2rem",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <span>Tulis surat lamaran</span>
                        {coverLetterMode === "write" && (
                          <div style={{ marginTop: "0.65rem" }}>
                            <p
                              style={{
                                margin: "0 0 0.65rem",
                                fontSize: "0.85rem",
                                color: "var(--muted)",
                                lineHeight: 1.5,
                                fontWeight: 400,
                              }}
                            >
                              Perkenalkan diri kamu dan jelaskan secara singkat mengapa kamu cocok
                              untuk jabatan ini. Pertimbangkan keahlian, kualifikasi, dan pengalaman
                              terkait kamu yang relevan.
                            </p>
                            <textarea
                              id="applicant-cover-letter"
                              rows={5}
                              placeholder="Tuliskan surat lamaran Anda di sini..."
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Radio 3: Jangan sertakan surat lamaran */}
                  <div
                    style={{
                      border:
                        coverLetterMode === "none"
                          ? "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "0.85rem 1rem",
                      marginBottom: "0.75rem",
                      background:
                        coverLetterMode === "none"
                          ? "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        fontSize: "0.92rem",
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="radio"
                        name="coverLetterMode"
                        value="none"
                        checked={coverLetterMode === "none"}
                        onChange={() => setCoverLetterMode("none")}
                        style={{
                          width: "18px",
                          minHeight: "18px",
                          margin: 0,
                          cursor: "pointer",
                        }}
                      />
                      <span>Jangan sertakan surat lamaran</span>
                    </label>
                  </div>
                </div>

                {/* Privasi dan Penggunaan Data */}
                <div
                  style={{
                    marginTop: "2rem",
                    marginBottom: "1.5rem",
                    padding: "1.1rem 1.25rem",
                    background: "#f8fafc",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    fontSize: "0.83rem",
                    lineHeight: 1.55,
                    color: "var(--ink)",
                  }}
                >
                  {/* Banner Peringatan */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      padding: "0.6rem 0.8rem",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      color: "#92400e",
                      fontWeight: 700,
                      marginBottom: "0.9rem",
                    }}
                  >
                    <span style={{ fontSize: "1rem", lineHeight: 1.2 }}>⚠️</span>
                    <span>Jaga Diri Anda: Jangan sertakan informasi sensitif dalam dokumen Anda.</span>
                  </div>

                  {/* Lindungi Privasi Anda */}
                  <div style={{ marginBottom: "0.85rem" }}>
                    <strong
                      style={{
                        display: "block",
                        color: "var(--ink)",
                        marginBottom: "0.25rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      Lindungi Privasi Anda
                    </strong>
                    <p style={{ margin: 0, color: "var(--muted)" }}>
                      Hanya bagikan informasi yang diperlukan. Jangan sertakan konten seperti dokumen
                      identitas (misalnya KTP, paspor, SIM), informasi keuangan (misalnya nomor rekening,
                      NPWP), suku/ras, agama, atau informasi kesehatan.
                    </p>
                  </div>

                  {/* Bagaimana Skillbridge AI Menggunakan Data Anda */}
                  <div>
                    <strong
                      style={{
                        display: "block",
                        color: "var(--ink)",
                        marginBottom: "0.25rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      Bagaimana Skillbridge AI Menggunakan Data Anda
                    </strong>
                    <p style={{ margin: "0 0 0.4rem", color: "var(--muted)" }}>
                      Dengan memanfaatkan hasil evaluasi portofolio nyata dan skor kesiapan kerja
                      tervalidasi, Skillbridge AI menganalisis kesesuaian objektif kriteria Anda terhadap
                      lowongan dan menampilkannya kepada Anda dan tim HR mitra industri.
                    </p>
                    <p style={{ margin: "0 0 0.4rem", color: "var(--muted)" }}>
                      Skillbridge AI menjaga integritas dokumen dan menghapus tautan eksternal yang tidak
                      aman untuk mematuhi standar keamanan kami.
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontStyle: "italic" }}>
                      Dengan mengirimkan lamaran ini, Anda menyetujui Kebijakan Privasi dan Perlindungan
                      Data Skillbridge AI.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                    marginTop: "1.75rem",
                  }}
                >
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
