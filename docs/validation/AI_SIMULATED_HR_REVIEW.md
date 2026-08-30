# Simulasi Review HR R1/R2

> Status: **simulasi penilaian AI**, bukan validasi dua manusia nyata. Hasil ini tidak memenuhi exit criteria Tahap 1 dan harus diganti atau dikonfirmasi oleh penilai manusia independen.

## Metode

- Dua subagent menilai 9 sampel secara independen sebagai `AI_SIM_R1` dan `AI_SIM_R2`.
- Keduanya memakai rubrik `1.0`, anchor `0/25/50/75/100`, dan aturan `insufficient_evidence` dari `RATER_INSTRUCTIONS.md`.
- Penilai dilarang membaca `fixtures/expected.json`, hasil model produksi, dan output penilai lain.
- Output dikunci sebelum perbandingan:
  - R1: `732248c644346fd91c3f80deeaa28fcd1c259e185e9fb4cc1daaf024638cde5d`
  - R2: `38be7cb7c1454dcf57105520c0fd12afd8e0a1adbd4986e4a90e75d56a4f6b3c`
- Setiap skor memiliki alasan dan referensi bukti. Riwayat kontribusi dinilai tidak cukup bila minimal tiga commit bertanggal beserta pesan tidak tersedia.
- Baseline tanpa disagreement memakai rata-rata dua skor. Selisih minimal 25 atau perbedaan sufficiency masuk adjudikasi.

## Ringkasan

| Metrik | Hasil |
| --- | ---: |
| Baris penilaian | 36 |
| R1 sufficient | 30 |
| R1 insufficient | 6 |
| R2 sufficient | 30 |
| R2 insufficient | 6 |
| Agreement sufficiency | 36/36 |
| Disagreement yang perlu adjudikasi | 3 |
| Adjudikasi pending | 0 |

## Adjudikasi

| Sampel | Kriteria | R1 | R2 | Baseline | Dasar keputusan |
| --- | --- | ---: | ---: | ---: | --- |
| INF-03 | `web_project_structure` | 75 | 100 | 100 | Domain inventori, validasi, aplikasi, dan tes dipisah efektif tanpa abstraksi berlebih. |
| DKV-03 | `design_problem_solving` | 75 | 100 | 100 | Solusi mengintegrasikan hierarki, kontras, kepadatan, gap, dan tindakan pengguna. |
| MKT-02 | `marketing_data_use` | 50 | 75 | 75 | Data kanal dan conversion rate dipakai langsung untuk keputusan prioritas anggaran. |

## Audit

Data lengkap berada di `HUMAN_RATINGS.csv`. Kolom `evidence_hash` mengikat setiap baris ke kumpulan bukti sampel, `baseline_source` menandai provenance simulasi AI, dan skor independen tidak ditimpa saat adjudikasi.

Review manusia nyata tetap wajib. R1 dan R2 manusia harus menilai tanpa melihat file simulasi ini, lalu hasil manusia disimpan sebagai baseline resmi.
