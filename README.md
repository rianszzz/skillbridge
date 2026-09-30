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
