"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAssessments } from "@/lib/assessment-client";
import { authHeaders } from "@/lib/auth-client";
import type { JobApplication, ApplicationStatus } from "@/lib/types";

function getStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Terkirim",
        bg: "#f3f4f6",
        color: "#374151",
        border: "#d1d5db",
      };
    case "reviewed":
      return {
        label: "Ditinjau HR",
        bg: "#e0f2fe",
        color: "#0369a1",
        border: "#bae6fd",
      };
    case "shortlisted":
      return {
        label: "Shortlisted",
        bg: "#e6f4ea",
        color: "#137333",
        border: "#ceead6",
      };
    case "rejected":
      return {
        label: "Tidak Lolos",
        bg: "#fce8e6",
        color: "#c5221f",
        border: "#fad2cf",
      };
    case "accepted":
      return {
        label: "Diterima",
        bg: "#dcfce7",
        color: "#15803d",
        border: "#86efac",
      };
    default:
      return {
        label: status,
        bg: "#f3f4f6",
        color: "#374151",
        border: "#d1d5db",
      };
  }
}

export default function HistoryView() {
  const [activeTab, setActiveTab] = useState<"assessments" | "applications">("assessments");
  const { items, loading: assessmentsLoading, error: assessmentsError } = useAssessments();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");

  useEffect(() => {
    let active = true;
    authHeaders()
      .then((headers) => fetch("/api/jobs/applications", { headers }))
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Gagal memuat daftar lamaran.");
        }
        return res.json();
      })
      .then((data: JobApplication[]) => {
        if (active) setApplications(data);
      })
      .catch((err) => {
        if (active) setAppsError(err instanceof Error ? err.message : "Gagal memuat lamaran.");
      })
      .finally(() => {
        if (active) setAppsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const demoLinks = (
    <div style={{ marginTop: "2rem", borderTop: "1px solid var(--line)", paddingTop: "1.5rem" }}>
      <p className="hint"><strong>Simulasi Sidang Kompres (Data Seed):</strong></p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <Link className="button secondary" href="/results/00000000-0000-4000-8000-000000000002">
          Demo Informatika (50/100 · +25 Δ)
        </Link>
        <Link className="button secondary" href="/results/00000000-0000-4000-8000-000000000022">
          Demo DKV (50/100)
        </Link>
        <Link className="button secondary" href="/results/00000000-0000-4000-8000-000000000032">
          Demo Marketing (61/100)
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: "5rem" }}>
      {/* Tab Navigation */}
      <div
        className="chips"
        role="tablist"
        aria-label="Kategori Riwayat"
        style={{ marginBottom: "2rem" }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "assessments"}
          className="chip"
          style={{
            background: activeTab === "assessments" ? "var(--chalk)" : "white",
            borderColor: activeTab === "assessments" ? "var(--ink)" : "var(--line)",
            fontWeight: activeTab === "assessments" ? 700 : 500,
            cursor: "pointer",
            padding: "0.5rem 1rem",
          }}
          onClick={() => setActiveTab("assessments")}
        >
          Penilaian Portofolio ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "applications"}
          className="chip"
          style={{
            background: activeTab === "applications" ? "var(--chalk)" : "white",
            borderColor: activeTab === "applications" ? "var(--ink)" : "var(--line)",
            fontWeight: activeTab === "applications" ? 700 : 500,
            cursor: "pointer",
            padding: "0.5rem 1rem",
          }}
          onClick={() => setActiveTab("applications")}
        >
          Lamaran Terkirim ({applications.length})
        </button>
      </div>

      {/* Tab 1: Penilaian Portofolio */}
      {activeTab === "assessments" && (
        <>
          {assessmentsLoading && (
            <section className="section" style={{ paddingTop: "1rem" }}>
              <p>Memuat riwayat penilaian...</p>
            </section>
          )}

          {assessmentsError && (
            <section className="section" style={{ paddingTop: "1rem" }}>
              <div className="alert" role="alert">
                {assessmentsError}
              </div>
              <Link className="button" href="/auth">
                Masuk
              </Link>
            </section>
          )}

          {!assessmentsLoading && !assessmentsError && !items.length && (
            <section className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <h2>Belum ada penilaian.</h2>
              <p className="hint" style={{ marginBottom: "1.5rem" }}>
                Evaluasi bukti portofolio pertama Anda untuk mendapatkan skor kesiapan kerja terstandarisasi.
              </p>
              <Link className="button" href="/assess">
                Nilai bukti pertama
              </Link>
              {demoLinks}
            </section>
          )}

          {!assessmentsLoading && !assessmentsError && items.length > 0 && (
            <section className="history-list">
              {items.map((item) => (
                <article className="card history-item" key={item.id}>
                  <strong>
                    {item.finalScore ?? "—"}
                    <small>/100</small>
                  </strong>
                  <div>
                    <h3>{item.role}</h3>
                    <p className="hint">
                      {new Date(item.createdAt).toLocaleString("id-ID")} · Rubrik {item.rubric_version}
                    </p>
                  </div>
                  <div className="actions">
                    <Link className="button secondary" href={`/results/${item.id}`}>
                      Lihat hasil
                    </Link>
                  </div>
                </article>
              ))}
              {demoLinks}
            </section>
          )}
        </>
      )}

      {/* Tab 2: Lamaran Terkirim */}
      {activeTab === "applications" && (
        <>
          {appsLoading && (
            <section className="section" style={{ paddingTop: "1rem" }}>
              <p>Memuat riwayat lamaran...</p>
            </section>
          )}

          {appsError && (
            <section className="section" style={{ paddingTop: "1rem" }}>
              <div className="alert" role="alert">
                {appsError}
              </div>
            </section>
          )}

          {!appsLoading && !appsError && applications.length === 0 && (
            <section className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <h2>Belum Ada Lamaran Terkirim</h2>
              <p className="hint" style={{ maxWidth: "560px", margin: "0.5rem auto 1.5rem" }}>
                Anda belum mengajukan lamaran ke lowongan mitra industri. Temukan lowongan yang sesuai dengan target keahlian Anda dan lamar dengan skor Skillbridge.
              </p>
              <Link className="button" href="/jobs">
                Jelajahi Bursa Lowongan
              </Link>
            </section>
          )}

          {!appsLoading && !appsError && applications.length > 0 && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {applications.map((app) => {
                const badge = getStatusBadge(app.status);
                return (
                  <article
                    key={app.id}
                    className="card"
                    style={{
                      background: "white",
                      border: "1px solid var(--line)",
                      padding: "1.5rem",
                      display: "grid",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.6rem",
                            borderRadius: "2px",
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            marginBottom: "0.5rem",
                          }}
                        >
                          Status: {badge.label}
                        </span>
                        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem" }}>
                          {app.jobTitle || "Lowongan Industri"}
                        </h3>
                        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
                          {app.companyName || "Perusahaan Mitra"} · Diajukan pada{" "}
                          {new Date(app.appliedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {app.skillbridgeScore !== null && app.skillbridgeScore !== undefined && (
                        <div
                          style={{
                            textAlign: "right",
                            background: "var(--paper)",
                            padding: "0.5rem 1rem",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700 }}>
                            Skor Dilampirkan
                          </span>
                          <span style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                            {app.skillbridgeScore}
                            <small style={{ fontSize: "0.85rem", color: "var(--muted)" }}>/100</small>
                          </span>
                        </div>
                      )}
                    </div>

                    {app.coverLetter && (
                      <div
                        style={{
                          background: "#fafaf8",
                          borderLeft: "3px solid var(--line)",
                          padding: "0.75rem 1rem",
                          fontSize: "0.9rem",
                          color: "var(--ink)",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.25rem" }}>
                          Catatan / Surat Pengantar:
                        </strong>
                        <p style={{ margin: 0, fontStyle: "italic" }}>&ldquo;{app.coverLetter}&rdquo;</p>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
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
                          style={{ fontSize: "0.85rem", minHeight: "38px" }}
                        >
                          Lihat Bukti Terlampir
                        </Link>
                      )}
                      {app.portfolioItems && app.portfolioItems.length > 0 ? (
                        app.portfolioItems.map((pi, idx) => (
                          <a
                            key={pi.id || idx}
                            className="button secondary"
                            href={pi.url.startsWith("http") ? pi.url : `https://${pi.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.85rem", minHeight: "38px" }}
                          >
                            {pi.title || `Buka Portofolio #${idx + 1}`}
                          </a>
                        ))
                      ) : app.portfolioUrl ? (
                        <a
                          className="button secondary"
                          href={app.portfolioUrl.startsWith("http") ? app.portfolioUrl : `https://${app.portfolioUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.85rem", minHeight: "38px" }}
                        >
                          Buka Portofolio
                        </a>
                      ) : null}
                      <Link
                        className="button secondary"
                        href="/jobs"
                        style={{ fontSize: "0.85rem", minHeight: "38px", marginLeft: "auto" }}
                      >
                        Lihat Bursa Lowongan
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
