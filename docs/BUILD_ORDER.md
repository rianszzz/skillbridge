# Urutan Pengerjaan 0 sampai Prototipe

Aturan: satu tahap aktif. Exit criteria wajib selesai sebelum pindah tahap.

## Tahap 0 - Bekukan Masalah dan Demo

Hasil:

- Pilih satu target peran untuk setiap bidang.
- Kumpulkan tiga contoh bukti anonim per bidang: lemah, sedang, kuat.
- Tulis skrip demo 5-7 menit.
- Tentukan satu provider dan model LLM berdasarkan kemampuan dokumen/gambar, structured output, biaya, serta kebijakan data.
- Tentukan batas PDF/gambar dan batas repositori.

Exit criteria:

- Tim menyepakati scope pada `docs/PRODUCT.md`.
- Tidak ada fitur baru tanpa mengganti fitur setara.
- Data contoh legal digunakan dan tidak memuat rahasia.

## Tahap 1 - Rubrik dan Ground Truth

Hasil:

- Buat rubrik versi `1.0` untuk tiga target peran.
- Tetapkan bobot berjumlah `1.0` dan anchor skor `0`, `25`, `50`, `75`, `100`.
- Dua penilai manusia memberi skor independen pada seluruh bukti contoh.
- Selesaikan perbedaan dan simpan median sebagai baseline.

Mulai dari Informatika. Salin pola yang terbukti ke DKV dan Bisnis/Pemasaran; jangan membangun tiga alur terpisah.

Exit criteria:

- Semua kriteria dapat dinilai dari bukti yang tersedia.
- Kriteria yang tidak memiliki bukti menghasilkan `insufficient_evidence`, bukan tebakan.
- Baseline manusia lengkap.

## Tahap 2 - Spike AI Tanpa UI

Hasil:

- Jalankan dokumen dan metadata GitHub contoh melalui satu prompt.
- Paksa structured output sesuai kontrak `docs/AI_QUALITY_SECURITY.md`.
- Validasi schema, rentang skor, kutipan bukti, dan bobot di server.
- Catat model, prompt version, latensi, token, biaya, dan hasil.

Exit criteria:

- Semua sampel menghasilkan output valid atau error terkendali.
- Prompt injection pada README/dokumen tidak mengubah rubrik atau instruksi.
- Deviasi dari baseline manusia diketahui dan bisa dijelaskan.
- Model/prompt dibekukan sebagai baseline prototipe.

## Tahap 3 - Fondasi Aplikasi

Hasil:

- Buat satu aplikasi Next.js TypeScript dengan Tailwind CSS.
- Hubungkan Supabase Auth, PostgreSQL, dan private Storage.
- Buat migration untuk model data minimum.
- Terapkan Row Level Security sebelum membuat halaman data pengguna.
- Sediakan environment lokal dan deployment Vercel preview.

Exit criteria:

- Pengguna dapat daftar, masuk, keluar.
- Tes akses membuktikan pengguna tidak dapat membaca data pengguna lain.
- Tidak ada secret di browser atau repository.

## Tahap 4 - Vertical Slice Informatika

Hasil:

- Onboarding.
- Persetujuan AI.
- Input URL GitHub publik.
- Pengambilan metadata terbatas: repository, README, tree, bahasa, dan commit terbaru.
- Penilaian rubrik Informatika.
- Dasbor hasil, gap, dan keterbatasan.

Exit criteria:

- Alur dari akun baru sampai hasil berjalan di deployment.
- Repository privat, URL salah, rate limit, timeout, dan respons LLM rusak ditangani.
- Kode repository tidak pernah dijalankan.

## Tahap 5 - Unggah Dokumen dan Gambar

Hasil:

- Unggah PDF/gambar ke bucket privat.
- Validasi MIME dari isi berkas, ekstensi, dan ukuran.
- Ekstraksi PDF sebagai teks; gambar melalui model multimodal.
- Hapus berkas dan hasil turunannya dari UI.

Exit criteria:

- File salah format/terlalu besar ditolak sebelum dikirim ke LLM.
- Dokumen tanpa teks menghasilkan pesan berguna atau jalur multimodal yang eksplisit.
- Penghapusan benar-benar menghapus object dan record.

## Tahap 6 - Tambahkan DKV dan Bisnis/Pemasaran

Hasil:

