# Share dan Deployment

## Prasyarat

- Node.js 22
- `ngrok` sudah login
- Vercel CLI sudah login
- Supabase migration tersedia di `supabase/migrations/`

Database baru: terapkan `001_prototype.sql`, `002_evidence_storage.sql`, lalu `003_security_hardening.sql` berurutan.

Database produksi lama yang sudah memiliki schema 001/002: terapkan **hanya** `003_security_hardening.sql`. Jangan mengulang 001 karena policy dan tabel sudah ada.

## Share dengan Ngrok

Terminal 1:

```bash
npm run dev:3001
```

Terminal 2:

```bash
npm run share
```

Salin URL HTTPS dari output ngrok. Tambahkan URL berikut ke Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:

```text
https://<domain-ngrok>/auth
```

Untuk sharing aktif saat ini:

```text
Site URL: https://<domain-ngrok>
Redirect URL: https://<domain-ngrok>/auth
Redirect URL: http://localhost:3001/auth
```

Jika Supabase mengganti `redirect_to` menjadi `http://localhost:3000`, URL ngrok belum ada di allowlist atau perubahan belum disimpan.

Pada Authentication → Email Templates → Confirm signup, pastikan link menggunakan `{{ .ConfirmationURL }}`. Scanner keamanan email dapat membuka link sekali pakai sebelum pengguna; untuk email organisasi dengan Safe Links, gunakan template OTP (`{{ .Token }}`) dan form OTP khusus sebelum mengandalkan konfirmasi link.

Supabase email bawaan memiliki rate limit ketat dan bukan untuk pendaftaran publik. Pasang custom SMTP sebelum demo banyak pengguna. Jika UI menampilkan batas pengiriman tercapai, tunggu cooldown; jangan mengulang signup/resend karena setiap request memperpanjang masalah operasional.

Respons signup/resend sukses hanya membuktikan Auth API menerima permintaan, bukan email tiba di inbox. Built-in SMTP hosted dibatasi dan dapat menolak penerima di luar anggota organisasi. Untuk pendaftaran Gmail publik, pasang custom SMTP transaksional dan periksa delivery/bounce pada dashboard provider.

Ngrok URL gratis berubah setiap tunnel baru. Update redirect URL setiap domain berubah. Jangan membagikan halaman selama `GET /api/health` bukan HTTP `200`.

## Deploy ke Vercel

Tambahkan environment berikut pada Vercel Project Settings untuk Production, Preview, dan Development:

```text
GROQ_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Jangan memakai prefix `NEXT_PUBLIC_` untuk Groq atau service-role key.

Salin URL dan publishable/anon key dari project Supabase yang sama. Setelah mengubah `NEXT_PUBLIC_*`, restart server lokal atau redeploy Vercel karena nilai tersebut ditanam ke bundle browser saat build/start.

Deploy:

```bash
npm run check
npm run deploy
```

`003_security_hardening.sql` wajib selesai sebelum deploy kode ini. Tanpanya endpoint assessment/interview gagal aman karena RPC quota dan transaksi belum tersedia.

Setelah Vercel memberi domain, tambahkan ke Supabase redirect URLs:

```text
https://<domain-vercel>/auth
https://*.vercel.app/auth
```

Tambahkan production domain sebagai Supabase Site URL. Lalu periksa:

```bash
curl -i https://<domain>/api/health
```

## Batas Runtime

- Upload maksimal 4 MB agar request tetap di bawah batas platform setelah overhead multipart.
- PDF Marketing maksimal 15 halaman dengan text layer.
- DKV menerima PNG/JPEG.
- Route AI memiliki batas durasi 60 detik.
- Processing masih sinkron. Tambah queue hanya jika timeout terukur terjadi.
