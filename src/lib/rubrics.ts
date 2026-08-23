import type { Criterion, Field, Role } from "./types";

const anchors = (labels: [string, string, string, string, string]) => ({
  "0": labels[0], "25": labels[1], "50": labels[2], "75": labels[3], "100": labels[4],
});

export const roles: Record<Field, Role> = {
  informatics: "Junior Web Developer",
  design: "Junior Graphic Designer",
  marketing: "Junior Digital Marketer",
};

export const roleFields = Object.fromEntries(
  Object.entries(roles).map(([field, role]) => [role, field]),
) as Record<Role, Field>;

export const rubrics: Record<Role, Criterion[]> = {
  "Junior Web Developer": [
    { id: "web_code_quality", label: "Kualitas kode", weight: 0.35, anchors: anchors(["Bermasalah mendasar", "Sulit dibaca", "Cukup terbaca", "Konsisten dan modular", "Kokoh dan teruji"]), insufficientEvidence: "Tidak ada file kode relevan.", acceptedEvidence: "Isi file kode yang dapat dibaca." },
    { id: "web_project_structure", label: "Struktur proyek", weight: 0.25, anchors: anchors(["Tidak terorganisasi", "Tanggung jawab bercampur", "Pemisahan dasar", "Struktur jelas", "Efektif tanpa abstraksi berlebih"]), insufficientEvidence: "Tree repositori tidak tersedia.", acceptedEvidence: "Tree file dan direktori repositori." },
    { id: "web_documentation", label: "Dokumentasi", weight: 0.2, anchors: anchors(["Tanpa petunjuk", "Deskripsi umum", "Setup dasar", "Setup dan batasan jelas", "Lengkap, akurat, ringkas"]), insufficientEvidence: "README tidak tersedia.", acceptedEvidence: "README berisi tujuan, setup, dan penggunaan." },
    { id: "web_contribution_history", label: "Riwayat kontribusi", weight: 0.2, anchors: anchors(["Satu dump", "Pesan tidak bermakna", "Progres dasar", "Commit bertahap", "Iterasi mudah diaudit"]), insufficientEvidence: "Kurang dari tiga commit.", acceptedEvidence: "Minimal tiga commit bertanggal beserta pesannya." },
  ],
  "Junior Graphic Designer": [
    { id: "design_visual_consistency", label: "Konsistensi visual", weight: 0.3, anchors: anchors(["Elemen bertentangan", "Sering berubah", "Cukup konsisten", "Kohesif dan bertujuan", "Presisi lintas format"]), insufficientEvidence: "Visual final tidak tersedia.", acceptedEvidence: "Gambar hasil karya yang memperlihatkan tipografi, warna, komposisi, dan hierarki." },
    { id: "design_process_iteration", label: "Proses dan iterasi", weight: 0.25, anchors: anchors(["Tanpa eksplorasi", "Perubahan kosmetik", "Beberapa tahap", "Feedback dan revisi jelas", "Iterasi sistematis"]), insufficientEvidence: "Hanya karya final tersedia.", acceptedEvidence: "Deskripsi minimal dua tahap, alternatif, feedback, atau perubahan desain." },
    { id: "design_narrative", label: "Narasi desain", weight: 0.2, anchors: anchors(["Tujuan tidak jelas", "Alasan lemah", "Masalah cukup jelas", "Keputusan terhubung", "Trade-off mudah dipahami"]), insufficientEvidence: "Deskripsi proyek tidak tersedia.", acceptedEvidence: "Masalah atau tujuan, target audiens, dan alasan keputusan desain." },
    { id: "design_problem_solving", label: "Pemecahan masalah", weight: 0.25, anchors: anchors(["Tidak menjawab brief", "Dominan dekoratif", "Menjawab tujuan dasar", "Menangani kebutuhan utama", "Constraint terpadu"]), insufficientEvidence: "Brief atau constraint tidak tersedia.", acceptedEvidence: "Brief atau constraint dan hubungan solusi visual terhadap kebutuhan tersebut." },
  ],
  "Junior Digital Marketer": [
    { id: "marketing_methodology", label: "Metodologi kampanye", weight: 0.25, anchors: anchors(["Tidak koheren", "Audiens lemah", "Komponen dasar ada", "Metode saling terhubung", "Hipotesis dan funnel eksplisit"]), insufficientEvidence: "Rencana kampanye tidak tersedia.", acceptedEvidence: "Tujuan, target audiens, kanal, pesan, dan metode evaluasi." },
    { id: "marketing_data_use", label: "Penggunaan data", weight: 0.25, anchors: anchors(["Data dibaca salah", "Tanpa baseline", "Metrik relevan", "Data memandu keputusan", "Analisis dapat diaudit"]), insufficientEvidence: "Metrik atau sumber data tidak tersedia.", acceptedEvidence: "Tabel atau angka kampanye beserta sumber, definisi, atau konteks pengambilannya." },
    { id: "marketing_measurable_results", label: "Hasil terukur", weight: 0.3, anchors: anchors(["Bertentangan dengan data", "Vanity metrics", "KPI dasar", "Target dan hasil jelas", "Atribusi transparan"]), insufficientEvidence: "KPI, baseline, periode, atau hasil aktual tidak tersedia.", acceptedEvidence: "KPI, baseline atau target, periode, hasil aktual, dan kaitan dengan aktivitas kampanye." },
    { id: "marketing_report_quality", label: "Kualitas laporan", weight: 0.2, anchors: anchors(["Tidak dapat dipahami", "Kesimpulan lemah", "Cukup terstruktur", "Data terhubung ke aksi", "Insight mudah diaudit"]), insufficientEvidence: "Laporan tidak tersedia.", acceptedEvidence: "Laporan studi kasus terstruktur berisi metode, data, kesimpulan, dan tindak lanjut." },
  ],
};

export function calculateFinalScore(criteria: CriterionScoreLike[], rubric: Criterion[]) {
  if (criteria.some((item) => item.score === null)) return null;
  return Math.round(criteria.reduce((sum, item) => {
    const criterion = rubric.find(({ id }) => id === item.criterion_id);
    if (!criterion) throw new Error(`Kriteria tidak dikenal: ${item.criterion_id}`);
    return sum + Number(item.score) * criterion.weight;
  }, 0));
}

type CriterionScoreLike = { criterion_id: string; score: number | null };