- Masukkan rubrik `1.0` dua bidang tersisa.
- Gunakan parser, evaluator, schema, dan halaman hasil yang sama.
- Sesuaikan hanya kriteria, bobot, target peran, dan jenis bukti.

Exit criteria:

- Tiga sampel per bidang dapat dinilai.
- Tidak ada cabang UI terpisah kecuali presentasi bukti memang berbeda.
- Perbandingan LLM-manusia dilaporkan per bidang.

## Tahap 7 - Rekomendasi Belajar

Hasil:

- Kurasi 5-10 materi per bidang.
- Beri tag skill, target peran, level, bahasa, dan URL aktif.
- Ambil maksimal tiga materi berdasarkan gap terbesar dan tag.
- LLM hanya menjelaskan hubungan gap-materi; LLM tidak menciptakan URL.

Exit criteria:

- Semua URL berasal dari katalog.
- Penilai manusia menilai relevansi rekomendasi pada dataset uji.
- Duplikasi dan materi mati tidak muncul.

Jangan tambah vector database sebelum pencarian tag gagal pada ukuran katalog ini.

## Tahap 8 - Penilaian Ulang dan Riwayat

Hasil:

- Pengguna mengirim bukti baru.
- Sistem membandingkan penilaian dengan rubric version sama.
- Dasbor menunjukkan perubahan per kriteria.
- Riwayat menyimpan versi model, prompt, rubrik, dan hash bukti.

Exit criteria:

- Perubahan skor dapat diaudit.
- Hasil dari versi rubrik berbeda tidak ditampilkan sebagai perbandingan langsung tanpa peringatan.
- Retry tidak membuat assessment ganda.

## Tahap 9 - Wawancara Teks

Hasil:

- Pilih maksimal dua gap terbesar.
- Buat lima pertanyaan bertahap.
- Simpan percakapan dan feedback.
- Pisahkan skor wawancara dari skor bukti kerja.

Exit criteria:

- Pengguna dapat menyelesaikan, meninggalkan, dan mengulang sesi.
- Jawaban pengguna tidak dapat mengubah system prompt atau data pengguna lain.
- Feedback menunjuk jawaban pengguna dan rubrik wawancara.

## Tahap 10 - Hardening

Hasil:

- Uji authorization, upload, SSRF, prompt injection, timeout, retry, rate limit, dan penghapusan.
- Tambah batas penggunaan per akun.
- Tambah logging tanpa menyimpan isi sensitif.
- Uji aksesibilitas keyboard, label form, focus state, dan contrast.
- Ukur latensi dan biaya.

Exit criteria:

- Checklist keamanan di `docs/AI_QUALITY_SECURITY.md` lulus.
- Tidak ada bug blocker/critical.
- Error UI memberi jalan pulih.
- Demo tetap bekerja saat satu API gagal melalui data demo yang ditandai jelas, bukan hasil palsu.

## Tahap 11 - Validasi dan Demo Final

Hasil:

- Jalankan seluruh dataset uji yang dibekukan.
- Minta minimal lima pengguna sasaran menjalankan tugas tanpa arahan.
- Catat completion rate, waktu, kesalahan, dan komentar.
- Perbaiki hanya blocker demo, keamanan, dan masalah pemahaman utama.
- Bekukan deployment dan data seed.

Exit criteria:

- Semua syarat "Definisi Prototipe Sempurna" di `docs/PRODUCT.md` terpenuhi.
- Skrip demo berhasil tiga kali berturut-turut.
- Known limitations tampil dalam produk dan catatan demo.
- Keputusan `lanjut`, `ubah`, atau `hentikan` menuju MVP memiliki bukti.

## Urutan Prioritas Saat Waktu Habis

Pertahankan:

1. Auth dan isolasi data.
2. Satu alur penilaian Informatika end-to-end.
3. Rubrik, alasan, dan validasi output.
4. Hapus data.
5. Dataset uji dan demo stabil.

Potong berurutan:

1. Tren visual; tampilkan tabel riwayat.
2. Wawancara adaptif; gunakan lima pertanyaan dari dua gap.
3. Upload gambar DKV; gunakan PDF portofolio.
4. Penilaian ulang otomatis; jalankan sebagai assessment baru.
5. Dua bidang tambahan dari demo live; tampilkan sebagai hasil uji terpisah.

Keamanan, persetujuan, dan validasi tidak boleh dipotong.
