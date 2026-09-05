# Status Tahap 0–2

## Tahap 0

- [x] Tiga target peran ditetapkan.
- [x] Sembilan fixture sintetis dibuat: lemah, sedang, kuat per bidang.
- [x] Hash bukti dibekukan di `fixtures/manifest.sha256`.
- [x] Skrip demo 5–7 menit dibuat.
- [x] Provider dan batas file ditetapkan.

Status: **lulus otomatisasi**, menunggu persetujuan tim atas fixture dan skrip demo.

## Tahap 1

- [x] Rubrik `1.0`, bobot, anchor, accepted evidence, dan insufficient evidence tersedia.
- [x] Lembar penilaian dan instruksi dua manusia tersedia.
- [ ] Penilai manusia R1 selesai.
- [ ] Penilai manusia R2 selesai.
- [ ] Median dan disagreement dihitung.
- [ ] Seluruh adjudikasi selesai.

Status: **blokir manusia**. AI tidak boleh mengisi kolom penilai.

## Tahap 2

- [x] Structured output, validasi skor, kriteria, dan referensi bukti tersedia.
- [x] Prompt memperlakukan evidence sebagai data tidak tepercaya.
- [x] Sembilan fixture × tiga run selesai (27 run benchmark terdokumentasi di Section 10).
- [x] Deviasi terhadap baseline simulasi dihitung dan dianalisis.
- [x] Evaluasi stabilitas dan konsistensi status kecukupan dilaporkan lengkap.
- [x] Model/prompt dibekukan pada Rubrik 1.1.

Status: **lulus pengujian model benchmark 27 run**; verifikasi baseline manusia definitif tetap menunggu Tahap 1.
