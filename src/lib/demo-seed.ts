import type { AssessmentResult } from "./types";

export const DEMO_SEEDS: AssessmentResult[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: "2026-08-20T10:00:00.000Z",
    role: "Junior Web Developer",
    sourceUrl: "https://github.com/skillbridge-demo/web-events (Revisi 1 - Awal)",
    evidenceType: "github",
    rubric_version: "1.1",
    evidence_sufficiency: "insufficient_evidence",
    finalScore: null,
    strengths: ["Inisiasi repositori dan berkas utama proyek."],
    gaps: ["Dokumentasi setup README tidak tersedia", "Riwayat commit kurang dari batas minimal audit"],
    limitations: ["Penilaian statis tanpa runtime. Kurang dari 3 commit."],
    criteria: [
      {
        criterion_id: "web_code_quality",
        evidence_sufficiency: "sufficient",
        score: 25,
        confidence: "medium",
        reason: "Kode terbaca sebagian tetapi tanggung jawab bercampur dan tanpa penanganan error.",
        evidence_refs: ["[FILE:1:L1-L15]"],
      },
      {
        criterion_id: "web_project_structure",
        evidence_sufficiency: "sufficient",
        score: 25,
        confidence: "medium",
        reason: "Entry point belum memisahkan domain atau modul secara terpisah.",
        evidence_refs: ["[FILE:1:L1-L20]"],
      },
      {
        criterion_id: "web_documentation",
        evidence_sufficiency: "insufficient_evidence",
        score: null,
        confidence: "low",
        reason: "README tidak ditemukan dalam repositori.",
        evidence_refs: [],
      },
      {
        criterion_id: "web_contribution_history",
        evidence_sufficiency: "insufficient_evidence",
        score: null,
        confidence: "low",
        reason: "Hanya ditemukan 1 commit awal; minimal 3 commit diperlukan untuk audit.",
        evidence_refs: ["[COMMITS:1]"],
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    createdAt: "2026-08-25T14:30:00.000Z",
    role: "Junior Web Developer",
    sourceUrl: "https://github.com/skillbridge-demo/web-events (Revisi 2 - Sedang)",
    evidenceType: "github",
    rubric_version: "1.1",
    evidence_sufficiency: "sufficient",
    finalScore: 50,
    strengths: [
      "Struktur modul routes, events, dan server sudah dipisahkan secara teratur.",
      "README memuat panduan instalasi dan instruksi menjalankan aplikasi.",
    ],
    gaps: [
      "Penanganan error mendalam dan automated unit test belum tersedia",
      "Validasi skema input pada endpoint belum menyeluruh",
    ],
    limitations: [
      "Penilaian indikatif berbasis analisis statis; kode repositori tidak dieksekusi di runtime.",
    ],
    criteria: [
      {
        criterion_id: "web_code_quality",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Alur utama terbaca dan validasi dasar tersedia, namun belum ada penanganan edge case dan automated test.",
        evidence_refs: ["[FILE:1:L12-L28]"],
      },
      {
        criterion_id: "web_project_structure",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Entry point dan domain dipisah secara dasar antara routes, events, dan server.",
        evidence_refs: ["[FILE:2:L1-L20]"],
      },
      {
        criterion_id: "web_documentation",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "README memuat instruksi instalasi dan setup dasar, namun belum mencantumkan konfigurasi environment lengkap.",
        evidence_refs: ["[FILE:3:L1-L15]"],
      },
      {
        criterion_id: "web_contribution_history",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "4 commit bertahap menunjukkan progres dasar pengembangan fitur secara berkala.",
        evidence_refs: ["[COMMITS:1]"],
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    createdAt: "2026-08-25T15:00:00.000Z",
    role: "Junior Graphic Designer",
    sourceUrl: "career-day-landing.png (Data Demo DKV Sedang)",
    evidenceType: "image",
    rubric_version: "1.1",
    evidence_sufficiency: "sufficient",
    finalScore: 50,
    strengths: [
      "Palet warna biru dan tipografi cukup konsisten di layout landing page.",
      "Hierarki judul dan elemen CTA utama dapat dibedakan dengan jelas.",
    ],
    gaps: [
      "Eksplorasi iterasi alternatif sebelum desain final belum dipaparkan",
      "Rasio kontras teks pada panel sekunder masih perlu ditingkatkan",
    ],
    limitations: [
      "Penilaian visual berbasis observasi model multimodal; bukan verifikasi file mentah desain vektor.",
    ],
    criteria: [
      {
        criterion_id: "design_visual_consistency",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Palet, tipografi, dan alignment cukup konsisten pada tata letak landing page.",
        evidence_refs: ["[VISUAL:PALETTE:BLUE]", "[VISUAL:TYPOGRAPHY]"],
      },
      {
        criterion_id: "design_process_iteration",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Minimal dua tahap (wireframe dan mockup) dijelaskan pada deskripsi proses.",
        evidence_refs: ["[DESC:PHASE:1]", "[DESC:PHASE:2]"],
      },
      {
        criterion_id: "design_narrative",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Masalah, target audiens mahasiswa, dan keputusan dasar pemilihan tata letak dijelaskan.",
        evidence_refs: ["[DESC:AUDIENCE]", "[DESC:PROBLEM]"],
      },
      {
        criterion_id: "design_problem_solving",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Solusi visual menjawab kebutuhan dasar brief acara pameran karier.",
        evidence_refs: ["[VISUAL:HERO:CTA]", "[DESC:GOAL]"],
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000032",
    createdAt: "2026-08-25T15:30:00.000Z",
    role: "Junior Digital Marketer",
    sourceUrl: "laporan-kampanye-2-kanal.pdf (Data Demo Marketing Sedang)",
    evidenceType: "pdf",
    rubric_version: "1.1",
    evidence_sufficiency: "sufficient",
    finalScore: 61,
    strengths: [
      "Tujuan kampanye, target audiens, dan pemilihan 2 kanal disajikan metodis.",
      "Tabel performa menampilkan perbandingan impresi dan CTR secara kuantitatif.",
    ],
    gaps: [
      "Penyajian metrik biaya akhir seperti CPA dan konversi penjualan (ROAS)",
      "Penyertaan data baseline periode sebelumnya untuk komparasi pertumbuhan",
    ],
    limitations: [
      "Penilaian berbasis ekstraksi teks dan tabel pada PDF laporan yang diunggah.",
    ],
    criteria: [
      {
        criterion_id: "marketing_methodology",
        evidence_sufficiency: "sufficient",
        score: 75,
        confidence: "high",
        reason: "Komponen tujuan, segmen audiens, kanal iklan, dan pengujian pesan saling terhubung.",
        evidence_refs: ["[PAGE:1:BLOCK:2]"],
      },
      {
        criterion_id: "marketing_data_use",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "Metrik relevan dan konteks dasar tersedia dalam tabel, namun baseline historis belum dicantumkan.",
        evidence_refs: ["[PAGE:1:BLOCK:4]"],
      },
      {
        criterion_id: "marketing_measurable_results",
        evidence_sufficiency: "sufficient",
        score: 50,
        confidence: "high",
        reason: "KPI CTR 3.82% tercapai, namun data nilai penjualan akhir belum disajikan.",
        evidence_refs: ["[PAGE:1:BLOCK:5]"],
      },
      {
        criterion_id: "marketing_report_quality",
        evidence_sufficiency: "sufficient",
        score: 75,
        confidence: "high",
        reason: "Data dihubungkan langsung ke rekomendasi alokasi anggaran kanal berikutnya.",
        evidence_refs: ["[PAGE:1:BLOCK:6]"],
      },
    ],
  },
];

export function isDemoSeedId(id: string): boolean {
  return DEMO_SEEDS.some((seed) => seed.id === id);
}

export function getDemoSeed(id: string): AssessmentResult | undefined {
  return DEMO_SEEDS.find((seed) => seed.id === id);
}
