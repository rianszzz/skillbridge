# Bukti Uji Langsung Tiga Bidang

Pengujian dijalankan pada deployment produksi `https://skillbridge-6ndn.vercel.app` tanggal 28 Agustus 2026 memakai sesi Supabase `test-account-1`.

## Hasil

| Bidang | Bukti yang dikirim | Hasil | Result ID |
| --- | --- | ---: | --- |
| Informatika | `https://github.com/octocat/Hello-World` | Bukti belum cukup | `571d7b3f-85dc-485e-9714-1630aa316fd6` |
| DKV | `fixtures/design/strong.png` dan deskripsi proses fixture | 70/100 | `4715bef9-875c-4ece-9a1e-81b40cdb57d6` |
| Pemasaran | `fixtures/marketing/strong.pdf` | 81/100 | `fdd7cba3-5c32-40a8-9817-e08280ef7847` |

## Screenshot

1. `01-informatika-sebelum-submit.png`: form Informatika sebelum submit.
2. `02-informatika-hasil.png`: hasil live Informatika.
3. `03-dkv-sebelum-submit.png`: form DKV berisi file dan deskripsi sebelum submit.
4. `04-dkv-hasil.png`: hasil live DKV.
5. `05-pemasaran-sebelum-submit.png`: form Pemasaran berisi PDF sebelum submit.
6. `06-pemasaran-hasil.png`: hasil live Pemasaran.
7. `07-riwayat-tiga-pengujian.png`: tiga hasil baru tersimpan berurutan pada riwayat akun sama.

## Rekaman

Rekaman browser 32 frame:

```text
/Users/rian/.config/browser-harness/agent-workspace/recordings/skillbridge-live-three-fields
```

Screenshot dan rekaman membuktikan browser mengisi form, mengirim bukti ke deployment produksi, menerima hasil, dan menyimpan tiga assessment pada riwayat akun. Bukti ini tidak membuktikan akurasi skor terhadap HR manusia; itu membutuhkan baseline penilai manusia independen.

## Bukti Verifikasi Prototipe Live (Dokumentasi Poin 10 Proposal)

Verifikasi live capture resolusi tinggi dilaksanakan langsung pada deployment produksi `https://skillbridge-6ndn.vercel.app` menggunakan Playwright Browser Automation untuk melengkapi naskah Poin 10 Proposal:

1. `01_landing_page.png`:
   Halaman beranda (*Landing Page* `/`) menampilkan identitas sistem, nilai proporsi utama (*"Ukur kesiapan. Tunjukkan buktinya"*), alur tiga tahap evaluasi berbasis bukti, tiga jalur target peran (*Junior Web Developer*, *Junior Graphic Designer*, *Junior Digital Marketer*), serta tautan edukasi FAQ dan privasi.
2. `02_form_penilaian_3_bidang.png`:
   Formulir pengajuan penilaian (`/assess`) menampilkan pemilih tiga bidang spesialisasi dengan Rubrik 1.1, input repositori publik GitHub, kotak persetujuan pemrosesan AI (*consent checkbox*), tombol aksi aktif, dan panel panduan bukti (*guidance aside*).
3. `03_hasil_penilaian_kriteria_bukti.png`:
   Halaman hasil penilaian (`/results/00000000-0000-4000-8000-000000000002`) menampilkan skor agregat berbobot (50/100), catatan perbandingan penilaian ulang, banner data seed terverifikasi (*anti-hallucination banner*), serta empat kriteria Rubrik 1.1 lengkap dengan badge selisih (`+25` dan `Baru dinilai`), deskripsi alasan, dan penanda kutipan bukti ter-grounding (`[FILE:1:L12-L28]`, `[FILE:2:L1-L20]`, `[FILE:3:L1-L15]`, `[COMMITS:1]`).
4. `04_rekomendasi_materi_terkurasi.png`:
   Bagian rekomendasi kurasi belajar menampilkan sintesis kekuatan, kesenjangan utama, batasan evaluasi statis, serta tiga kartu rujukan materi pembelajaran terkurasi yang memetakan gap kriteria secara spesifik ke dokumentasi/panduan resmi industri (MDN, Next.js, GitHub) dilengkapi tombol navigasi aksi.
5. `05_riwayat_dan_reassessment_diff.png`:
   Halaman riwayat akun (`/history`) menampilkan jejak kronologis pengujian lintas bidang (Informatika, DKV, Bisnis/Pemasaran) beserta skor berbobot, versi rubrik, dan penanganan bukti tidak cukup (`—/100`), dilengkapi tombol launcher simulasi sidang dengan indikator delta reassessment (`Demo Informatika (50/100 · +25 Δ)`).
6. `06_sesi_wawancara_adaptif.png`:
   Sesi wawancara teknis adaptif interaktif (`/interview/00000000-0000-4000-8000-000000000002`) menampilkan dialog tanya-jawab multi-turn, respon kandidat, umpan balik kontekstual terarah dari AI interviewer berdasarkan kesenjangan bukti, pelacak progres (1/5 jawaban), dan panel fokus sesi.

