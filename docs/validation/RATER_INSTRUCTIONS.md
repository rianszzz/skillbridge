# Instruksi Penilai Manusia

1. Nilai sembilan sampel secara independen dengan rubrik `1.0` di `src/lib/rubrics.ts`.
2. Jangan melihat `fixtures/expected.json`, hasil AI, atau penilaian orang lain.
3. Gunakan skor `0`, `25`, `50`, `75`, `100`; gunakan `null` bila bukti tidak cukup.
4. Setiap skor wajib memiliki alasan dan referensi bukti.
5. Kunci kedua penilaian sebelum menghitung median.
6. Selisih minimal 25 atau perbedaan sufficiency wajib dibahas manusia.
7. Jangan menimpa skor independen setelah diskusi; catat hasil pada kolom adjudikasi.

Baseline dua skor cukup adalah `(R1 + R2) / 2`. `insufficient_evidence` bukan skor nol.

Tahap 1 belum lulus sampai semua baris terisi oleh dua manusia dan tidak ada adjudikasi `pending`.
