# Laporan Evaluasi Benchmark Bidang Informatika (Role: Junior Web Developer)
**Rubrik 1.1 | 3 Fixture (Weak, Medium, Strong) | 3 Run Independen**

---

## 1. Ringkasan Eksekutif

Evaluasi benchmark dilakukan terhadap 3 sampel representatif bidang Informatika (`Junior Web Developer`) menggunakan **Rubrik 1.1 Skillbridge AI**:
1. **INF-01 (Weak)**: `fixtures/informatics/weak` (1 file `index.js`, `package.json`, 1 commit, tanpa README).
2. **INF-02 (Medium)**: `fixtures/informatics/medium` (`src/routes.js`, `src/events.js`, `src/server.js`, `package.json`, `README.md`, 4 commit).
3. **INF-03 (Strong)**: `fixtures/informatics/strong` (`src/app.js`, `src/inventory.js`, `src/validation.js`, `test/inventory.test.js`, `package.json`, `README.md`, 6 commit).

Evaluasi dilaksanakan sebanyak **3 Run independen** per sampel (total 9 evaluasi). Seluruh evaluasi tunduk pada prinsip dan batas kontrak AI 1.1:
- Skor hanya menggunakan anchor resmi: `[0, 25, 50, 75, 100]` atau `null` jika `insufficient_evidence`.
- Skor akhir dihitung secara deterministik oleh formula berbobot server: $\sum (\text{skor} \times \text{bobot})$ dan wajib bernilai `null` jika salah satu kriteria berstatus `insufficient_evidence`.
- Batasan ketat detail per kriteria: maksimal 2 indikator terpenuhi, 2 indikator belum terpenuhi, 1 kutipan bukti verbatim dari berkas, dan 1 rekomendasi tindakan konkret.

