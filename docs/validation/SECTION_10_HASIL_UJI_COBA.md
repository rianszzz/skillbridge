# 10. Hasil Uji Coba

Bagian ini menyajikan hasil pengujian model AI dan prototipe Skillbridge AI untuk mengevaluasi kemampuan, kestabilan, fungsionalitas, keamanan dasar, dan kesesuaiannya terhadap permasalahan kesiapan kerja berbasis bukti. Pengujian dilaksanakan pada 24 Agustus 2026 terhadap deployment produksi `https://skillbridge-6ndn.vercel.app` dengan data sintetis. Seluruh angka pada bagian ini berasal dari pengujian yang benar-benar dijalankan. Hasil belum boleh ditafsirkan sebagai bukti bahwa model setara dengan penilai ahli karena baseline dua penilai manusia belum selesai.

## 10.1 Metode Pengujian

Pengujian dibagi menjadi empat kelompok:

1. **Pengujian struktural**, untuk memeriksa integritas dataset, konsistensi rubrik, perhitungan skor berbobot, validasi tipe file, URL GitHub, dan pemetaan pesan autentikasi.
2. **Pengujian model AI**, untuk mengukur keberhasilan respons terstruktur, kecukupan bukti, kestabilan tiga pengulangan, dan latensi end-to-end.
3. **Pengujian prototipe**, untuk memeriksa autentikasi, navigasi, tiga jenis bukti, persistence Supabase, riwayat, rekomendasi, wawancara, isolasi data, dan penghapusan.
4. **Pengujian antarmuka**, untuk memeriksa responsivitas desktop/mobile, struktur semantik dasar, label form, state autentikasi, dan overflow horizontal.

Model evaluator menggunakan Groq `openai/gpt-oss-20b` dengan temperature `0` dan strict JSON schema. Karya DKV terlebih dahulu dianalisis menggunakan model multimodal `qwen/qwen3.6-27b`, kemudian observasi visual dinilai oleh evaluator teks. Rubrik yang digunakan adalah versi `1.0`. Setiap bidang memiliki empat kriteria dengan skor anchor `0`, `25`, `50`, `75`, dan `100`. Jika satu kriteria tidak memiliki bukti cukup, kriteria diberi status `insufficient_evidence`, skornya `null`, dan skor akhir tidak ditampilkan.

Skor akhir dihitung aplikasi dengan persamaan:

```text
Skor akhir = Σ(skor kriteria × bobot kriteria)
```

Model tidak diperbolehkan menentukan skor akhir. Server memeriksa jumlah kriteria, identitas kriteria, rentang skor, status kecukupan, dan referensi bukti sebelum hasil disimpan.

## 10.2 Data dan Skenario Pengujian

Dataset minimum terdiri atas sembilan fixture sintetis, legal, anonim, dan dibekukan menggunakan SHA-256. Distribusinya sebagai berikut:

| Bidang | Target peran | Sampel | Bentuk bukti |
| --- | --- | ---: | --- |
| Informatika | Junior Web Developer | 3 | Kode, struktur proyek, README, dan riwayat commit |
| DKV | Junior Graphic Designer | 3 | PNG hasil karya dan deskripsi brief/proses |
| Bisnis/Pemasaran | Junior Digital Marketer | 3 | PDF laporan dengan text layer dan data sintetis |
| **Total** |  | **9** | Tiga struktur bukti berbeda |

Manifest memuat 21 artefak utama. Verifikasi ulang menghasilkan 21 dari 21 hash cocok. Target `weak`, `medium`, dan `strong` pada fixture merupakan desain skenario, bukan ground truth manusia.

Skenario model produksi terdiri atas 13 assessment live:

- tiga pengulangan satu repositori Informatika publik;
- DKV lemah satu run, DKV sedang tiga run, dan DKV kuat satu run;
- Marketing lemah satu run, Marketing sedang tiga run, dan Marketing kuat satu run.

Skenario prototipe mencakup autentikasi anonim dan login, direct route protection, pilihan tiga bidang, validasi consent, file palsu, file lebih dari 4 MB, cross-account access, RLS, private Storage, interview, riwayat, dan delete cascade.

## 10.3 Metrik Evaluasi

