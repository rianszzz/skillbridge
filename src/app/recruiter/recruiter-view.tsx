"use client";

import Link from "next/link";
import { useEffect, useState, useId } from "react";
import { authHeaders, getSupabase } from "@/lib/auth-client";
import { setupJobRealtimeSync, broadcastJobSync } from "@/lib/realtime-jobs";
import {
  getDeletedJobIds,
  markJobAsDeleted,
  filterOutDeletedJobs,
} from "@/lib/job-tombstone";
import type {
  TalentCandidate,
  JobPosting,
  JobApplication,
  PortfolioItem,
  Field,
  MinEducation,
  EmploymentType,
  WorkplaceType,
  ExperienceLevel,
  CompensationType,
  JobStatus,
  ApplicationStatus,
} from "@/lib/types";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "candidate" }
  | { status: "recruiter"; user: { id: string; email?: string; companyName?: string } };


const FIELD_FILTERS = [
  { value: "all", label: "Semua Bidang" },
  { value: "informatics", label: "Informatika" },
  { value: "design", label: "DKV" },
  { value: "marketing", label: "Pemasaran" },
] as const;

const SCORE_FILTERS = [
  { value: 0, label: "Semua Skor" },
  { value: 75, label: "Siap Kerja (≥ 75)" },
  { value: 50, label: "Menengah (≥ 50)" },
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

function getWhatsAppUrl(phone?: string, candidateName?: string, jobTitle?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  const international = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const text = encodeURIComponent(
    `Halo ${candidateName || "Kandidat"},\n\nKami dari tim HR Skillbridge ingin mengonfirmasi dan mendiskusikan lamaran Anda untuk posisi "${jobTitle || "lowongan kerja"}".\n\nApakah Anda ada waktu luang untuk berdiskusi lebih lanjut?`,
  );
  return `https://wa.me/${international}?text=${text}`;
}

function downloadCandidateResume(app: {
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  location?: string;
  resumeFileName?: string;
  resumeUrl?: string;
}) {
  if (app.resumeUrl) {
    window.open(app.resumeUrl, "_blank");
    return;
  }
  const content = [
    "==================================================",
    "CURRICULUM VITAE / RESUMÉ PELAMAR",
    "Skillbridge Talent Bridge Network",
    "==================================================",
    `Nama Lengkap : ${app.candidateName}`,
    `Alamat Email : ${app.candidateEmail}`,
    `Nomor Telepon: ${app.phone || "Tidak dicantumkan"}`,
    `Lokasi Domisili: ${app.location || "Tidak dicantumkan"}`,
    `Nama Berkas  : ${app.resumeFileName || "CV_Pelamar.pdf"}`,
    `Waktu Unduh  : ${new Date().toLocaleString("id-ID")}`,
    "==================================================",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    app.resumeFileName && app.resumeFileName.endsWith(".pdf")
      ? app.resumeFileName
      : `${app.resumeFileName || "CV_Pelamar"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Clean inline SVG Icons (Heroicons / Lucide style)
function IconMail({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconPhone({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMapPin({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconFileText({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function IconCheck({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconX({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconExternalLink({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function IconMessageCircle({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function IconDownload({ width = 14, height = 14, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function IconEye({ width = 14, height = 14, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSparkles({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function IconBriefcase({ width = 16, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconClipboard({ width = 24, height = 24, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function getCandidateInitials(name: string): string {
  if (!name) return "KD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPortfolioTypeLabel(
  type?: string,
  attachmentMode?: string,
  fileName?: string
): { label: string; color: string; bg: string; border: string } {
  if (attachmentMode === "file" || (!type && fileName)) {
    const ext = fileName ? fileName.split(".").pop()?.toUpperCase() : "";
    const label = ext ? `Berkas ${ext}` : "Berkas File";
    return { label, color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" };
  }
  switch (type) {
    case "file":
      return { label: "Berkas File", color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" };
    case "github_repo":
      return { label: "GitHub Repo", color: "#1e293b", bg: "#f1f5f9", border: "#cbd5e1" };
    case "github_profile":
      return { label: "GitHub Profil", color: "#1e293b", bg: "#f1f5f9", border: "#cbd5e1" };
    case "live_demo":
      return { label: "Live Demo Web", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" };
    case "design":
      return { label: "Portofolio Desain", color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff" };
    case "figma":
      return { label: "Figma Prototype", color: "#c026d3", bg: "#fdf4ff", border: "#f5d0fe" };
    case "case_study":
      return { label: "Case Study & Metrik", color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
    case "certificate":
      return { label: "Sertifikasi", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" };
    default:
      return { label: "Tautan Karya", color: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
  }
}

function FilePreviewModal({
  item,
  candidateName,
  onClose,
}: {
  item: PortfolioItem;
  candidateName?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const fileSource = item.fileData || item.url || "";
  const rawFileName = item.fileName || item.title || "berkas-portofolio";
  const hasFile =
    Boolean(item.fileName) ||
    Boolean(item.fileData) ||
    item.attachmentMode === "file" ||
    item.attachmentMode === "both";
  const hasUrl = Boolean(item.url && !item.url.startsWith("data:"));
  const safeExternalUrl = hasUrl
    ? item.url!.startsWith("http")
      ? item.url!
      : `https://${item.url}`
    : null;

  const badge = getPortfolioTypeLabel(item.type, item.attachmentMode, item.fileName);
  const formattedSize = item.fileSize ? `${(item.fileSize / 1024).toFixed(0)} KB` : null;

  const fileKind = (() => {
    const ft = (item.fileType || "").toLowerCase();
    const fn = (item.fileName || item.title || "").toLowerCase();
    const url = (item.url || "").toLowerCase();
    const fd = (item.fileData || "").toLowerCase();

    if (
      ft.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(fn) ||
      /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(url) ||
      fd.startsWith("data:image/")
    ) {
      return "image" as const;
    }

    if (
      ft === "application/pdf" ||
      fn.endsWith(".pdf") ||
      url.endsWith(".pdf") ||
      fd.startsWith("data:application/pdf")
    ) {
      return "pdf" as const;
    }

    return "other" as const;
  })();

  const downloadFileName = (() => {
    let name = rawFileName.replace(/[/\\?%*:|"<>]/g, "-").trim();
    if (!name) name = "berkas-portofolio";
    const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(name);
    if (!hasExt) {
      if (fileKind === "image") {
        const sub = item.fileType?.split("/")[1] || "png";
        name += `.${sub === "jpeg" ? "jpg" : sub}`;
      } else if (fileKind === "pdf") {
        name += ".pdf";
      }
    }
    return name;
  })();

  const extension =
    (item.fileName ? item.fileName.split(".").pop() : "")?.toUpperCase() ||
    (item.fileType ? item.fileType.split("/").pop()?.toUpperCase() : "") ||
    (fileKind === "pdf" ? "PDF" : fileKind === "image" ? "GAMBAR" : "DOKUMEN");

  const handleDownload = () => {
    if (!fileSource) return;
    if (fileSource.startsWith("data:") || fileSource.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = fileSource;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    fetch(fileSource, { mode: "cors" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengunduh");
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      })
      .catch(() => {
        const a = document.createElement("a");
        a.href = fileSource;
        a.download = downloadFileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(0.75rem, 3vw, 1.5rem)",
        overflowY: "auto",
      }}
    >
      <div
        className="panel"
        style={{
          maxWidth: "880px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "10px",
          overflow: "hidden",
          padding: 0,
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--line)",
          position: "relative",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--line)",
            background: "#ffffff",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  color: badge.color,
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
              {formattedSize && (
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}>
                  ({formattedSize})
                </span>
              )}
              {candidateName && (
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  • Pelamar: <strong style={{ color: "var(--ink)" }}>{candidateName}</strong>
                </span>
              )}
            </div>
            <h3
              id="preview-modal-title"
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--ink)",
                wordBreak: "break-word",
              }}
            >
              {rawFileName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau berkas"
            style={{
              background: "none",
              border: "none",
              padding: "0.35rem",
              borderRadius: "4px",
              cursor: "pointer",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            <IconX width={20} height={20} />
          </button>
        </div>

        {/* Konten Pratinjau */}
        <div
          style={{
            padding: "1.25rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            background: "#f8fafc",
            minHeight: "280px",
            justifyContent: "center",
          }}
        >
          {fileKind === "image" && fileSource ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "1rem",
                overflow: "auto",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileSource}
                alt={rawFileName}
                style={{
                  maxWidth: "100%",
                  maxHeight: "500px",
                  objectFit: "contain",
                  borderRadius: "6px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                }}
              />
            </div>
          ) : fileKind === "pdf" && fileSource ? (
            <div
              style={{
                width: "100%",
                height: "550px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <object
                data={fileSource}
                type="application/pdf"
                style={{ width: "100%", height: "100%", border: "none" }}
              >
                <iframe
                  src={fileSource}
                  title={rawFileName}
                  style={{ width: "100%", height: "100%", border: "none" }}
                >
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                    Peramban tidak dapat memuat pratinjau PDF langsung. Silakan unduh berkas di bawah.
                  </div>
                </iframe>
              </object>
            </div>
          ) : !hasFile && safeExternalUrl ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                border: "1px dashed var(--line)",
                borderRadius: "8px",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                gap: "0.85rem",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "12px",
                  background: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0369a1",
                }}
              >
                <IconExternalLink width={34} height={34} />
              </div>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", wordBreak: "break-all" }}>
                  {rawFileName}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#0284c7", marginTop: "0.25rem", wordBreak: "break-all" }}>
                  {safeExternalUrl}
                </div>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--muted)", maxWidth: "450px", margin: 0, lineHeight: 1.5 }}>
                Portofolio ini berupa tautan situs web atau repositori eksternal. Anda dapat meninjau karya atau proyek kandidat secara langsung di peramban web.
              </p>
              <a
                href={safeExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  marginTop: "0.5rem",
                  textDecoration: "none",
                  color: "#ffffff",
                }}
              >
                <span>Buka Tautan Asli</span>
                <IconExternalLink width={14} height={14} />
              </a>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                border: "1px dashed var(--line)",
                borderRadius: "8px",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                gap: "0.85rem",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                }}
              >
                <IconFileText width={36} height={36} />
              </div>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", wordBreak: "break-all" }}>
                  {rawFileName}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  Format Berkas: <strong>{extension}</strong> {formattedSize ? `• ${formattedSize}` : ""}
                </div>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--muted)", maxWidth: "450px", margin: 0, lineHeight: 1.5 }}>
                Pratinjau langsung tidak tersedia untuk format berkas ini ({extension}). Silakan unduh atau simpan berkas ke perangkat Anda untuk melihat isinya secara lengkap.
              </p>
              {hasFile && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="button primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    marginTop: "0.5rem",
                  }}
                >
                  <IconDownload width={14} height={14} />
                  <span>Unduh Berkas Sekarang</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer / Action Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.85rem 1.25rem",
            borderTop: "1px solid var(--line)",
            background: "#ffffff",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            {hasFile && (
              <a
                href={fileSource || "#"}
                download={downloadFileName}
                onClick={(e) => {
                  if (!fileSource.startsWith("data:") && !fileSource.startsWith("blob:")) {
                    e.preventDefault();
                    handleDownload();
                  }
                }}
                className="button primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "#ffffff",
                  padding: "0.45rem 1rem",
                }}
              >
                <IconDownload width={14} height={14} />
                <span>Unduh / Simpan Berkas</span>
              </a>
            )}
            {safeExternalUrl && (
              <a
                href={safeExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "0.45rem 1rem",
                }}
              >
                <span>Buka Tautan Asli</span>
                <IconExternalLink width={13} height={13} />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="button secondary"
            style={{
              fontSize: "0.84rem",
              fontWeight: 600,
              padding: "0.45rem 1rem",
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecruiterView() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<"talent-pool" | "my-jobs">("talent-pool");

  // Talent Pool State (Direktori Talenta Terverifikasi)
  const [selectedField, setSelectedField] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Recruiter Jobs State
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("skillbridge_recruiter_applications_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [previewModalItem, setPreviewModalItem] = useState<{
    isOpen: boolean;
    item: PortfolioItem;
    candidateName?: string;
  } | null>(null);

  // Lowongan & Pelamar State (ATS Pipeline)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<JobPosting | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | "all">("all");
  const [applicantFilterStatus, setApplicantFilterStatus] = useState<"all" | ApplicationStatus>("all");

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
  const descInputId = useId();
  const respInputId = useId();
  const skillsInputId = useId();
  const benefitsInputId = useId();

  // Create Job Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formField, setFormField] = useState<Field>("informatics");
  const [formTargetRole, setFormTargetRole] = useState("");
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
  const [formHighlights, setFormHighlights] = useState<string[]>([]);
  const [newFormHighlight, setNewFormHighlight] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formResponsibilities, setFormResponsibilities] = useState("");
  const [formRequiredSkills, setFormRequiredSkills] = useState("");
  const [formBenefits, setFormBenefits] = useState("");
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [jobSubmitError, setJobSubmitError] = useState("");
  const [jobSuccessMessage, setJobSuccessMessage] = useState("");

  // Edit Job State
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editField, setEditField] = useState<Field>("informatics");
  const [editTargetRole, setEditTargetRole] = useState("Junior Web Developer");
  const [editEmploymentType, setEditEmploymentType] = useState<EmploymentType>("fulltime");
  const [editWorkplaceType, setEditWorkplaceType] = useState<WorkplaceType>("hybrid");
  const [editLocation, setEditLocation] = useState("");
  const [editMinEdu, setEditMinEdu] = useState<MinEducation>("smk");
  const [editExpLevel, setEditExpLevel] = useState<ExperienceLevel>("fresh_graduate");
  const [editCompType, setEditCompType] = useState<CompensationType>("paid");
  const [editSalaryMin, setEditSalaryMin] = useState<string>("");
  const [editSalaryMax, setEditSalaryMax] = useState<string>("");
  const [editShowSalary, setEditShowSalary] = useState(true);
  const [editStatus, setEditStatus] = useState<JobStatus>("active");
  const [editMinScore, setEditMinScore] = useState<number>(60);
  const [editHighlights, setEditHighlights] = useState<string[]>([]);
  const [newEditHighlight, setNewEditHighlight] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editResponsibilities, setEditResponsibilities] = useState("");
  const [editRequiredSkills, setEditRequiredSkills] = useState("");
  const [editBenefits, setEditBenefits] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState("");

  // Delete Job State
  const [deletingJob, setDeletingJob] = useState<JobPosting | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Edit Form IDs
  const editTitleInputId = useId();
  const editCompanyInputId = useId();
  const editStatusSelectId = useId();
  const editFieldSelectId = useId();
  const editTargetRoleInputId = useId();
  const editEmploymentTypeSelectId = useId();
  const editWorkplaceTypeSelectId = useId();
  const editLocationInputId = useId();
  const editMinEduSelectId = useId();
  const editExpLevelSelectId = useId();
  const editCompTypeSelectId = useId();
  const editSalaryMinInputId = useId();
  const editSalaryMaxInputId = useId();
  const editMinScoreInputId = useId();
  const editDescInputId = useId();
  const editRespInputId = useId();
  const editSkillsInputId = useId();
  const editBenefitsInputId = useId();

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

  // Shared Refresh Trigger for Real-time Updates
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [authState.status, activeTab, selectedField, selectedScore, refreshTrigger]);

  // Fetch Recruiter Jobs & Applications
  useEffect(() => {
    if (authState.status !== "recruiter") return;
    let active = true;

    authHeaders()
      .then((headers) =>
        Promise.all([
          fetch("/api/jobs", { headers }).then((r) => (r.ok ? r.json() : [])),
          fetch("/api/jobs/applications", { headers }).then((r) => (r.ok ? r.json() : [])),
        ]),
      )
      .then(([jobsData, appsData]: [JobPosting[], JobApplication[]]) => {
        if (active) {
          setJobs(filterOutDeletedJobs(jobsData));
          setApplications((prev) => {
            const map = new Map<string, JobApplication>();
            for (const a of prev) map.set(a.id, a);
            for (const a of appsData) map.set(a.id, a);
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
            );
            try {
              localStorage.setItem("skillbridge_recruiter_applications_cache", JSON.stringify(merged));
            } catch {}
            return merged;
          });
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
  }, [authState.status, refreshTrigger]);

  // 3-Lapis Real-time Synchronization
  useEffect(() => {
    if (authState.status !== "recruiter") return;

    const unsubscribe = setupJobRealtimeSync({
      onJobCreated: (newJob) => {
        if (getDeletedJobIds().has(newJob.id)) return;
        setJobs((prev) => (prev.some((j) => j.id === newJob.id) ? prev : [newJob, ...prev]));
        setRefreshTrigger((p) => p + 1);
      },
      onJobUpdated: (updatedJob) => {
        setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
        setSelectedJobForApplicants((prev) => (prev?.id === updatedJob.id ? updatedJob : prev));
      },
      onJobDeleted: (deletedJobId) => {
        markJobAsDeleted(deletedJobId);
        setJobs((prev) => prev.filter((j) => j.id !== deletedJobId));
        setSelectedJobForApplicants((prev) => (prev?.id === deletedJobId ? null : prev));
      },
      onRefresh: () => {
        setJobs((prev) => filterOutDeletedJobs(prev));
        setRefreshTrigger((p) => p + 1);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [authState.status]);

  async function handleUpdateApplicationStatus(applicationId: string, newStatus: ApplicationStatus) {
    setApplications((prev) => {
      const updated = prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app));
      try {
        localStorage.setItem("skillbridge_recruiter_applications_cache", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCandidates((prev) =>
      prev.map((c) => (c.id === applicationId ? { ...c, status: newStatus } : c)),
    );

    try {
      const headers = await authHeaders();
      const res = await fetch("/api/jobs/applications", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ applicationId, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memperbarui status.");
      }
      broadcastJobSync({ type: "JOBS_REFRESH" });
    } catch (err) {
      console.error("Gagal update status lamaran:", err);
    }
  }

  function handleOpenEdit(job: JobPosting) {
    setEditingJob(job);
    setEditTitle(job.title || "");
    setEditCompany(job.companyName || (authState.status === "recruiter" ? authState.user.companyName || "" : ""));
    setEditField(job.field || "informatics");
    setEditTargetRole(job.targetRole || "Junior Web Developer");
    setEditEmploymentType(job.employmentType || "fulltime");
    setEditWorkplaceType(job.workplaceType || "hybrid");
    setEditLocation(job.location || "");
    setEditMinEdu(job.minEducation || "smk");
    setEditExpLevel(job.experienceLevel || "fresh_graduate");
    setEditCompType(job.compensationType || "paid");
    setEditSalaryMin(job.salaryMin !== null && job.salaryMin !== undefined ? String(job.salaryMin) : "");
    setEditSalaryMax(job.salaryMax !== null && job.salaryMax !== undefined ? String(job.salaryMax) : "");
    setEditShowSalary(job.showSalary ?? true);
    setEditStatus(job.status || "active");
    setEditMinScore(job.minSkillbridgeScore ?? 60);
    setEditHighlights(Array.isArray(job.highlights) ? [...job.highlights] : []);
    setNewEditHighlight("");
    setEditDesc(job.description || "");
    setEditResponsibilities(job.responsibilities?.join("\n") || "");
    setEditRequiredSkills(job.requiredSkills?.join(", ") || "");
    setEditBenefits(job.benefits?.join(", ") || "");
    setEditSubmitError("");
  }

  function resetCreateJobForm() {
    setFormTitle("");
    setFormCompany("");
    setFormField("informatics");
    setFormTargetRole("");
    setFormEmploymentType("fulltime");
    setFormWorkplaceType("hybrid");
    setFormLocation("Jakarta Selatan, DKI Jakarta");
    setFormMinEdu("smk");
    setFormExpLevel("fresh_graduate");
    setFormCompType("paid");
    setFormSalaryMin("5000000");
    setFormSalaryMax("7500000");
    setFormShowSalary(true);
    setFormMinScore(60);
    setFormHighlights([]);
    setNewFormHighlight("");
    setFormDesc("");
    setFormResponsibilities("");
    setFormRequiredSkills("");
    setFormBenefits("");
    setJobSubmitError("");
  }

  function openCreateJobModal() {
    resetCreateJobForm();
    setIsCreateModalOpen(true);
  }

  function addFormHighlight() {
    const trimmed = newFormHighlight.trim();
    if (!trimmed) return;
    setFormHighlights((prev) => [...prev, trimmed]);
    setNewFormHighlight("");
  }

  function updateFormHighlight(index: number, value: string) {
    setFormHighlights((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function removeFormHighlight(index: number) {
    setFormHighlights((prev) => prev.filter((_, i) => i !== index));
  }

  function addEditHighlight() {
    const trimmed = newEditHighlight.trim();
    if (!trimmed) return;
    setEditHighlights((prev) => [...prev, trimmed]);
    setNewEditHighlight("");
  }

  function updateEditHighlight(index: number, value: string) {
    setEditHighlights((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function removeEditHighlight(index: number) {
    setEditHighlights((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingJob || authState.status !== "recruiter") return;

    setIsSavingEdit(true);
    setEditSubmitError("");
    setJobSuccessMessage("");

    const originalJob = editingJob;

    try {
      const highlights = [
        ...editHighlights.map((h) => h.trim()),
        newEditHighlight.trim(),
      ].filter(Boolean);
      const responsibilities = editResponsibilities
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const requiredSkills = editRequiredSkills
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const benefits = editBenefits
        .split(/[,;\n]/)
        .map((b) => b.trim())
        .filter(Boolean);

      const minSal = editCompType === "paid" && editSalaryMin.trim() ? Number(editSalaryMin) : null;
      const maxSal = editCompType === "paid" && editSalaryMax.trim() ? Number(editSalaryMax) : null;

      if (minSal !== null && maxSal !== null && maxSal < minSal) {
        throw new Error("Gaji maksimum tidak boleh lebih kecil dari gaji minimum.");
      }

      const payload = {
        title: editTitle.trim(),
        companyName: editCompany.trim() || editingJob.companyName,
        field: editField,
        targetRole: editTargetRole.trim(),
        employmentType: editEmploymentType,
        workplaceType: editWorkplaceType,
        location: editLocation.trim(),
        minEducation: editMinEdu,
        experienceLevel: editExpLevel,
        compensationType: editCompType,
        salaryMin: minSal,
        salaryMax: maxSal,
        showSalary: editShowSalary,
        status: editStatus,
        highlights: highlights.length > 0 ? highlights : [editTitle.trim()],
        description: editDesc.trim(),
        responsibilities: responsibilities.length > 0 ? responsibilities : ["Melaksanakan tugas teknis dengan baik"],
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["Keahlian terkait"],
        benefits,
        minSkillbridgeScore: Number(editMinScore) || 0,
      };

      // Optimistic update di memori (0ms)
      const optimisticallyUpdatedJob: JobPosting = {
        ...editingJob,
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? optimisticallyUpdatedJob : j)));
      if (selectedJobForApplicants?.id === editingJob.id) {
        setSelectedJobForApplicants(optimisticallyUpdatedJob);
      }
      setJobSuccessMessage(`Perubahan lowongan "${payload.title}" berhasil disimpan!`);
      setEditingJob(null);

      const headers = await authHeaders();
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Rollback jika gagal
        setJobs((prev) => prev.map((j) => (j.id === originalJob.id ? originalJob : j)));
        if (selectedJobForApplicants?.id === originalJob.id) {
          setSelectedJobForApplicants(originalJob);
        }
        setJobSuccessMessage("");
        throw new Error(data.error || "Gagal memperbarui lowongan.");
      }

      const serverJob = data as JobPosting;
      setJobs((prev) => prev.map((j) => (j.id === serverJob.id ? serverJob : j)));
      if (selectedJobForApplicants?.id === serverJob.id) {
        setSelectedJobForApplicants(serverJob);
      }
      broadcastJobSync({ type: "JOB_UPDATED", job: serverJob });
    } catch (err) {
      setEditSubmitError(err instanceof Error ? err.message : "Gagal memperbarui lowongan.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingJob || authState.status !== "recruiter") return;

    const targetId = deletingJob.id;
    const targetTitle = deletingJob.title;
    const previousJobs = [...jobs];

    setIsDeletingJob(true);
    setDeleteError("");

    // Optimistic delete di memori (0ms) & tombstone client
    markJobAsDeleted(targetId);
    setJobs((prev) => prev.filter((j) => j.id !== targetId));
    if (selectedJobForApplicants?.id === targetId) {
      setSelectedJobForApplicants(null);
    }
    setDeletingJob(null);
    setJobSuccessMessage(`Lowongan "${targetTitle}" berhasil dihapus.`);

    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/jobs/${targetId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Rollback jika gagal
        setJobs(previousJobs);
        setJobSuccessMessage("");
        throw new Error(data.error || "Gagal menghapus lowongan.");
      }

      broadcastJobSync({ type: "JOB_DELETED", jobId: targetId });
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : "Gagal menghapus lowongan.");
    } finally {
      setIsDeletingJob(false);
    }
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (authState.status !== "recruiter") return;

    setIsSubmittingJob(true);
    setJobSubmitError("");
    setJobSuccessMessage("");

    try {
      const headers = await authHeaders();

      const highlights = [
        ...formHighlights.map((h) => h.trim()),
        newFormHighlight.trim(),
      ].filter(Boolean);
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

      const newJob = data as JobPosting;
      setJobs((prev) => [newJob, ...prev]);
      setJobSuccessMessage(`Lowongan "${payload.title}" berhasil dipublikasikan!`);
      resetCreateJobForm();
      setIsCreateModalOpen(false);
      broadcastJobSync({ type: "JOB_CREATED", job: newJob });
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

          {/* Kontrol Filter Talent Directory */}
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
                Saring Berdasarkan Bidang Keahlian
              </span>
              <div className="chips" role="tablist" aria-label="Filter Bidang Keahlian">
                {FIELD_FILTERS.map((f) => {
                  const active = selectedField === f.value;
                  return (
                    <button
                      key={f.value}
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
                        setSelectedField(f.value);
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
                Ambang Batas Skor Kesiapan Kerja Terverifikasi
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
              <p>Memuat direktori talenta terverifikasi Skillbridge...</p>
            </div>
          )}

          {/* Status Kosong */}
          {!loading && candidates.length === 0 && !error && (
            <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  margin: "0 auto 1rem",
                  background: "var(--paper)",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--ink)",
                }}
              >
                <IconClipboard width={26} height={26} />
              </div>
              <h2 style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>
                Tidak Ada Talenta yang Sesuai Filter
              </h2>
              <p className="hint" style={{ maxWidth: "520px", margin: "0.5rem auto 1.5rem" }}>
                Coba ubah pilihan bidang atau turunkan ambang batas skor kesiapan kerja untuk melihat talenta lainnya.
              </p>
              {(selectedField !== "all" || selectedScore > 0) && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setLoading(true);
                    setSelectedField("all");
                    setSelectedScore(0);
                  }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          )}

          {/* Daftar Kartu Direktori Talenta */}
          {!loading && candidates.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
                gap: "1.5rem",
                alignItems: "stretch",
              }}
            >
              {candidates.map((candidate) => {
                const company =
                  authState.status === "recruiter" && authState.user.companyName
                    ? authState.user.companyName
                    : "Perusahaan Kami";

                return (
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
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

                    <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.2rem", fontFamily: "var(--font-display)" }}>
                      {candidate.candidateName}
                    </h3>
                    <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                      {candidate.role} · {candidate.email}
                    </p>

                    {/* Skor Terverifikasi */}
                    <div
                      style={{
                        margin: "0.25rem 0 0.85rem",
                        padding: "0.75rem 0.9rem",
                        background: "var(--paper)",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontWeight: 700,
                          color: "var(--muted)",
                          marginBottom: "0.35rem",
                        }}
                      >
                        Skor Kesiapan Kerja Terverifikasi
                      </span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                        <span className="score" style={{ fontSize: "2.2rem", lineHeight: 1 }}>
                          {candidate.finalScore}
                        </span>
                        <span style={{ fontSize: "1rem", color: "var(--muted)", fontWeight: 700 }}>
                          /100
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            background:
                              candidate.finalScore >= 75
                                ? "#dcfce7"
                                : candidate.finalScore >= 50
                                  ? "#e0f2fe"
                                  : "#f3f4f6",
                            color:
                              candidate.finalScore >= 75
                                ? "#15803d"
                                : candidate.finalScore >= 50
                                  ? "#0369a1"
                                  : "#374151",
                          }}
                        >
                          {candidate.finalScore >= 75
                            ? "Siap Kerja"
                            : candidate.finalScore >= 50
                              ? "Menengah"
                              : "Berkembang"}
                        </span>
                      </div>
                    </div>

                    {/* Bukti Asesmen */}
                    <div style={{ marginBottom: "0.85rem", fontSize: "0.82rem", color: "var(--ink)" }}>
                      <span style={{ color: "var(--muted)" }}>Bukti Nyata: </span>
                      <strong>{getEvidenceLabel(candidate.evidenceType, candidate.sourceUrl)}</strong>
                    </div>

                    {/* Kekuatan Terverifikasi */}
                    {candidate.strengths && candidate.strengths.length > 0 && (
                      <div style={{ marginBottom: "1rem", borderTop: "1px dashed var(--line)", paddingTop: "0.75rem" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--muted)",
                            marginBottom: "0.35rem",
                          }}
                        >
                          Kekuatan Terverifikasi:
                        </span>
                        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.82rem", color: "var(--ink)", lineHeight: 1.5 }}>
                          {candidate.strengths.slice(0, 3).map((st, idx) => (
                            <li key={idx}>{st}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tombol Aksi */}
                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--line)",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {candidate.assessmentId ? (
                        <Link
                          className="button secondary"
                          href={`/results/${candidate.assessmentId}`}
                          style={{
                            flex: "1 1 140px",
                            textAlign: "center",
                            fontSize: "0.85rem",
                            minHeight: "38px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <IconExternalLink width={13} height={13} />
                          <span>Lihat Asesmen</span>
                        </Link>
                      ) : candidate.sourceUrl ? (
                        <a
                          className="button secondary"
                          href={candidate.sourceUrl.startsWith("http") ? candidate.sourceUrl : `https://${candidate.sourceUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: "1 1 140px",
                            textAlign: "center",
                            fontSize: "0.85rem",
                            minHeight: "38px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <IconExternalLink width={13} height={13} />
                          <span>Portofolio</span>
                        </a>
                      ) : null}

                      <a
                        className="button"
                        href={`mailto:${candidate.email}?subject=${encodeURIComponent(
                          `Skillbridge AI: Undangan Menjadi Kandidat di ${company}`,
                        )}&body=${encodeURIComponent(
                          `Halo ${candidate.candidateName},\n\nKami telah meninjau profil dan portofolio terverifikasi Anda di Skillbridge untuk bidang ${candidate.role} dengan skor kesiapan kerja ${candidate.finalScore}/100.\n\nKami sangat terkesan dengan bukti karya Anda dan ingin mengundang Anda untuk berdiskusi terkait peluang lowongan kerja di ${company}.\n\nSalam hangat,\nTim HR ${company}`,
                        )}`}
                        style={{
                          flex: "1 1 140px",
                          textAlign: "center",
                          fontSize: "0.85rem",
                          minHeight: "38px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <IconMail width={14} height={14} />
                        <span>Undang Melamar</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KELOLA LOWONGAN SAYA */}
      {/* ========================================================= */}
      {activeTab === "my-jobs" && (
        <div>
          {selectedJobForApplicants ? (
            <div>
              {/* Header Navigasi & Konteks Lowongan */}
              <div style={{ marginBottom: "1.5rem" }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{
                    marginBottom: "1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.85rem",
                    minHeight: "36px",
                    padding: "0 0.85rem",
                  }}
                  onClick={() => {
                    setSelectedJobForApplicants(null);
                    setSelectedApplicantId("all");
                  }}
                >
                  <span>← Kembali ke Daftar Lowongan</span>
                </button>

                <div
                  className="panel"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1.25rem",
                    flexWrap: "wrap",
                    padding: "1.25rem 1.5rem",
                    background: "white",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        className="chip"
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          background: getFieldBg(selectedJobForApplicants.field),
                        }}
                      >
                        {getFieldLabel(selectedJobForApplicants.field)}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: selectedJobForApplicants.status === "closed" ? "#b91c1c" : "#15803d",
                          background: selectedJobForApplicants.status === "closed" ? "#fee2e2" : "#e6f4ea",
                          border: `1px solid ${selectedJobForApplicants.status === "closed" ? "#fca5a5" : "#ceead6"}`,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        {selectedJobForApplicants.status === "closed" ? "Tutup" : "Aktif"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--ink)",
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        Syarat Skor Minimal: ≥ {selectedJobForApplicants.minSkillbridgeScore}/100
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.45rem", margin: "0 0 0.2rem", fontFamily: "var(--font-display)" }}>
                      {selectedJobForApplicants.title}
                    </h2>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
                      {selectedJobForApplicants.companyName} · {selectedJobForApplicants.location}
                    </p>
                  </div>

                  {(() => {
                    const jobApps = applications.filter((a) => a.jobId === selectedJobForApplicants.id);
                    return (
                      <div
                        style={{
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          padding: "0.5rem 1.25rem",
                          textAlign: "right",
                          borderRadius: "6px",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block" }}>
                          Total Pelamar Masuk
                        </span>
                        <strong style={{ fontSize: "1.3rem", color: "var(--ink)" }}>
                          {jobApps.length} Kandidat
                        </strong>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Master-Detail ATS View */}
              {(() => {
                const currentJobApps = applications.filter((a) => a.jobId === selectedJobForApplicants.id);
                if (currentJobApps.length === 0) {
                  return (
                    <div className="panel" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          margin: "0 auto 1rem",
                          background: "var(--paper)",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--ink)",
                        }}
                      >
                        <IconClipboard width={26} height={26} />
                      </div>
                      <h3 style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>
                        Belum Ada Pelamar Masuk
                      </h3>
                      <p className="hint" style={{ maxWidth: "520px", margin: "0.5rem auto 1.5rem" }}>
                        Kandidat yang mengajukan lamaran untuk lowongan <strong>{selectedJobForApplicants.title}</strong> akan otomatis dievaluasi oleh AI dan tampil di halaman peninjau ini.
                      </p>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setSelectedJobForApplicants(null);
                          setSelectedApplicantId("all");
                        }}
                      >
                        ← Kembali ke Daftar Lowongan
                      </button>
                    </div>
                  );
                }

                const pendingCount = currentJobApps.filter((a) => a.status === "pending").length;
                const reviewedCount = currentJobApps.filter((a) => a.status === "reviewed").length;
                const shortlistedCount = currentJobApps.filter((a) => a.status === "shortlisted").length;
                const acceptedCount = currentJobApps.filter((a) => a.status === "accepted").length;
                const rejectedCount = currentJobApps.filter((a) => a.status === "rejected").length;

                const filteredApps =
                  applicantFilterStatus === "all"
                    ? currentJobApps
                    : currentJobApps.filter((a) => a.status === applicantFilterStatus);

                const activeApp =
                  (selectedApplicantId !== "all" && currentJobApps.find((a) => a.id === selectedApplicantId)) ||
                  currentJobApps[0];

                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                      gap: "1.5rem",
                      alignItems: "start",
                    }}
                  >
                    {/* KOLOM KIRI: MASTER LIST PELAMAR */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {/* Filter Status Chips */}
                      <div className="panel" style={{ padding: "1rem", background: "white" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            fontWeight: 700,
                            color: "var(--muted)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Filter Status Pelamar
                        </span>
                        <div className="chips" role="tablist" aria-label="Filter Status Pelamar">
                          {[
                            { id: "all", label: `Semua (${currentJobApps.length})` },
                            { id: "pending", label: `Terkirim (${pendingCount})` },
                            { id: "reviewed", label: `Ditinjau (${reviewedCount})` },
                            { id: "shortlisted", label: `Wawancara (${shortlistedCount})` },
                            { id: "accepted", label: `Diterima (${acceptedCount})` },
                            { id: "rejected", label: `Ditolak (${rejectedCount})` },
                          ].map((tab) => {
                            const active = applicantFilterStatus === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                className="chip"
                                style={{
                                  background: active ? "var(--chalk)" : "white",
                                  borderColor: active ? "var(--ink)" : "var(--line)",
                                  fontWeight: active ? 700 : 500,
                                  fontSize: "0.78rem",
                                  padding: "0.25rem 0.6rem",
                                  cursor: "pointer",
                                }}
                                onClick={() => setApplicantFilterStatus(tab.id as "all" | ApplicationStatus)}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* List Pelamar Cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {filteredApps.length === 0 ? (
                          <div className="panel" style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>
                            Tidak ada pelamar dengan status ini.
                          </div>
                        ) : (
                          filteredApps.map((app) => {
                            const isSelected = activeApp.id === app.id;
                            const badge = getApplicationBadge(app.status);
                            const score = app.fitEvaluation?.score ?? app.skillbridgeScore;
                            const isPass =
                              typeof score === "number" && score >= selectedJobForApplicants.minSkillbridgeScore;

                            return (
                              <div
                                key={app.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedApplicantId(app.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") setSelectedApplicantId(app.id);
                                }}
                                style={{
                                  padding: "0.85rem 1rem",
                                  background: isSelected ? "#f8fafc" : "white",
                                  border: isSelected ? "2px solid var(--ink)" : "1px solid var(--line)",
                                  borderLeft: isSelected ? "4px solid var(--ink)" : "1px solid var(--line)",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  textAlign: "left",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.4rem" }}>
                                  <div
                                    style={{
                                      width: "34px",
                                      height: "34px",
                                      borderRadius: "50%",
                                      background: isSelected ? "var(--ink)" : "#e2e8f0",
                                      color: isSelected ? "white" : "var(--ink)",
                                      display: "grid",
                                      placeItems: "center",
                                      fontWeight: 700,
                                      fontSize: "0.8rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getCandidateInitials(app.candidateName)}
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {app.candidateName}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                      {new Date(app.appliedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      padding: "0.15rem 0.45rem",
                                      borderRadius: "4px",
                                      background: badge.bg,
                                      color: badge.color,
                                      border: "1px solid var(--line)",
                                    }}
                                  >
                                    {badge.label}
                                  </span>
                                  {score !== null && score !== undefined ? (
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        color: isPass ? "#15803d" : "#b91c1c",
                                      }}
                                    >
                                      {score}/100 {isPass ? "✓" : ""}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>—/100</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* KOLOM KANAN: CANDIDATE REVIEWER PANEL (DETAIL) */}
                    <div
                      className="panel"
                      style={{
                        background: "white",
                        border: "1px solid var(--line)",
                        padding: "clamp(1.25rem, 3vw, 2rem)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      {/* Candidate Header & Unified Score */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "1rem",
                          flexWrap: "wrap",
                          paddingBottom: "1.25rem",
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                          <div
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "50%",
                              background: "var(--ink)",
                              color: "white",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 700,
                              fontSize: "1.1rem",
                              flexShrink: 0,
                            }}
                          >
                            {getCandidateInitials(activeApp.candidateName)}
                          </div>
                          <div>
                            <h3 style={{ fontSize: "1.4rem", margin: "0 0 0.2rem", fontFamily: "var(--font-display)" }}>
                              {activeApp.candidateName}
                            </h3>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                              Melamar pada {new Date(activeApp.appliedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB
                            </p>
                          </div>
                        </div>

                        {/* Unified Score Indicator */}
                        {(() => {
                          const activeScore = activeApp.fitEvaluation?.score ?? activeApp.skillbridgeScore;
                          const minScore = selectedJobForApplicants.minSkillbridgeScore;
                          const isPass = typeof activeScore === "number" && activeScore >= minScore;
                          return (
                            <div
                              style={{
                                background: isPass ? "#f0fdf4" : "#fef2f2",
                                border: `1px solid ${isPass ? "#86efac" : "#fecaca"}`,
                                borderRadius: "8px",
                                padding: "0.65rem 1.1rem",
                                textAlign: "right",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: isPass ? "#166534" : "#991b1b", display: "block" }}>
                                Skor Kecocokan AI
                              </span>
                              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: isPass ? "#15803d" : "#b91c1c", lineHeight: 1.1, margin: "0.15rem 0" }}>
                                {activeScore !== null && activeScore !== undefined ? `${activeScore}/100` : "—/100"}
                              </div>
                              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isPass ? "#15803d" : "#b91c1c" }}>
                                {isPass ? `Memenuhi Syarat (≥ ${minScore})` : `Di Bawah Syarat (≥ ${minScore})`}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Interactive 4-Step Pipeline Stepper */}
                      <div style={{ padding: "0.9rem 1rem", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem", flexWrap: "wrap", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                            Tahapan Seleksi Pelamar (1-Klik untuk Perbarui Status)
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                            Status: <strong style={{ color: "var(--ink)" }}>{getApplicationBadge(activeApp.status).label}</strong>
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                          {[
                            { status: "pending" as ApplicationStatus, label: "1. Terkirim" },
                            { status: "reviewed" as ApplicationStatus, label: "2. Sedang Ditinjau" },
                            { status: "shortlisted" as ApplicationStatus, label: "3. Siap Wawancara" },
                            { status: "accepted" as ApplicationStatus, label: "4. Diterima Bekerja" },
                          ].map((step) => {
                            const isActive = activeApp.status === step.status;
                            return (
                              <button
                                key={step.status}
                                type="button"
                                onClick={() => handleUpdateApplicationStatus(activeApp.id, step.status)}
                                style={{
                                  flex: "1 1 auto",
                                  padding: "0.45rem 0.65rem",
                                  borderRadius: "6px",
                                  border: isActive ? "2px solid var(--ink)" : "1px solid var(--line)",
                                  background: isActive ? "var(--ink)" : "white",
                                  color: isActive ? "white" : "var(--ink)",
                                  fontWeight: isActive ? 700 : 500,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.3rem",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {isActive && <IconCheck width={12} height={12} />}
                                <span>{step.label}</span>
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => handleUpdateApplicationStatus(activeApp.id, "rejected")}
                            style={{
                              padding: "0.45rem 0.75rem",
                              borderRadius: "6px",
                              border: activeApp.status === "rejected" ? "2px solid #b91c1c" : "1px solid #fca5a5",
                              background: activeApp.status === "rejected" ? "#b91c1c" : "#fef2f2",
                              color: activeApp.status === "rejected" ? "white" : "#991b1b",
                              fontWeight: activeApp.status === "rejected" ? 700 : 500,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.3rem",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <IconX width={12} height={12} />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>

                      {/* 2x2 Contact Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "0.75rem",
                        }}
                      >
                        {/* Email */}
                        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.75rem 0.9rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                            <IconMail width={13} height={13} />
                            <span>Alamat Email</span>
                          </div>
                          <a href={`mailto:${activeApp.candidateEmail}`} style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink)", wordBreak: "break-all" }}>
                            {activeApp.candidateEmail}
                          </a>
                        </div>

                        {/* Phone + WA */}
                        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.75rem 0.9rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                            <IconPhone width={13} height={13} />
                            <span>Nomor Telepon</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink)" }}>
                              {activeApp.phone || "Tidak dicantumkan"}
                            </span>
                            {(() => {
                              const waUrl = getWhatsAppUrl(activeApp.phone, activeApp.candidateName, selectedJobForApplicants.title);
                              if (!waUrl) return null;
                              return (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    padding: "0.15rem 0.4rem",
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    border: "1px solid #86efac",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                >
                                  <IconMessageCircle width={11} height={11} />
                                  <span>Chat WA</span>
                                </a>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Domisili */}
                        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.75rem 0.9rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                            <IconMapPin width={13} height={13} />
                            <span>Lokasi Domisili</span>
                          </div>
                          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink)" }}>
                            {activeApp.location || "Tidak dicantumkan"}
                          </span>
                        </div>

                        {/* CV */}
                        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.75rem 0.9rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                            <IconFileText width={13} height={13} />
                            <span>Resumé / CV</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {activeApp.resumeFileName || "CV_Pelamar.pdf"}
                            </span>
                            <button
                              type="button"
                              onClick={() => downloadCandidateResume(activeApp)}
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                padding: "0.2rem 0.45rem",
                                background: "var(--chalk)",
                                border: "1px solid var(--line)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                flexShrink: 0,
                              }}
                            >
                              <IconDownload width={11} height={11} />
                              <span>Unduh</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Cover Letter */}
                      {activeApp.coverLetter && (
                        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.9rem 1rem" }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "0.4rem" }}>
                            Surat Lamaran & Pernyataan Minat
                          </div>
                          <blockquote
                            style={{
                              margin: 0,
                              padding: "0.6rem 0.85rem",
                              borderLeft: "3px solid var(--ink)",
                              background: "#f8fafc",
                              fontSize: "0.88rem",
                              lineHeight: 1.6,
                              color: "var(--ink)",
                              whiteSpace: "pre-wrap",
                              borderRadius: "0 4px 4px 0",
                            }}
                          >
                            {activeApp.coverLetter}
                          </blockquote>
                        </div>
                      )}

                      {/* Bukti Portofolio, Karya & Sertifikasi Card */}
                      {((activeApp.portfolioItems && activeApp.portfolioItems.length > 0) || activeApp.portfolioUrl) && (
                        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem", flexWrap: "wrap", gap: "0.4rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <IconBriefcase width={15} height={15} />
                              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>
                                Bukti Portofolio, Karya & Sertifikasi ({activeApp.portfolioItems?.length || 1})
                              </h4>
                            </div>
                            {activeApp.skillbridgeScore !== null && activeApp.skillbridgeScore !== undefined && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "4px",
                                  background: "#f0fdf4",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  fontWeight: 600,
                                }}
                              >
                                Terverifikasi Skillbridge ({activeApp.skillbridgeScore}/100)
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {activeApp.portfolioItems && activeApp.portfolioItems.length > 0 ? (
                              activeApp.portfolioItems.map((item, idx) => {
                                const hasFile = Boolean(item.fileName) || Boolean(item.fileData) || item.attachmentMode === "file" || item.attachmentMode === "both";
                                const hasUrl = Boolean(item.url && !item.url.startsWith("data:"));
                                const badge = getPortfolioTypeLabel(item.type, item.attachmentMode, item.fileName);
                                const safeUrl = hasUrl
                                  ? (item.url!.startsWith("http") ? item.url! : `https://${item.url}`)
                                  : "#";
                                return (
                                  <div
                                    key={item.id || idx}
                                    style={{
                                      border: "1px solid var(--line)",
                                      borderRadius: "6px",
                                      padding: "0.65rem 0.85rem",
                                      background: "#fafafa",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.35rem",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            padding: "0.12rem 0.4rem",
                                            borderRadius: "3px",
                                            color: badge.color,
                                            background: badge.bg,
                                            border: `1px solid ${badge.border}`,
                                          }}
                                        >
                                          {badge.label}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewModalItem({
                                              isOpen: true,
                                              item,
                                              candidateName: activeApp.candidateName,
                                            })
                                          }
                                          style={{
                                            background: "none",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            color: "var(--ink)",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
                                            textDecoration: "none",
                                          }}
                                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                          title="Klik untuk melihat pratinjau berkas"
                                        >
                                          <span>{item.title || item.fileName || item.url}</span>
                                        </button>
                                        {hasFile && item.fileSize ? (
                                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                                            ({(item.fileSize / 1024).toFixed(0)} KB)
                                          </span>
                                        ) : null}
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewModalItem({
                                              isOpen: true,
                                              item,
                                              candidateName: activeApp.candidateName,
                                            })
                                          }
                                          style={{
                                            background: "none",
                                            border: "none",
                                            padding: 0,
                                            cursor: "pointer",
                                            fontSize: "0.78rem",
                                            color: "#2563eb",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
                                            textDecoration: "underline",
                                            fontWeight: 600,
                                          }}
                                        >
                                          <IconEye width={12} height={12} />
                                          <span>Lihat Pratinjau</span>
                                        </button>
                                        {hasFile && (
                                          <a
                                            href={item.fileData || item.url || "#"}
                                            download={item.fileName || `berkas-portofolio-${idx + 1}`}
                                            style={{
                                              fontSize: "0.78rem",
                                              color: "#0f766e",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "0.25rem",
                                              textDecoration: "underline",
                                              fontWeight: 600,
                                            }}
                                          >
                                            <IconDownload width={12} height={12} />
                                            <span>Unduh Berkas</span>
                                          </a>
                                        )}
                                        {hasUrl && (
                                          <a
                                            href={safeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              fontSize: "0.78rem",
                                              color: "#0284c7",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "0.25rem",
                                              textDecoration: "underline",
                                              fontWeight: 600,
                                            }}
                                          >
                                            <span>Buka Tautan</span>
                                            <IconExternalLink width={12} height={12} />
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    {/* Tag Keahlian yang Dibuktikan */}
                                    {item.verifiedSkills && item.verifiedSkills.length > 0 && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
                                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                                          Membuktikan keahlian:
                                        </span>
                                        {item.verifiedSkills.map((sk) => (
                                          <span
                                            key={sk}
                                            style={{
                                              fontSize: "0.7rem",
                                              padding: "0.1rem 0.35rem",
                                              borderRadius: "3px",
                                              background: "#e0f2fe",
                                              color: "#0369a1",
                                              border: "1px solid #bae6fd",
                                              fontWeight: 500,
                                            }}
                                          >
                                            ✓ {sk}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div
                                style={{
                                  border: "1px solid var(--line)",
                                  borderRadius: "6px",
                                  padding: "0.65rem 0.85rem",
                                  background: "#fafafa",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: "0.5rem",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      padding: "0.12rem 0.4rem",
                                      borderRadius: "3px",
                                      color: "#1e293b",
                                      background: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  >
                                    Portofolio Utama
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewModalItem({
                                        isOpen: true,
                                        item: {
                                          id: "main-portfolio",
                                          title: "Portofolio Utama",
                                          url: activeApp.portfolioUrl,
                                          type: "other",
                                        },
                                        candidateName: activeApp.candidateName,
                                      })
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                      margin: 0,
                                      fontSize: "0.85rem",
                                      fontWeight: 600,
                                      color: "var(--ink)",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      textDecoration: "none",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                    title="Klik untuk melihat pratinjau"
                                  >
                                    {activeApp.portfolioUrl}
                                  </button>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewModalItem({
                                        isOpen: true,
                                        item: {
                                          id: "main-portfolio",
                                          title: "Portofolio Utama",
                                          url: activeApp.portfolioUrl,
                                          type: "other",
                                        },
                                        candidateName: activeApp.candidateName,
                                      })
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                      cursor: "pointer",
                                      fontSize: "0.78rem",
                                      color: "#2563eb",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      textDecoration: "underline",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <IconEye width={12} height={12} />
                                    <span>Lihat Pratinjau</span>
                                  </button>
                                  <a
                                    href={activeApp.portfolioUrl!.startsWith("http") ? activeApp.portfolioUrl! : `https://${activeApp.portfolioUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "#0284c7",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      textDecoration: "underline",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <span>Buka Tautan</span>
                                    <IconExternalLink width={12} height={12} />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI Evaluation & Gap Notes */}
                      <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: "6px", padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.65rem" }}>
                          <IconSparkles width={15} height={15} />
                          <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>
                            Evaluasi Portofolio AI Skillbridge
                          </h4>
                        </div>

                        {activeApp.fitEvaluation ? (
                          <div>
                            <p style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--ink)" }}>
                              {activeApp.fitEvaluation.summary}
                            </p>

                            {/* Kriteria Terpenuhi */}
                            <div style={{ marginBottom: "0.75rem" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>
                                Kriteria yang Terpenuhi ({activeApp.fitEvaluation.matchingCriteria?.length || 0}):
                              </span>
                              {activeApp.fitEvaluation.matchingCriteria && activeApp.fitEvaluation.matchingCriteria.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                  {activeApp.fitEvaluation.matchingCriteria.map((c, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "0.15rem 0.45rem",
                                        background: "#f0fdf4",
                                        color: "#166534",
                                        border: "1px solid #bbf7d0",
                                        borderRadius: "4px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <IconCheck width={11} height={11} />
                                      <span>{c}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>Tidak ada kriteria yang terpenuhi secara eksplisit.</p>
                              )}
                            </div>

                            {/* Catatan Kesenjangan (Gap Notes) - Clean subtle tags, NOT big buttons */}
                            {activeApp.fitEvaluation.missingCriteria && activeApp.fitEvaluation.missingCriteria.length > 0 && (
                              <div style={{ marginBottom: "0.75rem" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>
                                  Catatan Kesenjangan / Belum Terbukti:
                                </span>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                  {activeApp.fitEvaluation.missingCriteria.map((c, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "0.15rem 0.45rem",
                                        background: "#fef2f2",
                                        color: "#991b1b",
                                        border: "1px solid #fecaca",
                                        borderRadius: "4px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <IconX width={11} height={11} />
                                      <span>{c}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Rekomendasi */}
                            {activeApp.fitEvaluation.recommendation && (
                              <div style={{ marginTop: "0.65rem", borderTop: "1px dashed var(--line)", paddingTop: "0.6rem", fontSize: "0.82rem", color: "var(--ink)" }}>
                                <strong>Rekomendasi AI: </strong>
                                <span style={{ fontStyle: "italic", color: "var(--muted)" }}>{activeApp.fitEvaluation.recommendation}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                            Pelamar ini dinilai berdasarkan portofolio umum dengan Skor Skillbridge: {activeApp.skillbridgeScore !== null ? `${activeApp.skillbridgeScore}/100` : "—/100"}.
                          </p>
                        )}
                      </div>

                      {/* Action Bar at Bottom */}
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
                        {activeApp.portfolioItems && activeApp.portfolioItems.length > 0 ? (
                          activeApp.portfolioItems.map((pi, idx) => {
                            const hasFile = Boolean(pi.fileName) || Boolean(pi.fileData) || pi.attachmentMode === "file" || pi.attachmentMode === "both";
                            const hasUrl = Boolean(pi.url && !pi.url.startsWith("data:"));
                            const safeUrl = hasUrl
                              ? (pi.url!.startsWith("http") ? pi.url! : `https://${pi.url}`)
                              : "#";
                            return (
                              <div key={pi.id || idx} style={{ display: "inline-flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewModalItem({
                                      isOpen: true,
                                      item: pi,
                                      candidateName: activeApp.candidateName,
                                    })
                                  }
                                  className="button secondary"
                                  style={{
                                    fontSize: "0.82rem",
                                    minHeight: "36px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0 0.85rem",
                                  }}
                                >
                                  <IconEye width={13} height={13} />
                                  <span>Lihat Pratinjau</span>
                                </button>
                                {hasFile && (
                                  <a
                                    href={pi.fileData || pi.url || "#"}
                                    download={pi.fileName || `berkas-portofolio-${idx + 1}`}
                                    className="button secondary"
                                    style={{
                                      fontSize: "0.82rem",
                                      minHeight: "36px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      padding: "0 0.85rem",
                                    }}
                                  >
                                    <IconDownload width={13} height={13} />
                                    <span>
                                      {pi.fileName
                                        ? pi.fileName.length > 25
                                          ? `${pi.fileName.slice(0, 23)}...`
                                          : pi.fileName
                                        : pi.title || `Unduh Berkas #${idx + 1}`}
                                    </span>
                                  </a>
                                )}
                                {hasUrl && (
                                  <a
                                    href={safeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="button secondary"
                                    style={{
                                      fontSize: "0.82rem",
                                      minHeight: "36px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                      padding: "0 0.85rem",
                                    }}
                                  >
                                    <IconExternalLink width={13} height={13} />
                                    <span>
                                      {pi.title
                                        ? pi.title.length > 25
                                          ? `${pi.title.slice(0, 23)}...`
                                          : pi.title
                                        : `Buka Tautan #${idx + 1}`}
                                    </span>
                                  </a>
                                )}
                              </div>
                            );
                          })
                        ) : activeApp.portfolioUrl ? (
                          <div style={{ display: "inline-flex", gap: "0.35rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewModalItem({
                                  isOpen: true,
                                  item: {
                                    id: "main-portfolio",
                                    title: "Portofolio Utama",
                                    url: activeApp.portfolioUrl,
                                    type: "other",
                                  },
                                  candidateName: activeApp.candidateName,
                                })
                              }
                              className="button secondary"
                              style={{
                                fontSize: "0.82rem",
                                minHeight: "36px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0 0.85rem",
                              }}
                            >
                              <IconEye width={13} height={13} />
                              <span>Lihat Pratinjau</span>
                            </button>
                            <a
                              href={
                                activeApp.portfolioUrl.startsWith("http")
                                  ? activeApp.portfolioUrl
                                  : `https://${activeApp.portfolioUrl}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="button secondary"
                              style={{
                                fontSize: "0.82rem",
                                minHeight: "36px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0 0.85rem",
                              }}
                            >
                              <IconExternalLink width={13} height={13} />
                              <span>Buka Portofolio</span>
                            </a>
                          </div>
                        ) : null}

                        <a
                          href={`mailto:${activeApp.candidateEmail}?subject=${encodeURIComponent(
                            `Skillbridge AI: Tindak Lanjut Lamaran ${selectedJobForApplicants.title} - ${selectedJobForApplicants.companyName}`,
                          )}&body=${encodeURIComponent(
                            `Halo ${activeApp.candidateName},\n\nTerima kasih telah melamar posisi ${selectedJobForApplicants.title} di ${selectedJobForApplicants.companyName} melalui platform Skillbridge AI.\n\nKami telah meninjau berkas lamaran dan bukti portofolio Anda. Kami bermaksud mendiskusikan proses seleksi lebih lanjut.\n\nSalam hangat,\nTim HR ${selectedJobForApplicants.companyName}`,
                          )}`}
                          className="button secondary"
                          style={{
                            fontSize: "0.82rem",
                            minHeight: "36px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0 0.85rem",
                          }}
                        >
                          <IconMail width={13} height={13} />
                          <span>Kirim Email</span>
                        </a>

                        {(() => {
                          const waUrl = getWhatsAppUrl(activeApp.phone, activeApp.candidateName, selectedJobForApplicants.title);
                          if (!waUrl) return null;
                          return (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="button secondary"
                              style={{
                                fontSize: "0.82rem",
                                minHeight: "36px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0 0.85rem",
                                background: "#dcfce7",
                                color: "#15803d",
                                borderColor: "#86efac",
                              }}
                            >
                              <IconMessageCircle width={13} height={13} />
                              <span>Hubungi WA</span>
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
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
              onClick={openCreateJobModal}
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
                onClick={openCreateJobModal}
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
                            color: job.status === "closed" ? "#b91c1c" : "#15803d",
                            background: job.status === "closed" ? "#fee2e2" : "#e6f4ea",
                            border: `1px solid ${job.status === "closed" ? "#fca5a5" : "#ceead6"}`,
                            padding: "0.2rem 0.5rem",
                          }}
                        >
                          {job.status === "closed" ? "Tutup" : "Aktif"}
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

                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="button secondary"
                          style={{ fontSize: "0.88rem", minHeight: "40px" }}
                          onClick={() => {
                            setSelectedApplicantId("all");
                            setSelectedJobForApplicants(job);
                          }}
                        >
                          Lihat Pelamar ({jobApplicants.length})
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          style={{ fontSize: "0.88rem", minHeight: "40px" }}
                          onClick={() => handleOpenEdit(job)}
                        >
                          Edit Lowongan
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          style={{
                            fontSize: "0.88rem",
                            minHeight: "40px",
                            borderColor: "#fca5a5",
                            color: "#b91c1c",
                            background: "#fff5f5",
                          }}
                          onClick={() => {
                            setDeleteError("");
                            setDeletingJob(job);
                          }}
                        >
                          Hapus Lowongan
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
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
            background: "rgba(20, 33, 61, 0.75)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            overflow: "hidden",
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
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              transform: "translateZ(0)",
              willChange: "scroll-position",
            }}
          >
            <button
              type="button"
              aria-label="Tutup modal"
              disabled={isSubmittingJob}
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                padding: "0.35rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                borderRadius: "4px",
              }}
            >
              <IconX width={20} height={20} />
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
                    placeholder="Cth: Junior Web Developer / Graphic Designer / Digital Marketer"
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

              {/* Highlights */}
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  Highlights Utama Lowongan (Disarankan 3 poin)
                </span>
                {formHighlights.length > 0 && (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {formHighlights.map((hl, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "var(--muted)",
                            minWidth: "2rem",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={hl}
                          onChange={(e) => updateFormHighlight(index, e.target.value)}
                          placeholder={`Highlight #${index + 1}`}
                          aria-label={`Highlight ${index + 1}`}
                          style={{ flex: 1, minHeight: "44px" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeFormHighlight(index)}
                          aria-label={`Hapus Highlight ${index + 1}`}
                          title="Hapus highlight ini"
                          style={{
                            minHeight: "44px",
                            minWidth: "44px",
                            padding: "0 0.75rem",
                            background: "transparent",
                            border: "1px solid var(--line)",
                            color: "var(--danger)",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <IconX width={14} height={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "stretch",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Tambahkan Highlight"
                    value={newFormHighlight}
                    onChange={(e) => setNewFormHighlight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFormHighlight();
                      }
                    }}
                    style={{ flex: "1 1 240px", minHeight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={addFormHighlight}
                    className="button secondary"
                    style={{
                      minHeight: "44px",
                      whiteSpace: "nowrap",
                      padding: "0.5rem 1rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    + Tambah Highlight
                  </button>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={descInputId}>Deskripsi Singkat</label>
                <textarea
                  id={descInputId}
                  rows={2}
                  placeholder="Cth: Mencari talenta muda berbakat yang siap berkembang, berkomitmen, dan berfokus pada hasil karya nyata."
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
                  placeholder={"Cth:\n• Mengembangkan antarmuka web yang responsif dan teruji\n• Menulis kode yang bersih, modular, dan terdokumentasi\n• Berkolaborasi dalam tim teknis untuk implementasi fitur"}
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
                  placeholder="Cth: React, Next.js, TypeScript, Tailwind CSS, REST API, Git"
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
                  placeholder="Cth: BPJS Kesehatan & Ketenagakerjaan, Tunjangan Laptop, Mentoring 1-on-1, Bonus Proyek"
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

      {/* ========================================================= */}
      {/* MODAL: EDIT LOWONGAN PEKERJAAN */}
      {/* ========================================================= */}
      {editingJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-job-modal-title"
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
            if (e.target === e.currentTarget && !isSavingEdit) setEditingJob(null);
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
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              transform: "translateZ(0)",
              willChange: "scroll-position",
            }}
          >
            <button
              type="button"
              aria-label="Tutup modal"
              disabled={isSavingEdit}
              onClick={() => setEditingJob(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                padding: "0.35rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                borderRadius: "4px",
              }}
            >
              <IconX width={20} height={20} />
            </button>

            <div style={{ marginBottom: "1.5rem" }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Kelola Lowongan
              </p>
              <h2 id="edit-job-modal-title" style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
                Edit Lowongan Pekerjaan
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                Perbarui detail lowongan, status penerimaan pelamar, atau kriteria skor kesiapan kerja.
              </p>
            </div>

            {editSubmitError && (
              <div className="alert" role="alert" style={{ marginBottom: "1.5rem" }}>
                {editSubmitError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: "grid", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editTitleInputId}>Judul Lowongan</label>
                  <input
                    id={editTitleInputId}
                    type="text"
                    required
                    placeholder="Cth: Junior Front-End Web Developer"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editCompanyInputId}>Nama Perusahaan</label>
                  <input
                    id={editCompanyInputId}
                    type="text"
                    required
                    placeholder="Cth: PT Nusantara Solusi Teknologi"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editStatusSelectId}>Status Lowongan</label>
                  <select
                    id={editStatusSelectId}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as JobStatus)}
                  >
                    <option value="active">Aktif (Menerima Pelamar)</option>
                    <option value="closed">Tutup (Lowongan Dinonaktifkan)</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editFieldSelectId}>Bidang</label>
                  <select
                    id={editFieldSelectId}
                    value={editField}
                    onChange={(e) => setEditField(e.target.value as Field)}
                  >
                    <option value="informatics">Informatika</option>
                    <option value="design">DKV</option>
                    <option value="marketing">Pemasaran</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editTargetRoleInputId}>Target Peran</label>
                  <input
                    id={editTargetRoleInputId}
                    type="text"
                    required
                    placeholder="Cth: Junior Web Developer"
                    value={editTargetRole}
                    onChange={(e) => setEditTargetRole(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editEmploymentTypeSelectId}>Tipe Kerja</label>
                  <select
                    id={editEmploymentTypeSelectId}
                    value={editEmploymentType}
                    onChange={(e) => setEditEmploymentType(e.target.value as EmploymentType)}
                  >
                    <option value="fulltime">Penuh Waktu (Full-time)</option>
                    <option value="internship">Magang (Internship)</option>
                    <option value="contract">Kontrak</option>
                    <option value="parttime">Paruh Waktu</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editWorkplaceTypeSelectId}>Tempat Kerja</label>
                  <select
                    id={editWorkplaceTypeSelectId}
                    value={editWorkplaceType}
                    onChange={(e) => setEditWorkplaceType(e.target.value as WorkplaceType)}
                  >
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote (Jarak Jauh)</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editLocationInputId}>Lokasi</label>
                  <input
                    id={editLocationInputId}
                    type="text"
                    required
                    placeholder="Cth: Jakarta Selatan"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editMinEduSelectId}>Minimal Pendidikan</label>
                  <select
                    id={editMinEduSelectId}
                    value={editMinEdu}
                    onChange={(e) => setEditMinEdu(e.target.value as MinEducation)}
                  >
                    <option value="smk">SMK / Sederajat (Ramah SMK)</option>
                    <option value="diploma">D3 / Diploma</option>
                    <option value="bachelor">S1 / Sarjana</option>
                    <option value="any">Semua Jenjang</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editExpLevelSelectId}>Tingkat Pengalaman</label>
                  <select
                    id={editExpLevelSelectId}
                    value={editExpLevel}
                    onChange={(e) => setEditExpLevel(e.target.value as ExperienceLevel)}
                  >
                    <option value="fresh_graduate">Fresh Graduate</option>
                    <option value="under_1_year">&lt; 1 Tahun Pengalaman</option>
                    <option value="1_to_2_years">1 - 2 Tahun Pengalaman</option>
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={editMinScoreInputId}>Syarat Minimal Skor Skillbridge</label>
                  <input
                    id={editMinScoreInputId}
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={editMinScore}
                    onChange={(e) => setEditMinScore(Number(e.target.value))}
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
                    <label htmlFor={editCompTypeSelectId}>Tipe Kompensasi</label>
                    <select
                      id={editCompTypeSelectId}
                      value={editCompType}
                      onChange={(e) => setEditCompType(e.target.value as CompensationType)}
                    >
                      <option value="paid">Berbayar (Paid)</option>
                      <option value="unpaid">Uang Saku / Magang (Unpaid)</option>
                    </select>
                  </div>

                  {editCompType === "paid" && (
                    <>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor={editSalaryMinInputId}>Gaji Min (Rp)</label>
                        <input
                          id={editSalaryMinInputId}
                          type="number"
                          min={0}
                          placeholder="5000000"
                          value={editSalaryMin}
                          onChange={(e) => setEditSalaryMin(e.target.value)}
                        />
                      </div>

                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor={editSalaryMaxInputId}>Gaji Max (Rp)</label>
                        <input
                          id={editSalaryMaxInputId}
                          type="number"
                          min={0}
                          placeholder="7500000"
                          value={editSalaryMax}
                          onChange={(e) => setEditSalaryMax(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {editCompType === "paid" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editShowSalary}
                      onChange={(e) => setEditShowSalary(e.target.checked)}
                      style={{ width: "16px", minHeight: "16px" }}
                    />
                    Tampilkan rentang gaji secara transparan di kartu lowongan
                  </label>
                )}
              </div>

              {/* Highlights */}
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  Highlights Utama Lowongan (Disarankan 3 poin)
                </span>
                {editHighlights.length > 0 && (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {editHighlights.map((hl, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "var(--muted)",
                            minWidth: "2rem",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={hl}
                          onChange={(e) => updateEditHighlight(index, e.target.value)}
                          placeholder={`Highlight #${index + 1}`}
                          aria-label={`Highlight ${index + 1}`}
                          style={{ flex: 1, minHeight: "44px" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeEditHighlight(index)}
                          aria-label={`Hapus Highlight ${index + 1}`}
                          title="Hapus highlight ini"
                          style={{
                            minHeight: "44px",
                            minWidth: "44px",
                            padding: "0 0.75rem",
                            background: "transparent",
                            border: "1px solid var(--line)",
                            color: "var(--danger)",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <IconX width={14} height={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "stretch",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Tambahkan Highlight"
                    value={newEditHighlight}
                    onChange={(e) => setNewEditHighlight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEditHighlight();
                      }
                    }}
                    style={{ flex: "1 1 240px", minHeight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={addEditHighlight}
                    className="button secondary"
                    style={{
                      minHeight: "44px",
                      whiteSpace: "nowrap",
                      padding: "0.5rem 1rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    + Tambah Highlight
                  </button>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={editDescInputId}>Deskripsi Singkat</label>
                <textarea
                  id={editDescInputId}
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              {/* Tanggung Jawab */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={editRespInputId}>Tanggung Jawab Pekerjaan (Satu per baris)</label>
                <textarea
                  id={editRespInputId}
                  rows={3}
                  required
                  placeholder="Mengembangkan fitur web&#10;Menjaga kualitas kode&#10;Kolaborasi tim"
                  value={editResponsibilities}
                  onChange={(e) => setEditResponsibilities(e.target.value)}
                />
              </div>

              {/* Skills */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={editSkillsInputId}>Keahlian yang Dibutuhkan (Pisahkan dengan koma)</label>
                <input
                  id={editSkillsInputId}
                  type="text"
                  required
                  placeholder="React, Next.js, TypeScript, Tailwind CSS, REST API"
                  value={editRequiredSkills}
                  onChange={(e) => setEditRequiredSkills(e.target.value)}
                />
              </div>

              {/* Benefits */}
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={editBenefitsInputId}>Fasilitas & Benefit (Pisahkan dengan koma)</label>
                <input
                  id={editBenefitsInputId}
                  type="text"
                  placeholder="BPJS, Tunjangan Laptop, Tunjangan Internet"
                  value={editBenefits}
                  onChange={(e) => setEditBenefits(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={isSavingEdit}
                  onClick={() => setEditingJob(null)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={isSavingEdit}>
                  {isSavingEdit ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: KONFIRMASI HAPUS LOWONGAN */}
      {/* ========================================================= */}
      {deletingJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-job-modal-title"
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
            if (e.target === e.currentTarget && !isDeletingJob) setDeletingJob(null);
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "520px",
              width: "100%",
              position: "relative",
              padding: "clamp(1.5rem, 4vw, 2rem)",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              transform: "translateZ(0)",
            }}
          >
            <button
              type="button"
              aria-label="Tutup modal"
              disabled={isDeletingJob}
              onClick={() => setDeletingJob(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "transparent",
                border: "none",
                padding: "0.35rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                borderRadius: "4px",
              }}
            >
              <IconX width={20} height={20} />
            </button>

            <div style={{ marginBottom: "1.25rem" }}>
              <p className="eyebrow" style={{ margin: 0, color: "#b91c1c" }}>
                Konfirmasi Hapus
              </p>
              <h2 id="delete-job-modal-title" style={{ fontSize: "1.4rem", margin: "0.25rem 0 0.5rem" }}>
                Hapus Lowongan Pekerjaan?
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                Anda akan menghapus lowongan <strong>{deletingJob.title}</strong> dari {deletingJob.companyName}.
              </p>
            </div>

            <div
              style={{
                background: "#fef2f2",
                borderLeft: "4px solid #ef4444",
                padding: "0.85rem 1rem",
                fontSize: "0.88rem",
                lineHeight: 1.5,
                color: "#991b1b",
                marginBottom: "1.5rem",
              }}
            >
              <strong>Peringatan:</strong> Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Berkas lamaran yang terkait dengan lowongan ini juga akan terhapus dari sistem.
            </div>

            {deleteError && (
              <div className="alert" role="alert" style={{ marginBottom: "1.25rem" }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button secondary"
                disabled={isDeletingJob}
                onClick={() => setDeletingJob(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button"
                style={{
                  background: "#dc2626",
                  borderColor: "#dc2626",
                  color: "#ffffff",
                }}
                disabled={isDeletingJob}
                onClick={handleConfirmDelete}
              >
                {isDeletingJob ? "Menghapus..." : "Ya, Hapus Lowongan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRATINJAU BERKAS PORTOFOLIO */}
      {/* ========================================================= */}
      {previewModalItem?.isOpen && (
        <FilePreviewModal
          item={previewModalItem.item}
          candidateName={previewModalItem.candidateName}
          onClose={() => setPreviewModalItem(null)}
        />
      )}
    </section>
  );
}
