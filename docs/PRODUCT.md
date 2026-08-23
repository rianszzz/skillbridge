# Spesifikasi Produk Prototipe

## 1. Masalah

Mahasiswa tingkat akhir dan lulusan baru sulit mengetahui kesiapan kerja berdasarkan bukti nyata. CV, nilai akademik, dan tes generik tidak cukup menjelaskan kualitas kode, proses desain, atau hasil analisis bisnis.

Skillbridge AI harus menjawab tiga pertanyaan:

1. Apa kemampuan yang terbukti dari karya pengguna?
2. Kesenjangan apa yang paling penting terhadap target karier?
3. Langkah belajar apa yang dapat dilakukan dan dinilai ulang?

## 2. Pengguna Prototipe

Pengguna utama: mahasiswa tingkat akhir atau lulusan baru.

Pengguna memilih:

- status pendidikan;
- bidang: Informatika, DKV, atau Bisnis/Pemasaran;
- target peran;
- bukti kerja yang ingin dinilai.

Pusat karier dan perekrut bukan pengguna prototipe.

## 3. Nilai Utama

Satu siklus lengkap:

```text
onboarding -> kirim bukti -> ekstraksi -> penilaian rubrik
-> gap skill -> rekomendasi -> bukti baru -> penilaian ulang
-> wawancara teks -> umpan balik
```

## 4. Ruang Lingkup Fungsional

### Wajib

- Daftar, masuk, dan keluar.
- Onboarding status, bidang, serta target peran.
- Unggah satu dokumen PDF atau gambar, atau masukkan satu URL repositori GitHub publik.
- Persetujuan eksplisit sebelum bukti diproses LLM pihak ketiga.
- Ekstraksi teks dokumen dan metadata GitHub tanpa menjalankan kode.
- Pemilihan rubrik berdasarkan bidang dan target peran.
- Penilaian per kriteria `0-100`, alasan berbasis bukti, confidence, dan status kecukupan bukti.
- Skor akhir dihitung aplikasi dari bobot rubrik.
- Tampilan kekuatan, gap skill, dan batas penilaian.
- Maksimal tiga rekomendasi dari katalog terkurasi.
- Unggah bukti baru dan penilaian ulang.
- Riwayat skor beserta versi model, prompt, dan rubrik.
- Wawancara teks singkat berdasarkan gap utama.
- Penghapusan bukti dan hasil milik pengguna.

### Boleh Disederhanakan Saat Demo

- Satu bukti per penilaian.
- Satu target peran per bidang pada seed awal.
- Lima pertanyaan per sesi wawancara.
- Katalog materi disimpan di PostgreSQL dan dicari lewat tag, level, serta bidang.
- Pemrosesan sinkron jika tetap selesai di bawah batas waktu demo.

### Tidak Dibangun

- Fitur yang tercantum pada bagian "Bukan Target Prototipe" di `README.md`.
- Crawling Behance dan situs portofolio bebas; risiko SSRF dan kualitas ekstraksi terlalu besar untuk prototipe.
- Klaim bahwa skor memprediksi penerimaan kerja.
- Label "terverifikasi" untuk kompetensi atau kepemilikan karya.

## 5. Alur Pengguna

### Penilaian Pertama

1. Pengguna membuat akun.
2. Pengguna menyelesaikan onboarding.
3. Pengguna membaca persetujuan pemrosesan AI.
4. Pengguna mengirim bukti.
5. Sistem memvalidasi tipe, ukuran, dan sumber bukti.
6. Sistem mengekstrak isi sebagai data tidak tepercaya.
7. Sistem memilih rubrik yang sudah ditetapkan aplikasi.
8. LLM memberi skor per kriteria dan kutipan bukti.
9. Server memvalidasi output dan menghitung skor berbobot.
10. Dasbor menampilkan hasil, keterbatasan, dan rekomendasi.

### Penilaian Ulang

1. Pengguna mempelajari rekomendasi.
2. Pengguna mengirim bukti baru.
3. Sistem memakai versi rubrik yang sama untuk perbandingan.
4. Dasbor menampilkan perubahan per kriteria, bukan skor total saja.

### Wawancara

1. Pengguna memulai sesi kapan pun setelah satu penilaian selesai.
2. Sistem memilih maksimal dua gap utama.
3. Sistem mengajukan lima pertanyaan teks.
4. Sistem memberi feedback terpisah dari skor kesiapan kerja.

## 6. Model Data Minimum

| Entitas | Data penting |
| --- | --- |
| `profiles` | `user_id`, status, bidang, target peran |
| `evidence` | pemilik, tipe, lokasi privat/URL, hash, status, waktu hapus |
| `rubrics` | bidang, target peran, versi, kriteria dan bobot |
| `assessments` | bukti, skor akhir, model, prompt version, rubric version, status |
| `criterion_scores` | kriteria, skor, alasan, kutipan bukti, confidence |
| `learning_resources` | judul, URL, bidang, skill, level, status kurasi |
| `recommendations` | assessment, resource, alasan, urutan |
| `interviews` | assessment, status, waktu mulai/selesai |
| `interview_messages` | sesi, peran, isi, feedback |

Semua tabel milik pengguna wajib memakai Row Level Security. Rubrik dan sumber belajar hanya dapat ditulis admin.

## 7. Arsitektur Minimum

```text
Browser
  |
Next.js pages + API Routes
  |-- Supabase Auth
  |-- Supabase PostgreSQL
  |-- Supabase private Storage
  |-- GitHub REST API
  `-- satu LLM API
```

Tidak ada service terpisah sampai antrean atau beban nyata menuntutnya.

## 8. Ukuran Keberhasilan Prototipe

- Pengguna baru menyelesaikan satu penilaian tanpa bantuan developer.
- Output selalu lolos schema atau gagal dengan pesan aman; tidak ada JSON rusak tersimpan.
- Skor akhir dapat dihitung ulang dari skor kriteria dan bobot.
- Setiap skor memiliki alasan dan referensi ke bukti yang tersedia.
- Data pengguna A tidak dapat dibaca pengguna B.
- Bukti dapat dihapus dari Storage dan database.
- Penilaian sampel menyelesaikan alur demo dalam target 60 detik.
- Minimal 80% rekomendasi pada dataset uji dinilai relevan oleh penilai manusia.
- Selisih skor terhadap median dua penilai manusia dilaporkan; ambang kelulusan ditetapkan sebelum demo, bukan diklaim tanpa data.

## 9. Definisi Prototipe Sempurna

"Sempurna" berarti siap didemonstrasikan, bukan siap produksi:

- seluruh scope wajib berjalan di deployment produksi demo;
- tiga bidang memiliki minimal satu rubrik dan tiga contoh bukti uji;
- happy path dan kegagalan utama sudah diuji;
- tidak ada temuan keamanan kritis;
- hasil AI menyebut keterbatasan dan tidak mengklaim verifikasi kerja;
- demo dapat diulang dengan akun dan data seed baru;
- biaya dan latensi satu demo sudah dicatat;
- keputusan lanjut ke MVP dibuat setelah umpan balik pengguna.

## 10. Gerbang Menuju MVP

MVP belum dirancang detail. Mulai perencanaan MVP hanya jika:

- prototipe lolos definisi selesai;
- minimal lima pengguna sasaran menyelesaikan alur;
- masalah utama yang mereka alami tervalidasi;
- agreement LLM-manusia mencapai ambang yang disepakati;
- biaya per penilaian layak;
- satu bidang menunjukkan nilai lebih kuat daripada dua lainnya atau ketiganya terbukti perlu.

Hasil validasi menentukan scope MVP; proposal awal tidak otomatis menjadi backlog MVP.
