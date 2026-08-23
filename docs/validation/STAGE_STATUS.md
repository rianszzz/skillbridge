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
- [ ] Sembilan fixture × tiga run selesai.
- [ ] Deviasi terhadap baseline manusia dihitung.
- [ ] Token, biaya, latensi, dan stabilitas dilaporkan lengkap.
- [ ] Model/prompt dibekukan setelah hasil diterima.

Status: **belum lulus** sampai Tahap 1 selesai dan 27 run resmi selesai.