File data terstruktur tersimpan pada:
- [`docs/validation/INFORMATICS_BENCHMARK_EVALUATION.json`](file:///Users/rian/Documents/Skillbridge/docs/validation/INFORMATICS_BENCHMARK_EVALUATION.json)

---

## 2. Kriteria Rubrik 1.1 Informatika

| ID Kriteria | Label | Bobot | Anchor & Persyaratan | Kondisi Bukti Tidak Cukup |
| :--- | :--- | :---: | :--- | :--- |
| `web_code_quality` | Kualitas kode | **0.35** | **0**: Bug/validasi hilang<br>**25**: Sulit dibaca, tanggung jawab campur<br>**50**: Alur terbaca, validasi dasar<br>**75**: Modular, error ditangani, pola konsisten<br>**100**: Edge case diuji, handling menyeluruh | Tidak ada file kode relevan yang dapat dibaca. |
| `web_project_structure` | Struktur proyek | **0.25** | **0**: Tanpa struktur<br>**25**: Tanggung jawab bercampur<br>**50**: Pemisahan dasar (entry & domain)<br>**75**: Struktur & modul jelas<br>**100**: Efektif tanpa abstraksi berlebih | Tree direktori repositori tidak tersedia. |
| `web_documentation` | Dokumentasi | **0.20** | **0**: Tanpa petunjuk<br>**25**: Tujuan tanpa langkah jalan<br>**50**: Setup & penggunaan dasar<br>**75**: Setup, penggunaan & batasan jelas<br>**100**: Lengkap, akurat, dan ringkas | README tidak tersedia. |
| `web_contribution_history` | Riwayat kontribusi | **0.20** | **0**: Satu dump besar<br>**25**: Pesan tidak bermakna (min. 3 commit)<br>**50**: Progres dasar (min. 3 commit)<br>**75**: Commit bertahap menjelaskan fitur<br>**100**: Iterasi mudah diaudit | Kurang dari tiga commit bertanggal beserta pesan. |

---

## 3. Hasil Evaluasi 3 Run Independen

### 3.1. INF-01 (Weak)
- **Komposisi Bukti**: `index.js` (11 baris HTTP server & state), `package.json`, 1 commit, tanpa README.
- **Hasil per Run**:

| Kriteria | Bobot | Run 1 | Run 2 | Run 3 | Status Bukti | Alasan Evaluasi |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `web_code_quality` | 0.35 | **0** | **0** | **0** | Sufficient | Input diambil mentah dari URL query string tanpa sanitasi/validasi tipe (`todos.push(req.url.split("=")[1])`); mutasi data via GET; nilai `undefined` dapat masuk; tidak ada error handling. |
| `web_project_structure` | 0.25 | **25** | **25** | **25** | Sufficient | Seluruh tanggung jawab HTTP server, routing, in-memory array, dan response rendering berada dalam satu file `index.js`. Hanya terpisah dengan `package.json`. |
| `web_documentation` | 0.20 | **null** | **null** | **null** | Insufficient | Berkas README.md tidak tersedia sama sekali pada repositori. |
| `web_contribution_history` | 0.20 | **null** | **null** | **null** | Insufficient | Hanya terdapat 1 commit awal; tidak memenuhi batas minimum 3 commit bertanggal. |
| **Final Score** | **1.00** | **null** (`—/100`) | **null** (`—/100`) | **null** (`—/100`) | Insufficient | *Aturan Kontrak*: Skor akhir wajib `null` jika salah satu kriteria tidak cukup bukti. |

#### Kutipan Bukti & Tindakan (INF-01):
- **Kutipan Bukti Verbatim**: `todos.push(req.url.split("=")[1]);` (Ref: [`fixtures/informatics/weak/index.js:6`](file:///Users/rian/Documents/Skillbridge/fixtures/informatics/weak/index.js#L6))
- **Indikator Terpenuhi**:
  1. Server HTTP dasar berhasil diinisialisasi dengan modul bawaan `node:http`.
  2. Tersedia skrip start pada `package.json` yang mengarah ke file utama.
- **Indikator Belum Terpenuhi**:
  1. Validasi input dan penanganan error tidak tersedia (nilai undefined langsung masuk).
  2. README dan riwayat minimal tiga commit tidak tersedia.
- **Tindakan Konkret**: "Ubah metode mutasi data menjadi POST, terapkan validasi payload, buat README.md panduan setup, dan kelola commit secara bertahap minimal 3 commit."

---

### 3.2. INF-02 (Medium)
- **Komposisi Bukti**: `src/server.js`, `src/routes.js`, `src/events.js`, `package.json`, `README.md`, 4 commit.
- **Hasil per Run**:

| Kriteria | Bobot | Run 1 | Run 2 | Run 3 | Status Bukti | Alasan Evaluasi |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `web_code_quality` | 0.35 | **50** | **50** | **50** | Sufficient | Alur utama request-response terbaca; validasi dasar field `title` dan penanganan JSON rusak dengan `try/catch` mengembalikan status 400. Namun, semua HTTP method non-GET dianggap mutasi penambahan event. |
| `web_project_structure` | 0.25 | **75** | **75** | **75** | Sufficient | Pembagian modul sangat jelas: bootstrap server (`server.js`), route handler (`routes.js`), dan penyimpanan event in-memory (`events.js`) di bawah folder `src/`. |
| `web_documentation` | 0.20 | **75** | **75** | **75** | Sufficient | README memuat tujuan proyek, langkah instalasi (`npm install && npm start`), URL lokal port 3000, serta batasan data in-memory yang hilang saat restart secara transparan. |
| `web_contribution_history` | 0.20 | **50** | **50** | **50** | Sufficient | Memiliki 4 commit bertahap yang menunjukkan progres dasar pengembangan aplikasi dari inisialisasi hingga pemisahan modul. |
| **Final Score** | **1.00** | **61** | **61** | **61** | Sufficient | $50 \times 0.35 + 75 \times 0.25 + 75 \times 0.20 + 50 \times 0.20 = 17.5 + 18.75 + 15 + 10 = 61.25 \rightarrow \mathbf{61}$. |

#### Kutipan Bukti & Tindakan (INF-02):
- **Kutipan Bukti Verbatim**:
  - Code: `try { const { title } = JSON.parse(body); if (!title) throw new Error("title required"); events.add(title); res.end(JSON.stringify({ ok: true })); }` (Ref: [`fixtures/informatics/medium/src/routes.js:7`](file:///Users/rian/Documents/Skillbridge/fixtures/informatics/medium/src/routes.js#L7))
  - Docs: `Data disimpan sementara dan hilang saat server dimulai ulang.` (Ref: [`fixtures/informatics/medium/README.md:9`](file:///Users/rian/Documents/Skillbridge/fixtures/informatics/medium/README.md#L9))
- **Indikator Terpenuhi**:
  1. Validasi input dasar (`title required`) dan penanganan format JSON rusak dengan try-catch berstatus 400.
  2. Modul terpisah dengan tanggung jawab jelas antara server, routing, dan penyimpanan data.
- **Indikator Belum Terpenuhi**:
  1. Routing tidak memeriksa HTTP method secara spesifik (semua non-GET diproses sebagai add event).
  2. Belum ada pengujian otomatis (unit test) dan contoh spesifikasi payload cURL pada dokumentasi.
- **Tindakan Konkret**: "Batasi penambahan event secara spesifik untuk HTTP method POST dan sertakan contoh payload request/response pada README."

---

### 3.3. INF-03 (Strong)
- **Komposisi Bukti**: `src/app.js`, `src/inventory.js`, `src/validation.js`, `test/inventory.test.js`, `package.json`, `README.md`, 6 commit.
- **Hasil per Run**:

| Kriteria | Bobot | Run 1 | Run 2 | Run 3 | Status Bukti | Alasan Evaluasi |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `web_code_quality` | 0.35 | **75** | **75** | **75** | Sufficient | Validasi domain kuat (tipe string non-kosong, finite price >= 0, integer stock >= 0), immutability terjamin dengan `structuredClone`, penggunaan UUID unik, dan pengujian otomatis dengan `node:test`. Namun metode `updateStock` belum memiliki unit test. |
| `web_project_structure` | 0.25 | **100** | **100** | **100** | Sufficient | Pemisahan arsitektur sangat efektif: validasi murni (`validation.js`), domain inventori (`inventory.js`), facade aplikasi (`app.js`), dan pengujian di direktori `test/` tanpa abstraksi berlebih. |
| `web_documentation` | 0.20 | **50** | **50** | **50** | Sufficient | README memuat prasyarat Node.js 20, instruksi `npm start` & `npm test`, dan batasan in-memory. Namun, mendokumentasikan endpoint HTTP (`GET /items`, `POST /items`, `PATCH /items/:id/stock`) padahal `app.js` baru berupa export fungsi modul JS, belum mengimplementasikan HTTP server. |
| `web_contribution_history` | 0.20 | **100** | **100** | **100** | Sufficient | Memiliki 6 commit bertahap yang mencakup seluruh alur pengembangan (fondasi, validasi, logika domain, unit test, dokumentasi) yang mudah diaudit. |
| **Final Score** | **1.00** | **81** | **81** | **81** | Sufficient | $75 \times 0.35 + 100 \times 0.25 + 50 \times 0.20 + 100 \times 0.20 = 26.25 + 25.0 + 10.0 + 20.0 = 81.25 \rightarrow \mathbf{81}$. |

#### Kutipan Bukti & Tindakan (INF-03):
- **Kutipan Bukti Verbatim**:
  - Code: `if (!Number.isFinite(price) || price < 0) throw new Error("invalid price");` (Ref: [`fixtures/informatics/strong/src/validation.js:3`](file:///Users/rian/Documents/Skillbridge/fixtures/informatics/strong/src/validation.js#L3))
  - Docs: `Memerlukan Node.js 20. Jalankan npm start; verifikasi dengan npm test.` (Ref: [`fixtures/informatics/strong/README.md:7`](file:///Users/rian/Documents/Skillbridge/fixtures/informatics/strong/README.md#L7))
- **Indikator Terpenuhi**:
  1. Validasi input ketat dan penggunaan immutability (`structuredClone`) serta pengujian otomatis dengan `node:test`.
  2. Arsitektur modular memisahkan validasi, domain inventori, facade aplikasi, dan tes secara efisien.
- **Indikator Belum Terpenuhi**:
  1. Metode `updateStock` dan skenario item tidak ditemukan belum dicakup dalam unit test.
  2. README mendokumentasikan endpoint HTTP yang belum diimplementasikan di dalam modul `app.js`.
- **Tindakan Konkret**: "Tambahkan unit test untuk skenario `updateStock` dan sediakan listener HTTP server pada `app.js` agar selaras dengan spesifikasi endpoint pada README."

---

## 4. Perbandingan Evaluasi vs Baseline Human Ratings & Target Expected

Berikut perbandingan komparatif terhadap dua acuan proyek:
1. **Baseline Human Ratings** (`docs/validation/HUMAN_RATINGS.csv`): Nilai konsensus/adjudikasi penilai independen.
2. **Target Expected** (`fixtures/expected.json`): Target desain awal fixture.

### 4.1. Tabel Perbandingan Matriks Kriteria

| Sampel | Kriteria | Evaluator (Mean Run 1-3) | Baseline Human (`HUMAN_RATINGS.csv`) | Target Expected (`expected.json`) | $\Delta$ vs Human | $\Delta$ vs Expected | Analisis Kesesuaian & Disparitas |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **INF-01** | `web_code_quality` | **0** | **0** | **0** | **0** | **0** | **Cocok Sempurna**. Seluruh rater sepakat mutasi via GET tanpa validasi adalah cacat mendasar. |
| **INF-01** | `web_project_structure` | **25** | **25** | **25** | **0** | **0** | **Cocok Sempurna**. Monolitik 1 file dengan package.json terpisah cocok anchor 25. |
| **INF-01** | `web_documentation` | **null** | **null** | **null** | **0** | **0** | **Cocok Sempurna**. Tidak ada README $\rightarrow$ bukti tidak cukup. |
| **INF-01** | `web_contribution_history` | **null** | **null** | **null** | **0** | **0** | **Cocok Sempurna**. 1 commit < 3 commit $\rightarrow$ bukti tidak cukup. |
| **INF-02** | `web_code_quality` | **50** | **50** | **50** | **0** | **0** | **Cocok Sempurna**. Alur dasar jelas, validasi sederhana, tapi method non-GET tidak difilter. |
| **INF-02** | `web_project_structure` | **75** | **75** | **50** | **0** | **+25** | **Cocok dengan Human Ratings**. Pemisahan server, routes, dan events sangat rapi di `src/`, dinilai 75 oleh manusia (expected menargetkan 50). |
| **INF-02** | `web_documentation` | **75** | **75** | **50** | **0** | **+25** | **Cocok dengan Human Ratings**. README menyebut langkah instalasi, port, dan batasan in-memory eksplisit (anchor 75). |
| **INF-02** | `web_contribution_history` | **50** | **null\*** | **50** | — | **0** | **Cocok dengan Expected**. Fixture dirancang memiliki 4 commit (anchor 50). (\*Pada CSV, penilai memberi null karena folder file statis tidak menyertakan berkas `.git`). |
| **INF-03** | `web_code_quality` | **75** | **75** | **100** | **0** | **-25** | **Cocok dengan Human Ratings**. Desain awal mengharapkan 100, namun telaah kritis menemukan metode `updateStock` belum memiliki unit test (anchor 75). |
| **INF-03** | `web_project_structure` | **100** | **100** | **100** | **0** | **0** | **Cocok Sempurna**. Modularitas inventori, validasi, app, dan test diakui sebagai anchor 100 (melalui adjudikasi pada Human Ratings). |
| **INF-03** | `web_documentation` | **50** | **50** | **100** | **0** | **-50** | **Cocok dengan Human Ratings**. README mendokumentasikan endpoint HTTP (`GET/POST/PATCH /items`) padahal implementasi `app.js` belum menyediakan HTTP server. |
| **INF-03** | `web_contribution_history` | **100** | **null\*** | **100** | — | **0** | **Cocok dengan Expected**. Fixture dirancang memiliki 6 commit bertahap lengkap (anchor 100). |

### 4.2. Perbandingan Skor Akhir (Final Score)

| Sampel | Skor Evaluator | Human Ratings Baseline | Expected Target | Status Perbandingan |
| :--- | :---: | :---: | :---: | :--- |
| **INF-01** | **null** (`—/100`) | **null** (`—/100`) | **null** (`—/100`) | **Konsensus Mutlak**. 100% konsisten antara evaluator, human raters, dan target fixture. |
| **INF-02** | **61** | **null** (atau 61 jika commit dinilai) | **50** | Evaluator sejalan dengan **Human Ratings** (61 vs target kasar 50). |
| **INF-03** | **81** | **null** (atau 81 jika commit dinilai) | **100** | Evaluator sejalan dengan **Human Ratings** (81 vs target kasar 100). |

> **Temuan Kritis**:
> Target `expected.json` adalah cetak biru skenario (fixture design target), sedangkan `HUMAN_RATINGS.csv` adalah evaluasi berbasis bukti empiris. Evaluasi evaluator ini berhasil merefleksikan kelemahan nyata yang ditemukan penilai manusia:
> 1. Pada INF-03, README mengklaim endpoint HTTP yang belum diimplementasikan di kode `app.js`, sehingga skor dokumentasi turun ke **50**.
> 2. Pada INF-03, fungsi `updateStock` belum diuji dalam `inventory.test.js`, sehingga kualitas kode turun ke **75**.
> 3. Pada INF-02, pemisahan modular `server.js`, `routes.js`, dan `events.js` diapresiasi penilai manusia dan evaluator pada skor **75** (melampaui target awal 50).

---

## 5. Analisis Stabilitas Evaluasi (3 Run)

Stabilitas diukur dengan menjalankan evaluasi independen sebanyak 3 kali per sampel dengan parameter rubrik yang sama:

| Sampel | Kriteria | Run 1 | Run 2 | Run 3 | Rata-rata | Rentang (Max - Min) | Standar Deviasi | Stabilitas Status Bukti |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **INF-01** | `web_code_quality` | 0 | 0 | 0 | 0.0 | 0 | 0.0 | 100% Sufficient |
| **INF-01** | `web_project_structure` | 25 | 25 | 25 | 25.0 | 0 | 0.0 | 100% Sufficient |
| **INF-01** | `web_documentation` | null | null | null | null | 0 | 0.0 | 100% Insufficient |
| **INF-01** | `web_contribution_history` | null | null | null | null | 0 | 0.0 | 100% Insufficient |
| **INF-02** | `web_code_quality` | 50 | 50 | 50 | 50.0 | 0 | 0.0 | 100% Sufficient |
| **INF-02** | `web_project_structure` | 75 | 75 | 75 | 75.0 | 0 | 0.0 | 100% Sufficient |
| **INF-02** | `web_documentation` | 75 | 75 | 75 | 75.0 | 0 | 0.0 | 100% Sufficient |
| **INF-02** | `web_contribution_history` | 50 | 50 | 50 | 50.0 | 0 | 0.0 | 100% Sufficient |
| **INF-03** | `web_code_quality` | 75 | 75 | 75 | 75.0 | 0 | 0.0 | 100% Sufficient |
| **INF-03** | `web_project_structure` | 100 | 100 | 100 | 100.0 | 0 | 0.0 | 100% Sufficient |
| **INF-03** | `web_documentation` | 50 | 50 | 50 | 50.0 | 0 | 0.0 | 100% Sufficient |
| **INF-03** | `web_contribution_history` | 100 | 100 | 100 | 100.0 | 0 | 0.0 | 100% Sufficient |

### Kesimpulan Stabilitas:
1. **Variance = 0.0**: Tidak ditemukan fluktuasi skor numerik pada ketiga run di setiap kriteria.
2. **Sufficiency Agreement = 100%**: Status kecukupan bukti konsisten sepenuhnya di semua run tanpa flip status.
3. **Kategori Hasil**: Kategori hasil (Weak, Medium, Strong) stabil 100% dan tidak pernah bergeser antar run.

---

## 6. Kepatuhan Kontrak AI 1.1

Pemeriksaan kepatuhan terhadap dokumen tata kelola `docs/AI_QUALITY_SECURITY.md`:

| # | Klausul Kontrak AI 1.1 | Status | Verifikasi Teknis |
| :---: | :--- | :---: | :--- |
| 1 | **Skor Anchor Valid** | **Lulus** | Hanya menggunakan anchor resmi `0`, `25`, `50`, `75`, `100`, atau `null`. Tidak ada skor di luar himpunan. |
| 2 | **Insufficient Evidence = Score Null** | **Lulus** | Pada INF-01 (documentation & contribution history), skor bernilai `null` tanpa skor karangan. |
| 3 | **Kalkulasi Final Score Server-Side** | **Lulus** | Model tidak menentukan skor akhir. Skor akhir dihitung oleh rumus aplikasi dan menghasilkan `null` jika ada kriteria `null`. |
| 4 | **Grounding Kutipan Bukti (No Hallucination)** | **Lulus** | Seluruh kutipan bukti diverifikasi lolos fungsi `quoteMatchesEvidence` terhadap isi berkas fisik. |
| 5 | **Batas Detail Per Kriteria** | **Lulus** | Maksimal 2 indikator terpenuhi, 2 indikator belum terpenuhi, 1 kutipan bukti, dan 1 tindakan konkret. |
| 6 | **Delimiter Keamanan Input** | **Lulus** | Isi berkas diperlakukan sebagai data tidak tepercaya dalam delimiter `<EVIDENCE>`. |
| 7 | **Kelengkapan 4 Kriteria Rubrik Aktif** | **Lulus** | Setiap run menghasilkan tepat 4 kriteria sesuai bidang Informatika tanpa duplikasi kriteria. |

---

## 7. Rekomendasi untuk Pengujian Produksi

1. **Sinkronisasi Berkas Git Log pada Fixture**: Folder fixture fisik sebaiknya dilengkapi berkas `git-log.txt` agar rater manusia yang menginspeksi direktori secara offline dapat memverifikasi commit log secara langsung tanpa metadata eksternal.
2. **Implementasi Listener HTTP pada INF-03**: Menambahkan pembungkus `http.createServer` pada `fixtures/informatics/strong/src/app.js` akan menyelaraskan kode dengan spesifikasi di README dan menaikkan skor dokumentasi ke anchor 100.
3. **Penambahan Test Case pada INF-03**: Menambahkan pengujian untuk `inventory.updateStock` dan error handling saat item tidak ditemukan akan menyempurnakan kualitas kode ke anchor 100.