| Aspek | Metrik |
| --- | --- |
| Integritas data | Jumlah hash cocok terhadap manifest |
| Kepatuhan output | HTTP sukses, empat kriteria, skor anchor valid, referensi bukti tersedia |
| Kecukupan bukti | Jumlah hasil `sufficient` dan `insufficient_evidence` |
| Stabilitas | Konsistensi status dan skor pada tiga input identik |
| Efisiensi | Minimum, median, persentil ke-95, maksimum latensi end-to-end |
| Fungsionalitas | Jumlah skenario prototipe lulus/gagal |
| Keamanan dasar | HTTP authorization, cross-account isolation, RLS, bucket privacy, residual data |
| Responsivitas | Overflow horizontal pada desktop, 390 px, dan 320 px |
| Relevansi sumber | Status HTTP 12 URL katalog belajar |

Metrik akurasi, MAE, precision, recall, F1, dan agreement terhadap manusia belum dihitung karena `HUMAN_RATINGS.csv` masih memiliki 0 dari 36 baseline kriteria yang selesai.

## 10.4 Hasil Pengujian Struktural

| Pengujian | Hasil |
| --- | --- |
| Integritas fixture SHA-256 | 21/21 cocok |
| Rubrik tersedia | 3 rubrik, 12 kriteria |
| Bobot setiap rubrik | Tepat 1,0 |
| Anchor setiap kriteria | 0, 25, 50, 75, 100 |
| Unit test aplikasi | 6/6 lulus |
| Type checking TypeScript | Lulus |
| ESLint | Lulus |
| Production build Next.js | Lulus |
| Audit dependency | 0 kerentanan high/critical |

Hasil tersebut menunjukkan bahwa struktur rubrik, perhitungan skor, parser URL GitHub, magic-byte file, pemilihan tipe bukti, dan pemetaan error autentikasi telah memiliki pemeriksaan otomatis. Hasil ini belum mengukur ketepatan penilaian AI terhadap manusia.

## 10.5 Hasil Pengujian Model AI

### 10.5.1 Keberhasilan dan Latensi

Pada batch awal, 11 dari 13 assessment menghasilkan HTTP 200 atau tingkat keberhasilan 84,62%. Dua kegagalan terjadi pada sampel Marketing sedang karena model menghasilkan array tujuh elemen, sementara schema mewajibkan tepat empat object kriteria. Sistem menolak output tersebut dan tidak menyimpan assessment selesai.

Setelah ditambahkan satu retry terkontrol untuk pelanggaran schema dan pesan error generik, sampel Marketing sedang diuji ulang tiga kali. Dua run berhasil dan satu run gagal aman dengan HTTP 502. Dengan demikian, provider masih menunjukkan variasi schema pada sampel tersebut; retry mengurangi tetapi belum menghilangkan kegagalan.

Statistik latensi 11 assessment HTTP 200 pada batch awal:

| Metrik | Latensi |
| --- | ---: |
| Minimum | 3,359 detik |
| Median | 18,124 detik |
| Persentil ke-95 | 34,712 detik |
| Maksimum | 34,712 detik |
| Selesai di bawah 60 detik | 11/11 |

```text
Keberhasilan batch awal
HTTP 200  █████████████████ 84,62% (11)
HTTP 502  ███               15,38% (2)
```

### 10.5.2 Kecukupan Bukti

Dari 11 hasil HTTP 200 pada batch awal, tiga assessment berstatus `sufficient` dan delapan berstatus `insufficient_evidence`. Distribusi ini menunjukkan model cenderung konservatif pada bukti minimal, tetapi belum dapat disebut benar atau salah tanpa baseline manusia.

| Sampel | Hasil utama |
| --- | --- |
| Informatika `octocat/Hello-World`, 3 run | Ketiga run konsisten `insufficient_evidence`; riwayat kontribusi diberi skor 25, kriteria lain tidak cukup |
| DKV lemah | Konsistensi visual skor 0; proses dan problem solving tidak cukup |
| DKV sedang, 3 run | Tidak stabil: dua run `insufficient_evidence`, satu run sufficient dengan skor akhir 58 |
| DKV kuat | Sufficient; seluruh kriteria 75; skor akhir 75 |
| Marketing lemah | Seluruh kriteria `insufficient_evidence` |
| Marketing sedang, batch awal | Dua schema failure; satu hasil `insufficient_evidence` |
| Marketing kuat | Sufficient; seluruh kriteria 75; skor akhir 75 |

