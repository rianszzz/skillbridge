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
  PortfolioItemType,
} from "@/lib/types";

export type CandidatePortfolioFormItem = {
  id: string;
  type: PortfolioItemType;
  attachmentMode?: "link" | "file" | "both";
  title: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string;
  verifiedSkills: string[];
};

export function detectPortfolioTypeFromUrl(url: string): PortfolioItemType | null {
  const lower = url.toLowerCase().trim();
  if (!lower) return null;
  if (lower.includes("github.com")) {
    if (lower.match(/github\.com\/[^/]+\/[^/]+/)) {
      return "github_repo";
    }
    return "github_profile";
  }
  if (lower.includes("figma.com")) {
    return "figma";
  }
  if (lower.includes("behance.net") || lower.includes("dribbble.com")) {
    return "design";
  }
  if (
    lower.includes("vercel.app") ||
    lower.includes("netlify.app") ||
    lower.includes(".io") ||
    lower.includes(".dev") ||
    lower.includes(".web.app")
  ) {
    return "live_demo";
  }
  if (
    lower.includes("notion.site") ||
    lower.includes("notion.so") ||
    lower.includes("medium.com") ||
    lower.includes("drive.google.com")
  ) {
    return "case_study";
  }
  return null;
}

const PORTFOLIO_TYPE_OPTIONS: { id: PortfolioItemType; label: string; placeholder: string }[] = [
  { id: "github_repo", label: "Repositori GitHub", placeholder: "https://github.com/username/project" },
  { id: "github_profile", label: "Profil GitHub", placeholder: "https://github.com/username" },
  { id: "live_demo", label: "Demo Web Live", placeholder: "https://my-project.vercel.app" },
  { id: "design", label: "Portofolio Desain", placeholder: "https://behance.net/gallery/..." },
  { id: "figma", label: "Prototype Figma", placeholder: "https://figma.com/file/..." },
  { id: "case_study", label: "Case Study & Metrik", placeholder: "https://notion.so/... atau Google Drive" },
  { id: "certificate", label: "Sertifikasi", placeholder: "https://dicoding.com/certificates/..." },
  { id: "other", label: "Tautan Karya Lainnya", placeholder: "https://..." },
];

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

  // Saved applicant profile state (Jobstreet-style personal profile box)
  const [savedApplicantProfile, setSavedApplicantProfile] = useState<{
    name: string;
    email: string;
    location: string;
    phoneCountryCode: string;
    phone: string;
    photoUrl?: string;
  } | null>(null);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState("");
  const [photoHover, setPhotoHover] = useState(false);
  const [pencilHover, setPencilHover] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const photoFileInputRef = useRef<HTMLInputElement>(null);

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
  const [coverLetterError, setCoverLetterError] = useState("");

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<CandidatePortfolioFormItem[]>([]);
  const [dragOverPortfolioId, setDragOverPortfolioId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<JobApplication | null>(null);

  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const coverLetterFileInputRef = useRef<HTMLInputElement>(null);
  const coverLetterTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Hydrate saved applicant profile from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem("skillbridge_saved_applicant_profile");
        if (raw) {
          const data = JSON.parse(raw);
          if (data && typeof data === "object" && (data.name || data.email)) {
            setSavedApplicantProfile(data);
            setIsProfileSaved(true);
            setIsEditingProfile(false);
            if (data.name) setApplicantName(data.name);
            if (data.email) setApplicantEmail(data.email);
            if (data.location) setLocation(data.location);
            if (data.phoneCountryCode) setPhoneCountryCode(data.phoneCountryCode);
            if (data.phone) setPhone(data.phone);
            if (data.photoUrl) setAvatarPhotoUrl(data.photoUrl);
          }
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
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
    setCoverLetterError("");
    setProfileSaveError("");
    setPhotoHover(false);
    setPencilHover(false);

    // Load from localStorage jika sudah tersimpan
    let hasLoadedProfile = false;
    try {
      const raw = localStorage.getItem("skillbridge_saved_applicant_profile");
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object" && (data.name || data.email)) {
          setSavedApplicantProfile(data);
          setIsProfileSaved(true);
          setIsEditingProfile(false);
          setApplicantName(data.name || "");
          setApplicantEmail(data.email || currentUser?.email || "");
          setLocation(data.location || "");
          setPhoneCountryCode(data.phoneCountryCode || "+62");
          setPhone(data.phone || "");
          setAvatarPhotoUrl(data.photoUrl || "");
          hasLoadedProfile = true;
        }
      }
    } catch {
      // ignore
    }

    if (!hasLoadedProfile) {
      setApplicantName(""); // Heading [Nama Lengkap] kosong tanpa nilai default
      if (currentUser) {
        setApplicantEmail(currentUser.email || "");
      } else {
        setApplicantEmail("");
      }
      setPhone("");
      setPhoneCountryCode("+62");
      setLocation("");
      setAvatarPhotoUrl("");
      setSavedApplicantProfile(null);
      setIsProfileSaved(false);
      setIsEditingProfile(true);
    }
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

    setPortfolioItems([]);
    setPortfolioUrl("");
  }

  function handleAddPortfolioItem() {
    const defaultType: PortfolioItemType =
      applyJob?.field === "informatics"
        ? "github_repo"
        : applyJob?.field === "design"
          ? "design"
          : "case_study";

    setPortfolioItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: defaultType,
        attachmentMode: "link",
        title: "",
        url: "",
        fileName: "",
        fileSize: 0,
        fileType: "",
        fileData: "",
        verifiedSkills: [],
      },
    ]);
  }

  function handleUpdatePortfolioItem(
    id: string,
    field: "type" | "title" | "url" | "attachmentMode",
    value: string,
  ) {
    setPortfolioItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "url") {
          const autoType = detectPortfolioTypeFromUrl(value);
          return {
            ...item,
            url: value,
            type: autoType || item.type,
          };
        }
        return { ...item, [field]: value };
      }),
    );
  }

  function handlePortfolioFileChange(id: string, file: File | null) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExts = ["docx", "xlsx", "pdf", "jpg", "jpeg", "png"];
    if (!allowedExts.includes(ext)) {
      alert("Format file tidak didukung. Harap unggah berkas DOCX, XLSX, PDF, JPG, atau PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file melebihi batas 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPortfolioItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData: dataUrl,
                title: item.title.trim() || file.name.replace(/\.[^/.]+$/, ""),
              }
            : item,
        ),
      );
    };
    reader.readAsDataURL(file);
  }

  function handleClearPortfolioFile(id: string) {
    setPortfolioItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              fileName: "",
              fileSize: 0,
              fileType: "",
              fileData: "",
            }
          : item,
      ),
    );
  }

  function handleTogglePortfolioSkill(itemId: string, skill: string) {
    setPortfolioItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.verifiedSkills.includes(skill);
        const updatedSkills = exists
          ? item.verifiedSkills.filter((s) => s !== skill)
          : [...item.verifiedSkills, skill];
        return { ...item, verifiedSkills: updatedSkills };
      }),
    );
  }

  function handleRemovePortfolioItem(id: string) {
    setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
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
    setCoverLetterError("");
    setSubmitError("");
  }

  function handleSaveApplicantProfile() {
    if (!applicantName.trim()) {
      setProfileSaveError("Nama Lengkap wajib diisi.");
      return;
    }
    if (!applicantEmail.trim()) {
      setProfileSaveError("Alamat Email wajib diisi.");
      return;
    }
    setProfileSaveError("");

    const profileData = {
      name: applicantName.trim(),
      email: applicantEmail.trim(),
      location: location.trim(),
      phoneCountryCode,
      phone: phone.trim(),
      photoUrl: avatarPhotoUrl || undefined,
    };

    try {
      localStorage.setItem("skillbridge_saved_applicant_profile", JSON.stringify(profileData));
    } catch (err) {
      console.error("Gagal menyimpan profil ke localStorage:", err);
    }

    setSavedApplicantProfile(profileData);
    setIsProfileSaved(true);
    setIsEditingProfile(false);
    setSubmitError("");
  }

  function handleCancelEditProfile() {
    if (savedApplicantProfile) {
      setApplicantName(savedApplicantProfile.name || "");
      setApplicantEmail(savedApplicantProfile.email || "");
      setLocation(savedApplicantProfile.location || "");
      setPhoneCountryCode(savedApplicantProfile.phoneCountryCode || "+62");
      setPhone(savedApplicantProfile.phone || "");
      setAvatarPhotoUrl(savedApplicantProfile.photoUrl || "");
    }
    setProfileSaveError("");
    setIsEditingProfile(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    const validExtensions = [".png", ".jpg", ".jpeg"];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.includes(fileExt)) {
      alert("Harap unggah berkas foto dengan format PNG atau JPG.");
      if (photoFileInputRef.current) photoFileInputRef.current.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran foto profil melebihi batas 3MB.");
      if (photoFileInputRef.current) photoFileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setAvatarPhotoUrl(base64);
        setSavedApplicantProfile((prev) => {
          const updated = {
            name: prev?.name || applicantName.trim(),
            email: prev?.email || applicantEmail.trim(),
            location: prev?.location || location.trim(),
            phoneCountryCode: prev?.phoneCountryCode || phoneCountryCode,
            phone: prev?.phone || phone.trim(),
            photoUrl: base64,
          };
          try {
            localStorage.setItem("skillbridge_saved_applicant_profile", JSON.stringify(updated));
          } catch (err) {
            console.error("Gagal menyimpan foto profil ke localStorage:", err);
          }
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = "";
    }
  }

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applyJob || !currentUser) return;

    if (!isProfileSaved || isEditingProfile) {
      const msg = "Harap simpan Informasi Pribadi terlebih dahulu dengan menekan tombol \"Simpan Informasi Pribadi\" sebelum mengirimkan lamaran.";
      setSubmitError(msg);
      setProfileSaveError("Silakan klik \"Simpan Informasi Pribadi\" untuk mengonfirmasi data Anda.");
      const btn = document.getElementById("btn-save-personal-info");
      if (btn) {
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.focus();
      }
      return;
    }

    if (!applicantName.trim()) {
      setSubmitError("Nama Lengkap wajib diisi.");
      return;
    }
    if (!applicantEmail.trim()) {
      setSubmitError("Alamat Email wajib diisi.");
      return;
    }

    if (coverLetterMode === "upload" && (!coverLetterFileName || coverLetterFileName.trim().length === 0)) {
      const msg = "Harap unggah berkas surat lamaran Anda terlebih dahulu.";
      setSubmitError(msg);
      setCoverLetterError(msg);
      const section = document.getElementById("cover-letter-section") || document.getElementById("cover-letter-upload-radio");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      coverLetterFileInputRef.current?.focus();
      return;
    }

    if (coverLetterMode === "write" && (!coverLetter || coverLetter.trim().length === 0)) {
      const msg = "Harap tuliskan surat lamaran Anda terlebih dahulu.";
      setSubmitError(msg);
      setCoverLetterError(msg);
      if (coverLetterTextareaRef.current) {
        coverLetterTextareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        coverLetterTextareaRef.current.focus();
      } else {
        const textarea = document.getElementById("applicant-cover-letter");
        if (textarea) {
          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
          textarea.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setCoverLetterError("");

    try {
      const selectedAssessment = userAssessments.find((a) => a.id === selectedAssessmentId);
      const headers = await authHeaders();

      const cleanPhone = phone.trim();
      const fullPhone = cleanPhone
        ? cleanPhone.startsWith("+")
          ? cleanPhone
          : `${phoneCountryCode} ${cleanPhone.replace(/^0+/, "")}`
        : undefined;

      const validPortfolioItems = portfolioItems
        .filter((item) => {
          const hasFile = Boolean(item.fileName && item.fileName.trim().length > 0);
          const hasUrl = Boolean(item.url && item.url.trim().length > 0);
          return hasFile || hasUrl;
        })
        .map((item, idx) => {
          const hasFile = Boolean(item.fileName && item.fileName.trim().length > 0);
          const hasUrl = Boolean(item.url && item.url.trim().length > 0);
          const mode: "link" | "file" | "both" =
            hasFile && hasUrl ? "both" : hasFile ? "file" : "link";
          const fallbackTitle =
            item.title.trim() ||
            item.fileName ||
            (item.url ? item.url.replace(/^https?:\/\//, "") : `Portofolio #${idx + 1}`);
          return {
            id: item.id,
            title: fallbackTitle,
            attachmentMode: mode,
            url: hasUrl ? item.url.trim() : (item.fileData || undefined),
            fileName: item.fileName || undefined,
            fileSize: item.fileSize || undefined,
            fileType: item.fileType || undefined,
            fileData: item.fileData || undefined,
            type: item.type,
            verifiedSkills: item.verifiedSkills,
          };
        });

      const primaryPortfolioUrl =
        validPortfolioItems[0]?.url ||
        validPortfolioItems[0]?.fileName ||
        portfolioUrl.trim() ||
        undefined;

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
        portfolioUrl: primaryPortfolioUrl,
        portfolioItems: validPortfolioItems.length > 0 ? validPortfolioItems : undefined,
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

                  {/* Hidden input untuk unggah foto profil */}
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    style={{ display: "none" }}
                    onChange={handlePhotoChange}
                  />

                  {isProfileSaved && !isEditingProfile ? (
                    /* Mode Tersimpan: Box Informasi Pribadi (Jobstreet Style) */
                    <div
                      style={{
                        position: "relative",
                        borderRadius: "16px",
                        background: "#0b1a30",
                        color: "#ffffff",
                        padding: "1.25rem 1.4rem",
                        boxShadow: "0 6px 20px -4px rgba(11, 26, 48, 0.3)",
                      }}
                    >
                      {/* Aksen Dekoratif Magenta di Pojok Kanan Bawah */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "16px",
                          overflow: "hidden",
                          pointerEvents: "none",
                        }}
                        aria-hidden="true"
                      >
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-35px",
                            right: "-35px",
                            width: "110px",
                            height: "110px",
                            borderRadius: "50%",
                            background: "#e11d48",
                          }}
                        />
                      </div>

                      {/* Konten Box */}
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1.1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Kiri: Kotak Foto / Avatar (72px x 72px) */}
                        <div
                          style={{ position: "relative", flexShrink: 0 }}
                          onMouseEnter={() => setPhotoHover(true)}
                          onMouseLeave={() => setPhotoHover(false)}
                        >
                          {/* Tooltip melayang di atas foto */}
                          {photoHover && (
                            <div
                              role="tooltip"
                              style={{
                                position: "absolute",
                                bottom: "calc(100% + 8px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "#1f2937",
                                color: "#ffffff",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                zIndex: 30,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                                pointerEvents: "none",
                              }}
                            >
                              {avatarPhotoUrl ? "Ubah foto" : "Tambah foto"}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  borderWidth: "4px",
                                  borderStyle: "solid",
                                  borderColor: "#1f2937 transparent transparent transparent",
                                }}
                              />
                            </div>
                          )}

                          {/* Avatar Container */}
                          <div
                            onClick={() => photoFileInputRef.current?.click()}
                            tabIndex={0}
                            role="button"
                            aria-label={avatarPhotoUrl ? "Ubah foto profil" : "Tambah foto profil"}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                photoFileInputRef.current?.click();
                              }
                            }}
                            style={{
                              width: "72px",
                              height: "72px",
                              borderRadius: "14px",
                              overflow: "hidden",
                              position: "relative",
                              cursor: "pointer",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                              background: avatarPhotoUrl ? "transparent" : "#fbcfe8",
                            }}
                          >
                            {avatarPhotoUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={avatarPhotoUrl}
                                alt="Foto Profil"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  background: "#fbcfe8",
                                  color: "#1e293b",
                                  fontSize: "1.75rem",
                                  fontWeight: 700,
                                  display: "grid",
                                  placeItems: "center",
                                  userSelect: "none",
                                }}
                              >
                                {applicantName.trim().charAt(0).toUpperCase() || "M"}
                              </div>
                            )}

                            {/* Overlay saat hover: icon kamera */}
                            {photoHover && (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  background: "rgba(0, 0, 0, 0.45)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#ffffff",
                                  transition: "background 0.15s ease",
                                }}
                              >
                                <svg
                                  width="22"
                                  height="22"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                  <circle cx="12" cy="13" r="4" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tengah: Nama Lengkap & Informasi Kontak */}
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <h4
                            style={{
                              margin: "0 0 0.35rem",
                              fontSize: "1.15rem",
                              fontWeight: 700,
                              color: "#ffffff",
                              lineHeight: 1.3,
                              wordBreak: "break-word",
                            }}
                          >
                            {applicantName || "Kandidat Pelamar"}
                          </h4>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            {location ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.45rem",
                                  fontSize: "0.85rem",
                                  color: "rgba(255, 255, 255, 0.9)",
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                  style={{ flexShrink: 0, opacity: 0.85 }}
                                >
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span style={{ wordBreak: "break-word" }}>{location}</span>
                              </div>
                            ) : null}

                            {phone ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.45rem",
                                  fontSize: "0.85rem",
                                  color: "rgba(255, 255, 255, 0.9)",
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                  style={{ flexShrink: 0, opacity: 0.85 }}
                                >
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>
                                  {phone.startsWith("+")
                                    ? phone
                                    : `${phoneCountryCode} ${phone.replace(/^0+/, "")}`}
                                </span>
                              </div>
                            ) : null}

                            {applicantEmail ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.45rem",
                                  fontSize: "0.85rem",
                                  color: "rgba(255, 255, 255, 0.9)",
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                  style={{ flexShrink: 0, opacity: 0.85 }}
                                >
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                <span style={{ wordBreak: "break-all" }}>{applicantEmail}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Kanan: Tombol Edit (Pensil) */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          {pencilHover && (
                            <div
                              role="tooltip"
                              style={{
                                position: "absolute",
                                bottom: "calc(100% + 8px)",
                                right: 0,
                                background: "#1f2937",
                                color: "#ffffff",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                zIndex: 30,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                                pointerEvents: "none",
                              }}
                            >
                              Edit detail pribadi
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  right: "12px",
                                  borderWidth: "4px",
                                  borderStyle: "solid",
                                  borderColor: "#1f2937 transparent transparent transparent",
                                }}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            aria-label="Edit detail pribadi"
                            onClick={() => {
                              setProfileSaveError("");
                              setIsEditingProfile(true);
                            }}
                            onMouseEnter={() => setPencilHover(true)}
                            onMouseLeave={() => setPencilHover(false)}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: pencilHover
                                ? "rgba(255, 255, 255, 0.25)"
                                : "rgba(255, 255, 255, 0.15)",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              cursor: "pointer",
                              transition: "background 0.15s ease",
                            }}
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
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Mode Input / Edit */
                    <div>
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

                      {/* Pesan error simpan profil */}
                      {profileSaveError && (
                        <div
                          role="alert"
                          style={{
                            marginTop: "0.75rem",
                            padding: "0.5rem 0.75rem",
                            background: "#fee2e2",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            color: "#dc2626",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          {profileSaveError}
                        </div>
                      )}

                      {/* Tombol Simpan & Batal (jika sedang edit profil tersimpan) */}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "center",
                          flexWrap: "wrap",
                          marginTop: "1rem",
                        }}
                      >
                        <button
                          type="button"
                          id="btn-save-personal-info"
                          onClick={handleSaveApplicantProfile}
                          style={{
                            minHeight: "44px",
                            background: "var(--ink)",
                            color: "#ffffff",
                            borderRadius: "8px",
                            border: "none",
                            padding: "0.6rem 1.25rem",
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "opacity 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                        >
                          Simpan Informasi Pribadi
                        </button>

                        {isEditingProfile && isProfileSaved && (
                          <button
                            type="button"
                            onClick={handleCancelEditProfile}
                            style={{
                              minHeight: "44px",
                              background: "transparent",
                              color: "var(--ink)",
                              border: "1px solid var(--line)",
                              borderRadius: "8px",
                              padding: "0.6rem 1.25rem",
                              fontWeight: 600,
                              fontSize: "0.92rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "var(--paper)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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

                  {/* Bukti Portofolio & Sertifikasi Tambahan */}
                  <div style={{ marginTop: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <label style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)", margin: 0 }}>
                        Bukti Portofolio, Karya & Sertifikasi (Opsional)
                      </label>
                      {portfolioItems.length > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {portfolioItems.filter((p) => (p.attachmentMode === "file" ? p.fileName : p.url.trim().length > 0)).length} lampiran aktif
                        </span>
                      )}
                    </div>
                    <p className="hint" style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "0.8rem", lineHeight: 1.45 }}>
                      Lampirkan repositori kode proyek, live demo, desain, case study kampanye, berkas dokumen (docx, xlsx, pdf, jpg, png), atau sertifikat untuk membuktikan keahlian Anda.
                    </p>

                    {portfolioItems.length === 0 ? (
                      <div style={{ padding: "0.35rem 0" }}>
                        <button
                          type="button"
                          onClick={handleAddPortfolioItem}
                          className="button secondary"
                          style={{
                            fontSize: "0.85rem",
                            padding: "0.5rem 1rem",
                            minHeight: "38px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            fontWeight: 600,
                            border: "1.5px solid var(--ink)",
                            borderRadius: "6px",
                            background: "white",
                            color: "var(--ink)",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>+</span>
                          <span>Tambahkan Portofolio</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "0.85rem" }}>
                          {portfolioItems.map((item, idx) => {
                            const skillsToDisplay =
                              applyJob.requiredSkills && applyJob.requiredSkills.length > 0
                                ? applyJob.requiredSkills
                                : ["React", "Flutter", "Rust", "PHP", "MySQL", "PostgreSQL"];
                            return (
                              <div
                                key={item.id}
                                style={{
                                  border: "1.5px solid var(--line)",
                                  borderRadius: "8px",
                                  padding: "1rem",
                                  background: "#ffffff",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.75rem",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                                }}
                              >
                                {/* Top Row: #{idx + 1}, Title input with editable placeholder, and Delete button */}
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      color: "var(--muted)",
                                      background: "#f1f5f9",
                                      padding: "0.25rem 0.5rem",
                                      borderRadius: "4px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={`Portofolio #${idx + 1}`}
                                    value={item.title}
                                    onChange={(e) =>
                                      handleUpdatePortfolioItem(item.id, "title", e.target.value)
                                    }
                                    style={{
                                      flex: 1,
                                      fontSize: "0.85rem",
                                      fontWeight: 600,
                                      padding: "0.4rem 0.65rem",
                                      borderRadius: "6px",
                                      border: "1px solid var(--line)",
                                      background: "white",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePortfolioItem(item.id)}
                                    title="Hapus portofolio ini"
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: "#94a3b8",
                                      cursor: "pointer",
                                      padding: "0.25rem 0.5rem",
                                      fontSize: "1.15rem",
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Kotak Unggah File */}
                                {item.fileName ? (
                                  <div
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverPortfolioId(item.id);
                                    }}
                                    onDragEnter={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverPortfolioId(item.id);
                                    }}
                                    onDragLeave={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverPortfolioId(null);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverPortfolioId(null);
                                      const file = e.dataTransfer.files?.[0] || null;
                                      handlePortfolioFileChange(item.id, file);
                                    }}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      background: dragOverPortfolioId === item.id ? "#f0f9ff" : "#f8fafc",
                                      padding: "0.75rem 1rem",
                                      borderRadius: "8px",
                                      border: dragOverPortfolioId === item.id ? "2px dashed #0284c7" : "1px solid #cbd5e1",
                                      gap: "0.5rem",
                                      flexWrap: "wrap",
                                      transition: "all 0.15s ease",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                                      <span
                                        style={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                          padding: "0.15rem 0.45rem",
                                          background: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          borderRadius: "4px",
                                          color: "#166534",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        {item.fileName.split(".").pop() || "BERKAS"}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "0.84rem",
                                          fontWeight: 600,
                                          color: "var(--ink)",
                                          textOverflow: "ellipsis",
                                          overflow: "hidden",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {item.fileName}
                                      </span>
                                      {item.fileSize ? (
                                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                                          ({(item.fileSize / 1024).toFixed(0)} KB)
                                        </span>
                                      ) : null}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                                      <label
                                        htmlFor={`portfolio-file-${item.id}`}
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "#0284c7",
                                          cursor: "pointer",
                                          fontWeight: 600,
                                          textDecoration: "underline",
                                        }}
                                      >
                                        Ganti Berkas
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => handleClearPortfolioFile(item.id)}
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: "#dc2626",
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                    <input
                                      type="file"
                                      id={`portfolio-file-${item.id}`}
                                      accept=".docx,.xlsx,.pdf,.jpg,.jpeg,.png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/jpeg,image/png"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        handlePortfolioFileChange(item.id, file);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="file"
                                      id={`portfolio-file-${item.id}`}
                                      accept=".docx,.xlsx,.pdf,.jpg,.jpeg,.png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/jpeg,image/png"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        handlePortfolioFileChange(item.id, file);
                                      }}
                                    />
                                    <label
                                      htmlFor={`portfolio-file-${item.id}`}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverPortfolioId(item.id);
                                      }}
                                      onDragEnter={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverPortfolioId(item.id);
                                      }}
                                      onDragLeave={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverPortfolioId(null);
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverPortfolioId(null);
                                        const file = e.dataTransfer.files?.[0] || null;
                                        handlePortfolioFileChange(item.id, file);
                                      }}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: dragOverPortfolioId === item.id ? "2px dashed #0284c7" : "1.5px solid #cbd5e1",
                                        borderRadius: "8px",
                                        padding: "1.4rem 1rem",
                                        background: dragOverPortfolioId === item.id ? "#f0f9ff" : "#fafafa",
                                        cursor: "pointer",
                                        textAlign: "center",
                                        transition: "border-color 0.15s ease, background 0.15s ease",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          fontSize: "0.95rem",
                                          color: dragOverPortfolioId === item.id ? "#0284c7" : "var(--ink)",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        {dragOverPortfolioId === item.id ? "Lepaskan file di sini..." : "Unggah File"}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "0.78rem",
                                          color: dragOverPortfolioId === item.id ? "#0369a1" : "var(--muted)",
                                        }}
                                      >
                                        Docx, Xlsx, PDF, JPG, PNG
                                      </div>
                                    </label>
                                  </div>
                                )}

                                {/* Teks Atau */}
                                <div
                                  style={{
                                    textAlign: "center",
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                    color: "var(--muted)",
                                    padding: "0.15rem 0",
                                  }}
                                >
                                  Atau
                                </div>

                                {/* Input Tautan URL Portofolio */}
                                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                  <input
                                    type="url"
                                    placeholder="Tautan URL Portofolio"
                                    value={item.url}
                                    onChange={(e) =>
                                      handleUpdatePortfolioItem(item.id, "url", e.target.value)
                                    }
                                    style={{
                                      flex: 1,
                                      fontSize: "0.85rem",
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "1.5px solid #cbd5e1",
                                      background: "white",
                                    }}
                                  />
                                  <select
                                    aria-label="Kategori Portofolio"
                                    value={item.type}
                                    onChange={(e) =>
                                      handleUpdatePortfolioItem(
                                        item.id,
                                        "type",
                                        e.target.value as PortfolioItemType,
                                      )
                                    }
                                    style={{
                                      fontSize: "0.78rem",
                                      padding: "0.5rem 0.5rem",
                                      borderRadius: "6px",
                                      border: "1.5px solid #cbd5e1",
                                      background: "#f8fafc",
                                      color: "var(--ink)",
                                      maxWidth: "145px",
                                    }}
                                  >
                                    {PORTFOLIO_TYPE_OPTIONS.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Garis Pembatas Dotted & Centang Keahlian */}
                                <div
                                  style={{
                                    marginTop: "0.25rem",
                                    paddingTop: "0.75rem",
                                    borderTop: "1px dashed #cbd5e1",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.76rem",
                                      color: "var(--muted)",
                                      display: "block",
                                      marginBottom: "0.5rem",
                                    }}
                                  >
                                    Centang keahlian lowongan yang dibuktikan oleh karya/sertifikat ini:
                                  </span>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                    {skillsToDisplay.map((skill) => {
                                      const isTagged = item.verifiedSkills.includes(skill);
                                      return (
                                        <button
                                          key={skill}
                                          type="button"
                                          onClick={() =>
                                            handleTogglePortfolioSkill(item.id, skill)
                                          }
                                          style={{
                                            fontSize: "0.76rem",
                                            padding: "0.28rem 0.65rem",
                                            borderRadius: "6px",
                                            border: isTagged
                                              ? "1px solid #0284c7"
                                              : "1px solid #cbd5e1",
                                            background: isTagged ? "#f0f9ff" : "white",
                                            color: isTagged ? "#0284c7" : "var(--ink)",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
                                            fontWeight: isTagged ? 600 : 400,
                                            transition: "all 0.15s ease",
                                          }}
                                        >
                                          <span>{isTagged ? "✓" : "+"}</span>
                                          <span>{skill}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddPortfolioItem}
                          className="button secondary"
                          style={{
                            fontSize: "0.85rem",
                            padding: "0.45rem 1rem",
                            minHeight: "38px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            fontWeight: 600,
                            border: "1.5px solid var(--ink)",
                            borderRadius: "6px",
                            background: "white",
                            color: "var(--ink)",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>+</span>
                          <span>Tambahkan Portofolio</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Headline [Surat lamaran] */}
                <div id="cover-letter-section" style={{ marginTop: "1.75rem", marginBottom: "1.25rem" }}>
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

                  {coverLetterError && (
                    <div
                      role="alert"
                      id="cover-letter-error-banner"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.65rem 0.85rem",
                        background: "#fef2f2",
                        border: "1.5px solid #ef4444",
                        borderRadius: "6px",
                        color: "#b91c1c",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        marginBottom: "0.85rem",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{coverLetterError}</span>
                    </div>
                  )}

                  {/* Radio 1: Unggah surat lamaran */}
                  <div
                    id="cover-letter-upload-radio"
                    style={{
                      border:
                        coverLetterMode === "upload"
                          ? coverLetterError && !coverLetterFileName
                            ? "2px solid #ef4444"
                            : "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      background:
                        coverLetterMode === "upload"
                          ? coverLetterError && !coverLetterFileName
                            ? "#fff5f5"
                            : "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease, background 0.15s ease",
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
                        onChange={() => {
                          setCoverLetterMode("upload");
                          setCoverLetterError("");
                        }}
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
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>Unggah Berkas</span>
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

                            {coverLetterError && !coverLetterFileName && (
                              <p
                                style={{
                                  margin: "0.45rem 0 0",
                                  fontSize: "0.82rem",
                                  color: "#dc2626",
                                  fontWeight: 600,
                                }}
                              >
                                Harap unggah berkas surat lamaran Anda terlebih dahulu.
                              </p>
                            )}

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
                                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ color: "var(--ink)" }}>
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
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
                                  onClick={() => {
                                    setCoverLetterFileName("");
                                    setCoverLetterError("");
                                  }}
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
                    id="cover-letter-write-radio"
                    style={{
                      border:
                        coverLetterMode === "write"
                          ? coverLetterError && !coverLetter.trim()
                            ? "2px solid #ef4444"
                            : "1.5px solid var(--ink)"
                          : "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      background:
                        coverLetterMode === "write"
                          ? coverLetterError && !coverLetter.trim()
                            ? "#fff5f5"
                            : "rgba(255, 255, 255, 0.95)"
                          : "white",
                      transition: "border-color 0.15s ease, background 0.15s ease",
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
                        onChange={() => {
                          setCoverLetterMode("write");
                          setCoverLetterError("");
                        }}
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
                              ref={coverLetterTextareaRef}
                              id="applicant-cover-letter"
                              rows={5}
                              placeholder="Tuliskan surat lamaran Anda di sini..."
                              value={coverLetter}
                              onChange={(e) => {
                                setCoverLetter(e.target.value);
                                if (coverLetterError) setCoverLetterError("");
                              }}
                              style={{
                                width: "100%",
                                borderColor: coverLetterError && !coverLetter.trim() ? "#ef4444" : undefined,
                              }}
                            />
                            {coverLetterError && !coverLetter.trim() && (
                              <p
                                style={{
                                  margin: "0.4rem 0 0",
                                  fontSize: "0.82rem",
                                  color: "#dc2626",
                                  fontWeight: 600,
                                }}
                              >
                                Harap tuliskan surat lamaran Anda terlebih dahulu.
                              </p>
                            )}
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
                        onChange={() => {
                          setCoverLetterMode("none");
                          setCoverLetterError("");
                        }}
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
                    {isSubmitting ? "Mengirimkan Lamaran..." : "Kirim Lamaran Pekerjaan"}
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
