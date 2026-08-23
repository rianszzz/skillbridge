# Dataset Validasi Skillbridge AI

Seluruh fixture dibuat khusus untuk pengujian Skillbridge AI pada 23 Agustus 2026. Data, nama, metrik, dan karya visual bersifat sintetis. Fixture boleh digunakan ulang untuk pengujian proyek ini.

Label `weak`, `medium`, dan `strong` adalah desain fixture internal. Label disembunyikan dari penilai manusia saat penilaian independen.

## Sampel

| ID | Bidang | Bukti | Target fixture |
| --- | --- | --- | --- |
| INF-01 | Informatika | `informatics/weak` | kode satu file, tanpa README, satu commit |
| INF-02 | Informatika | `informatics/medium` | pemisahan dasar, README setup, empat commit |
| INF-03 | Informatika | `informatics/strong` | validasi, error handling, tests, docs, enam commit |
| DKV-01 | DKV | `design/weak.png` + deskripsi | hierarki dan konsistensi lemah |
| DKV-02 | DKV | `design/medium.png` + deskripsi | sistem visual cukup konsisten, iterasi terbatas |
| DKV-03 | DKV | `design/strong.png` + deskripsi | sistem visual kohesif dan proses jelas |
| MKT-01 | Marketing | `marketing/weak.pdf` | klaim tanpa baseline/periode/KPI lengkap |
| MKT-02 | Marketing | `marketing/medium.pdf` | metode dan KPI dasar, atribusi terbatas |
| MKT-03 | Marketing | `marketing/strong.pdf` | hipotesis, funnel, baseline, hasil, biaya, limitation |

## Deskripsi DKV

Gunakan isi `design/descriptions.json` bersama gambar terkait saat menguji form DKV.

## Aturan

- Jangan mengubah fixture setelah hash dibekukan di `manifest.sha256`.
- Jika fixture berubah, buat hash baru dan ulangi seluruh penilaian manusia serta AI.
- Expected anchor di `expected.json` bukan baseline manusia.
- Baseline sah hanya setelah dua manusia mengisi `docs/validation/HUMAN_RATINGS.csv` secara independen.
