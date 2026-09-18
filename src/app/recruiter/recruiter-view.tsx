"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders, getSupabase } from "@/lib/auth-client";

type TalentCandidate = {
  id: string;
  assessmentId: string;
  candidateName: string;
  email: string;
  role: string;
  field: string;
  finalScore: number;
  evidenceType: string;
  strengths: string[];
  gaps: string[];
  createdAt: string;
  sourceUrl?: string;
  isDemo: boolean;
};

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "candidate" }
  | { status: "recruiter" };

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

export default function RecruiterView() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [selectedField, setSelectedField] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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
        setAuthState({ status: "recruiter" });
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
        setAuthState({ status: "recruiter" });
      } else {
        setAuthState({ status: "candidate" });
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function handleFieldChange(field: string) {
    setLoading(true);
    setSelectedField(field);
  }

  function handleScoreChange(score: number) {
    setLoading(true);
    setSelectedScore(score);
  }

  useEffect(() => {
    if (authState.status !== "recruiter") return;

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
  }, [authState.status, selectedField, selectedScore]);

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
            Silakan masuk dengan akun Perekrut / HR untuk mengakses Talent Pool.
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
            Akses Terbatas: Halaman Talent Pool khusus untuk akun Perekrut / HR perusahaan mitra. Akun Anda saat ini terdaftar sebagai Kandidat.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Link className="button" href="/assess">
              Ke Halaman Penilaian Portofolio
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
                  onClick={() => handleFieldChange(f.id)}
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
                  onClick={() => handleScoreChange(s.value)}
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
    </section>
  );
}