Temuan DKV sedang merupakan limitation utama. Walaupun temperature `0`, status kecukupan berubah pada input identik. Ini membuktikan bahwa temperature rendah tidak menjamin determinisme provider.

### 10.5.3 Validitas Output dan Referensi Bukti

Seluruh hasil HTTP 200 memuat empat kriteria yang sesuai bidang. Skor non-null hanya menggunakan anchor yang diizinkan. Hasil sufficient memiliki referensi bukti yang berasal dari allowlist, seperti `REPOSITORY`, `FILES`, `COMMITS`, `README`, `[IMAGE:1]`, `[DESCRIPTION:1]`, atau `[PAGE:1]`. Dua output schema-invalid ditolak sebelum persistence, sehingga sistem gagal aman.

### 10.5.4 Perbandingan dengan Manusia

Validasi human-in-the-loop belum selesai. Template berisi 36 baris kriteria, tetapi R1 dan R2 belum memberikan skor, alasan, serta referensi. Karena itu, laporan ini tidak menyatakan akurasi model, kesetaraan dengan ahli, MAE, F1, atau agreement. Klaim yang dapat dibuat hanya bahwa keluaran model telah diuji secara fungsional dan variasinya telah diukur pada dataset sintetis terbatas.

## 10.6 Hasil Pengujian Prototipe

Deployment produksi diuji pada `https://skillbridge-6ndn.vercel.app`.

| Skenario | Hasil |
| --- | --- |
| Health endpoint dan koneksi Supabase | HTTP 200, `checks.supabase=true` |
| API assessment tanpa token | HTTP 401 |
| API assessment dengan token acak | HTTP 401 |
| Login email/password | Berhasil, redirect ke `/assess` |
| Navbar pengguna anonim | Hanya `Daftar` dan `Masuk` |
| Direct `/assess` tanpa login | Redirect ke `/auth?next=/assess` |
| Navbar pengguna login | `Penilaian`, `Riwayat`, `Keluar` |
| Consent tidak dicentang | HTTP 400, model tidak dipanggil |
| File dengan ekstensi PDF tetapi magic bytes SVG | HTTP 400 |
| File PNG 4 MB + 1 byte | HTTP 400, tanpa residual row |
| Akun pemilik membaca evidence | 13 row uji terlihat |
| Akun kedua membaca evidence pemilik | 0 row |
| Akun kedua membuka assessment ID pemilik | Array kosong, data tidak bocor |
| Akun kedua memulai interview assessment pemilik | HTTP 404 |
| Bucket evidence | Private, batas 4.194.304 byte |
| Interview assessment sendiri | HTTP 200, 2,361 detik |
| Delete assessment upload | HTTP 204 |
| Residual setelah delete | 0 assessment, 0 evidence, 0 score, 0 object Storage |
| Cache respons privat setelah perbaikan | `Cache-Control: private, no-store` |

Pengujian memperlihatkan bahwa authentication, ownership check, RLS read isolation, private Storage, dan delete cascade bekerja pada data sintetis. Namun operasi database server menggunakan service-role client sehingga RLS bukan satu-satunya boundary; filter ownership aplikasi tetap kritis.

## 10.7 Hasil Pengujian Antarmuka

Pengujian browser dilakukan memakai Chromium pada desktop dan mobile.

| Pemeriksaan | Hasil |
| --- | --- |
| Landing desktop | Satu `main`, heading benar, tiga kartu bidang, tanpa overflow |
| Bahasa dokumen | `lang="id"` |
| Navbar anonim | `Daftar`, `Masuk` |
| Auth gate | Form assessment tidak tampil sebelum login |
| Form Informatika | URL GitHub, tanpa file input |
| Form DKV | PNG/JPEG, deskripsi proses, tanpa URL GitHub |
| Form Marketing | PDF, 4 MB, 15 halaman |
| Mobile 390 px | Tidak ada horizontal overflow |
| Mobile 320 px sebelum perbaikan | Overflow sekitar 10 px pada navbar login |
| Mobile 320 px setelah perbaikan | Lulus; lebar viewport dan scroll width sama-sama 320 px |
| History | 13 item uji tampil, tanpa overflow desktop |
| Result | Empat kriteria, batas klaim, interview, reassess, delete |

Rekaman interaksi production tersimpan pada:

```text
/Users/rian/.config/browser-harness/agent-workspace/recordings/skillbridge-proposal-comprehensive
```

## 10.8 Hasil Pengujian Rekomendasi

