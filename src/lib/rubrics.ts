import type { Criterion, Field, Role } from "./types";

const anchors = (labels: [string, string, string, string, string]) => ({
  "0": labels[0], "25": labels[1], "50": labels[2], "75": labels[3], "100": labels[4],
});
const requirements = (items: [string, string, string, string, string]) => ({ "0": items[0], "25": items[1], "50": items[2], "75": items[3], "100": items[4] });

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
    { id: "web_code_quality", label: "Kualitas kode", weight: 0.35, anchors: anchors(["Bermasalah mendasar", "Sulit dibaca", "Cukup terbaca", "Konsisten dan modular", "Kokoh dan teruji"]), anchorRequirements: requirements(["Kode menunjukkan bug/validasi mendasar yang hilang.", "Kode terbaca sebagian tetapi tanggung jawab bercampur.", "Alur utama terbaca dan validasi dasar tersedia.", "Modul terpisah, error ditangani, dan pola konsisten.", "Edge case penting diuji dan error handling menyeluruh."]), insufficientEvidence: "Tidak ada file kode relevan.", acceptedEvidence: "Isi file kode yang dapat dibaca." },
    { id: "web_project_structure", label: "Struktur proyek", weight: 0.25, anchors: anchors(["Tidak terorganisasi", "Tanggung jawab bercampur", "Pemisahan dasar", "Struktur jelas", "Efektif tanpa abstraksi berlebih"]), anchorRequirements: requirements(["Seluruh tanggung jawab berada di satu area tanpa struktur.", "Ada folder/file tetapi tanggung jawab masih bercampur.", "Entry point dan domain dipisah secara dasar.", "Struktur dan tanggung jawab tiap modul jelas.", "Struktur efektif, konsisten, dan tanpa lapisan spekulatif."]), insufficientEvidence: "Tree repositori tidak tersedia.", acceptedEvidence: "Tree file dan direktori repositori." },
    { id: "web_documentation", label: "Dokumentasi", weight: 0.2, anchors: anchors(["Tanpa petunjuk", "Deskripsi umum", "Setup dasar", "Setup dan batasan jelas", "Lengkap, akurat, ringkas"]), anchorRequirements: requirements(["Tidak ada tujuan, setup, atau penggunaan.", "Tujuan disebut tanpa langkah menjalankan.", "Setup dan penggunaan dasar tersedia.", "Setup, penggunaan, dan batasan utama jelas.", "Dokumentasi lengkap, akurat terhadap kode, dan ringkas."]), insufficientEvidence: "README tidak tersedia.", acceptedEvidence: "README berisi tujuan, setup, dan penggunaan." },
    { id: "web_contribution_history", label: "Riwayat kontribusi", weight: 0.2, anchors: anchors(["Satu dump", "Pesan tidak bermakna", "Progres dasar", "Commit bertahap", "Iterasi mudah diaudit"]), anchorRequirements: requirements(["Satu commit besar tanpa riwayat progres.", "Minimal tiga commit tetapi pesan tidak menjelaskan perubahan.", "Minimal tiga commit menunjukkan progres dasar.", "Commit bertahap menjelaskan fitur/perbaikan.", "Iterasi, revisi, dan alasan perubahan mudah diaudit."]), insufficientEvidence: "Kurang dari tiga commit.", acceptedEvidence: "Minimal tiga commit bertanggal beserta pesannya." },
  ],
  "Junior Graphic Designer": [
    { id: "design_visual_consistency", label: "Konsistensi visual", weight: 0.3, anchors: anchors(["Elemen bertentangan", "Sering berubah", "Cukup konsisten", "Kohesif dan bertujuan", "Presisi lintas format"]), anchorRequirements: requirements(["Tipografi, warna, atau alignment saling bertentangan.", "Sistem visual berubah tanpa aturan yang jelas.", "Palet, tipografi, dan alignment cukup konsisten.", "Hierarki, spacing, warna, dan tipografi kohesif.", "Sistem presisi terbukti pada lebih dari satu format/layout."]), insufficientEvidence: "Visual final tidak tersedia.", acceptedEvidence: "Gambar hasil karya yang memperlihatkan tipografi, warna, komposisi, dan hierarki." },
    { id: "design_process_iteration", label: "Proses dan iterasi", weight: 0.25, anchors: anchors(["Tanpa eksplorasi", "Perubahan kosmetik", "Beberapa tahap", "Feedback dan revisi jelas", "Iterasi sistematis"]), anchorRequirements: requirements(["Tidak ada tahap atau revisi yang dijelaskan.", "Perubahan hanya kosmetik tanpa alasan.", "Minimal dua tahap dan perubahan utama tersedia.", "Feedback dihubungkan ke revisi spesifik.", "Alternatif, feedback, revisi, dan evaluasi terdokumentasi sistematis."]), insufficientEvidence: "Hanya karya final tersedia.", acceptedEvidence: "Deskripsi minimal dua tahap, alternatif, feedback, atau perubahan desain." },
    { id: "design_narrative", label: "Narasi desain", weight: 0.2, anchors: anchors(["Tujuan tidak jelas", "Alasan lemah", "Masalah cukup jelas", "Keputusan terhubung", "Trade-off mudah dipahami"]), anchorRequirements: requirements(["Tujuan dan audiens tidak jelas.", "Tujuan ada tetapi alasan keputusan lemah.", "Masalah, audiens, dan keputusan dasar dijelaskan.", "Keputusan visual terhubung ke kebutuhan audiens.", "Trade-off dan konsekuensi tiap keputusan mudah dipahami."]), insufficientEvidence: "Deskripsi proyek tidak tersedia.", acceptedEvidence: "Masalah atau tujuan, target audiens, dan alasan keputusan desain." },
    { id: "design_problem_solving", label: "Pemecahan masalah", weight: 0.25, anchors: anchors(["Tidak menjawab brief", "Dominan dekoratif", "Menjawab tujuan dasar", "Menangani kebutuhan utama", "Constraint terpadu"]), anchorRequirements: requirements(["Solusi tidak menjawab kebutuhan brief.", "Solusi dominan dekoratif tanpa hubungan kebutuhan.", "Solusi menjawab tujuan dasar brief.", "Kebutuhan utama dan constraint ditangani secara nyata.", "Beragam constraint dipadukan dan hasilnya dapat diuji."]), insufficientEvidence: "Brief atau constraint tidak tersedia.", acceptedEvidence: "Brief atau constraint dan hubungan solusi visual terhadap kebutuhan tersebut." },
  ],
  "Junior Digital Marketer": [
    { id: "marketing_methodology", label: "Metodologi kampanye", weight: 0.25, anchors: anchors(["Tidak koheren", "Audiens lemah", "Komponen dasar ada", "Metode saling terhubung", "Hipotesis dan funnel eksplisit"]), anchorRequirements: requirements(["Tujuan, audiens, kanal, dan evaluasi tidak koheren.", "Tujuan/kanal ada tetapi audiens atau pesan lemah.", "Tujuan, audiens, kanal, pesan, dan evaluasi dasar tersedia.", "Komponen kampanye saling terhubung dan dapat dievaluasi.", "Hipotesis, funnel, segmen, pesan, kanal, dan eksperimen eksplisit."]), insufficientEvidence: "Rencana kampanye tidak tersedia.", acceptedEvidence: "Tujuan, target audiens, kanal, pesan, dan metode evaluasi." },
    { id: "marketing_data_use", label: "Penggunaan data", weight: 0.25, anchors: anchors(["Data dibaca salah", "Tanpa baseline", "Metrik relevan", "Data memandu keputusan", "Analisis dapat diaudit"]), anchorRequirements: requirements(["Kesimpulan bertentangan dengan angka yang disajikan.", "Angka ada tanpa baseline, definisi, atau konteks.", "Metrik relevan dan konteks dasarnya tersedia.", "Perbandingan data memandu keputusan kampanye.", "Sumber, rumus, definisi, dan perhitungan dapat diaudit."]), insufficientEvidence: "Metrik atau sumber data tidak tersedia.", acceptedEvidence: "Tabel atau angka kampanye beserta sumber, definisi, atau konteks pengambilannya." },
    { id: "marketing_measurable_results", label: "Hasil terukur", weight: 0.3, anchors: anchors(["Bertentangan dengan data", "Vanity metrics", "KPI dasar", "Target dan hasil jelas", "Atribusi transparan"]), anchorRequirements: requirements(["Klaim hasil bertentangan dengan data.", "Hanya vanity metric tanpa KPI hasil.", "KPI dan hasil aktual dasar tersedia.", "Baseline/target, periode, aktual, dan aktivitas jelas.", "Biaya, hasil, atribusi, serta keterbatasan transparan."]), insufficientEvidence: "KPI, baseline, periode, atau hasil aktual tidak tersedia.", acceptedEvidence: "KPI, baseline atau target, periode, hasil aktual, dan kaitan dengan aktivitas kampanye." },
    { id: "marketing_report_quality", label: "Kualitas laporan", weight: 0.2, anchors: anchors(["Tidak dapat dipahami", "Kesimpulan lemah", "Cukup terstruktur", "Data terhubung ke aksi", "Insight mudah diaudit"]), anchorRequirements: requirements(["Metode, data, dan kesimpulan tidak dapat diikuti.", "Struktur ada tetapi kesimpulan tidak didukung.", "Metode, data, kesimpulan, dan tindak lanjut tersedia.", "Data dihubungkan langsung ke keputusan/tindakan.", "Insight, asumsi, limitation, dan tindak lanjut mudah diaudit."]), insufficientEvidence: "Laporan tidak tersedia.", acceptedEvidence: "Laporan studi kasus terstruktur berisi metode, data, kesimpulan, dan tindak lanjut." },
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
