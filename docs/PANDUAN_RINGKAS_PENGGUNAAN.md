# PANDUAN PRAKTIS INSTALASI & PENGGUNAAN
# SKILLBRIDGE AI

Panduan ringkas dan mudah untuk menjalankan serta menggunakan platform evaluasi kesiapan kerja **Skillbridge AI**.

---

## ⚡ CARA CEPAT (PILIH SALAH SATU)

### Opsi 1: Tanpa Instalasi (Paling Mudah — Siap Pakai)
Anda tidak perlu menginstal apa pun di komputer. Aplikasi sudah aktif di cloud dan bisa langsung dibuka melalui browser di HP maupun Laptop:
👉 **Akses Langsung:** [https://skillbridge-6ndn.vercel.app](https://skillbridge-6ndn.vercel.app)

---

### Opsi 2: Jalankan di Komputer Sendiri (Localhost)
Jika Anda ingin menjalankan aplikasi dari kode sumber (*source code*):

**Prasyarat:** Sudah terpasang **Node.js** (versi 20 atau 22) dan **Git**.

Cukup buka Terminal / Command Prompt dan ketik 4 perintah berikut:

```bash
# 1. Download kode aplikasi
git clone https://github.com/rianszzz/skillbridge.git
cd skillbridge

# 2. Pasang dependensi
npm install

# 3. Siapkan konfigurasi (salin file contoh)
cp .env.example .env.local
# Masukkan API Key Groq dan Supabase di dalam file .env.local

# 4. Jalankan aplikasi
npm run dev
```

Buka browser dan ketik alamat: **`http://localhost:3000`**

---

<div style="page-break-after: always;"></div>

## 📱 PANDUAN PENGGUNAAN APLIKASI (5 LANGKAH MUDAH)

---

### Langkah 1: Masuk atau Buat Akun
1. Buka website [https://skillbridge-6ndn.vercel.app](https://skillbridge-6ndn.vercel.app).
2. Klik tombol **Masuk** atau **Daftar** di pojok kanan atas.
3. Masukkan alamat email dan password Anda, lalu klik tombol **Masuk**.

![Halaman Beranda Skillbridge AI](validation/live-test-evidence/01_landing_page.png)
*Gambar 1. Halaman Beranda Skillbridge AI.*

---

### Langkah 2: Pilih Bidang & Masukkan Bukti Portofolio
Buka menu **Penilaian** di navigasi atas. Pilih salah satu bidang yang ingin dievaluasi:

1. **Informatika (Web Developer):**  
   Ketik link repositori GitHub publik Anda.  
   *Contoh:* `https://github.com/username/proyek-web`
2. **Desain Komunikasi Visual / DKV (Graphic Designer):**  
   Upload gambar karya Anda (format PNG atau JPG, maks 4 MB) dan tuliskan deskripsi singkat mengenai konsep desain Anda.
3. **Bisnis & Pemasaran (Digital Marketer):**  
   Upload dokumen laporan hasil kampanye (format PDF asli ber-teks, maks 15 halaman dan maks 4 MB).

![Form Penilaian 3 Bidang](validation/live-test-evidence/02_form_penilaian_3_bidang.png)
*Gambar 2. Formulir Penyerahan Bukti dan Pilihan Bidang.*

---

<div style="page-break-after: always;"></div>

### Langkah 3: Centang Persetujuan & Mulai Penilaian
1. Baca keterangan privasi di sebelah kanan.
2. Centang kotak: **"Saya menyetujui pemrosesan bukti kerja ini oleh model AI..."**
3. Klik tombol **Kirim untuk Dinilai**.
4. Tunggu sekitar 5–10 detik selagi AI membaca dan mengevaluasi karya Anda.

---

### Langkah 4: Membaca Hasil Skor & Rekomendasi
Setelah selesai, halaman hasil akan langsung muncul:

![Hasil Penilaian](validation/live-test-evidence/03_hasil_penilaian_kriteria_bukti.png)
*Gambar 3. Halaman Hasil Penilaian Lengkap dengan Skor dan Bukti.*

- **Skor Kesiapan Kerja (Skala 0–100):** Dihitung otomatis dari 4 kriteria utama (misal: Kualitas Kode, Struktur Folder, Dokumentasi README, dan Riwayat Git).
- **Alasan & Bukti Nyata:** AI menunjukkan baris kode atau halaman dokumen persis yang menjadi dasar penilaian.
- **Rekomendasi Materi Belajar:** Sistem memberikan 3 modul tutorial resmi (seperti MDN Docs, Next.js, GitHub) untuk memperbaiki kelemahan Anda.

![Rekomendasi Materi](validation/live-test-evidence/04_rekomendasi_materi_terkurasi.png)
*Gambar 4. Modul Rekomendasi Belajar Terarah.*

---

<div style="page-break-after: always;"></div>

### Langkah 5: Latihan Wawancara Singkat dengan AI
Tepat di bawah halaman hasil, Anda bisa langsung berlatih wawancara kerja:
1. Klik tombol **Mulai wawancara**.
2. AI akan mengajukan pertanyaan teknis berdasarkan kelemahan portofolio Anda.
3. Ketik jawaban Anda di kolom teks, lalu klik **Kirim jawaban**.
4. AI akan langsung memberikan masukan (*feedback*) apakah jawaban Anda sudah tepat atau perlu ditingkatkan (maksimal 5 pertanyaan latihan).

![Simulasi Wawancara Adaptif](validation/live-test-evidence/06_sesi_wawancara_adaptif.png)
*Gambar 5. Sesi Tanya-Jawab Wawancara Kerja Interaktif.*

---

## 🎯 INGIN COBA CEPAT TANPA LOGIN? (DEMO SEED)

Jika Anda ingin melihat contoh hasil penilaian dan simulasi wawancara secara instan tanpa perlu mendaftar akun atau memasukkan file, Anda dapat langsung mengklik tautan berikut:

- 💻 **Contoh Bidang Informatika (Nilai 50/100):**  
  [https://skillbridge-6ndn.vercel.app/results/00000000-0000-4000-8000-000000000002](https://skillbridge-6ndn.vercel.app/results/00000000-0000-4000-8000-000000000002)
- 🎨 **Contoh Bidang Desain Visual / DKV (Nilai 50/100):**  
  [https://skillbridge-6ndn.vercel.app/results/00000000-0000-4000-8000-000000000022](https://skillbridge-6ndn.vercel.app/results/00000000-0000-4000-8000-000000000022)
- 📈 **Contoh Bidang Pemasaran Digital (Nilai 61/100):**  
  [https://skillbridge-6ndn.vercel.app/results/00000000-0000-4000-8000-000000000032](https://skillbridge-6ndn.vercel.app/results/00000000-0000-4000-8000-000000000032)
- 🎙️ **Contoh Sesi Wawancara Langsung:**  
  [https://skillbridge-6ndn.vercel.app/interview/00000000-0000-4000-8000-000000000002](https://skillbridge-6ndn.vercel.app/interview/00000000-0000-4000-8000-000000000002)

---

## ❓ PERTANYAAN UMUM & SOLUSI (FAQ)

1. **Muncul pesan: "Layanan AI sedang sibuk. Coba lagi setelah satu menit"?**  
   *Penyebab:* Kuota API AI gratis sedang padat pemakaiannya.  
   *Solusi:* Cukup tunggu 1 menit lalu klik kirim ulang, atau gunakan tautan **Demo Seed** di atas.

2. **File PDF atau Gambar ditolak saat diunggah?**  
   *Solusi:* Pastikan ukuran berkas tidak melebihi **4 MB**. Untuk PDF, pastikan dokumen hasil ekspor digital (bukan foto hasil scan).

3. **Apakah kode repositori GitHub saya aman?**  
   *Jawaban:* Sangat aman. Sistem **tidak pernah menjalankan kode Anda**, melainkan hanya membaca struktur teks untuk keperluan asesmen statis.

4. **Bagaimana cara menghapus data penilaian saya?**  
   *Solusi:* Pada halaman hasil penilaian, klik tombol **Hapus hasil** berwarna merah di bagian bawah. Semua data penilaian dan file akan terhapus secara permanen.

---
**Skillbridge AI © 2026** — *Platform Penilaian Kesiapan Kerja Berbasis Bukti Nyata.*  
*Website:* [https://skillbridge-6ndn.vercel.app](https://skillbridge-6ndn.vercel.app) | *GitHub:* [https://github.com/rianszzz/skillbridge](https://github.com/rianszzz/skillbridge)