Katalog saat ini merupakan mapping deterministik, bukan RAG berbasis embedding. Setiap satu dari 12 kriteria memiliki satu sumber belajar terpetakan. Pemeriksaan HTTP awal menemukan 11 URL aktif dan satu URL `404`. URL tersebut diganti dengan sumber Nielsen Norman Group yang aktif. Setelah perbaikan, seluruh 12 kriteria memiliki URL katalog yang terpetakan, tetapi relevansi pedagogis belum dinilai oleh dua manusia. Target relevansi 80% masih merupakan acceptance criterion, bukan hasil.

## 10.9 Kelebihan Solusi

1. Sistem menerima tiga bentuk bukti berbeda: repositori GitHub, karya visual, dan laporan PDF.
2. Penilaian menggunakan rubrik khusus bidang dan bukti tidak cukup tidak dipaksa menjadi skor nol.
3. Skor akhir dihitung server, bukan dipercaya dari satu angka keluaran model.
4. Strict schema dan validasi referensi mencegah banyak keluaran tidak konsisten tersimpan.
5. Output schema-invalid gagal aman dan tidak menjadi assessment selesai.
6. Data pengguna terisolasi melalui authentication, ownership filter, RLS, dan private Storage.
7. File diperiksa dari magic bytes, bukan hanya ekstensi atau MIME browser.
8. Kode GitHub tidak dijalankan sehingga risiko eksekusi kode pengguna berkurang.
9. Penghapusan assessment menghapus row turunan dan object Storage pada skenario normal.
10. UI adaptif mengikuti jenis bukti tiap bidang dan bekerja pada desktop serta mobile utama.

## 10.10 Keterbatasan

1. Dataset hanya sembilan fixture sintetis dan belum mewakili populasi mahasiswa Indonesia.
2. Baseline dua penilai manusia belum selesai, sehingga akurasi dan agreement belum dapat dihitung.
3. Run resmi sembilan sampel × tiga pengulangan belum lengkap. Pengujian saat ini merupakan batch produksi terbatas 13 assessment.
4. DKV sedang menunjukkan perubahan status kecukupan pada input identik.
5. Marketing sedang masih mengalami satu kegagalan schema setelah retry.
6. Token usage dan biaya provider belum dicatat oleh aplikasi.
7. Informatika belum diuji memakai tiga repository fixture weak/medium/strong karena fixture lokal belum dipublikasikan sebagai GitHub repository.
8. Parser PDF hanya menerima text layer; OCR untuk dokumen scan belum tersedia.
9. Sistem menilai isi bukti tetapi tidak memverifikasi identitas atau kepemilikan karya.
10. Kode repository tidak dijalankan; perilaku runtime tidak dinilai.
11. Rekomendasi masih katalog statis, belum retrieval semantik atau RAG berbasis embedding.
12. Relevansi rekomendasi belum dinilai manusia.
13. Wawancara belum disimpan lintas refresh; sesi masih berada dalam state browser.
14. Rate limit dan idempotency assessment belum tersedia.
15. Delete normal telah diuji, tetapi partial failure antara Storage dan database belum diuji dengan fault injection.
16. Pengujian Firefox, WebKit, automated WCAG scanner, contrast ratio, dan keyboard penuh belum dilakukan.

## 10.11 Kesimpulan Pengujian

Pengujian menunjukkan bahwa prototipe Skillbridge AI telah mampu menjalankan alur utama secara end-to-end pada tiga bidang, memvalidasi bukti, menghasilkan penilaian terstruktur, menyimpan riwayat, menjaga isolasi data, dan menghapus hasil. Semua hasil HTTP 200 batch awal selesai di bawah target 60 detik. Namun kestabilan model belum memenuhi syarat final karena terdapat perubahan kecukupan pada DKV sedang dan kegagalan schema pada Marketing sedang. Validasi manusia juga belum tersedia. Oleh karena itu, status yang tepat adalah **prototipe fungsional dan layak didemonstrasikan secara terbatas, tetapi belum tervalidasi untuk klaim akurasi atau kesetaraan dengan penilai manusia**.

Hasil penilaian harus tetap disertai pernyataan:

> Penilaian indikatif berdasarkan bukti yang dikirim dan rubrik Skillbridge AI. Hasil bukan verifikasi identitas, kepemilikan karya, kompetensi profesional, atau jaminan diterima kerja.
