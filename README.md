# Skillbridge AI

Platform evaluasi kesiapan kerja berbasis bukti. Pengguna mengirim bukti kerja, sistem menilai dengan rubrik, menunjukkan kesenjangan skill, merekomendasikan materi, lalu menjalankan wawancara teks adaptif.

## Status

Fase: validasi Tahap 1. Implementasi teknis mencapai Tahap 6; baseline dua penilai manusia masih pending.

## Menjalankan

```bash
npm install
cp .env.example .env.local
# isi GROQ_API_KEY
npm run dev
```

Share dan deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Prototipe aktif menilai GitHub, gambar DKV, dan PDF Marketing memakai Groq. Auth, bukti, hasil, dan riwayat disimpan di Supabase. Dataset sintetis berada di `fixtures/`; status validasi berada di `docs/validation/STAGE_STATUS.md`.

## Dokumen Kerja

- [`docs/PRODUCT.md`](docs/PRODUCT.md): masalah, pengguna, ruang lingkup, alur, dan definisi selesai.
- [`docs/BUILD_ORDER.md`](docs/BUILD_ORDER.md): urutan pengerjaan dari tahap 0 sampai prototipe siap demo.
- [`docs/AI_QUALITY_SECURITY.md`](docs/AI_QUALITY_SECURITY.md): kontrak penilaian, rubrik awal, pengujian, privasi, dan keamanan.

Dokumen sumber: [`Proposal Kompres 16.pdf`](Proposal%20Kompres%2016.pdf).

## Keputusan Awal

- Satu aplikasi Next.js dengan API Routes; tidak ada microservice.
- Supabase menangani Auth, PostgreSQL, dan Storage.
- Satu provider LLM dipilih saat implementasi; pergantian provider bukan target prototipe.
- Informatika menjadi vertical slice pertama. DKV serta bisnis/pemasaran memakai alur sama setelah alur pertama stabil.
- RAG prototipe memakai katalog materi kecil dan terkurasi; vector database ditambahkan hanya jika pencarian metadata tidak cukup.
- Prototipe dinyatakan selesai hanya setelah lolos gerbang di `docs/BUILD_ORDER.md`.

## Bukan Target Prototipe

- Pembayaran dan monetisasi.
- Dasbor kampus atau perekrut.
- Integrasi ATS.
- Wawancara suara atau video.
- Eksekusi kode repositori pengguna.
- Verifikasi identitas dan kepemilikan karya tingkat lanjut.
- Pelatihan model ML sendiri.

## Aturan Eksekusi

1. Kerjakan satu tahap aktif dari `docs/BUILD_ORDER.md`.
2. Jangan mulai tahap berikutnya sebelum exit criteria tahap aktif terpenuhi.
3. Catat perubahan ruang lingkup langsung di `docs/PRODUCT.md`.
4. Catat perubahan rubrik, prompt, model, dan dataset uji di `docs/AI_QUALITY_SECURITY.md`.
5. MVP baru direncanakan setelah prototipe lolos seluruh gerbang.
