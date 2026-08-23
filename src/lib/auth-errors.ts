export function authErrorMessage(error: { code?: string; message: string }) {
  if (error.message === "Invalid API key") return "Konfigurasi autentikasi belum termuat. Muat ulang halaman; jika tetap gagal, restart atau redeploy aplikasi.";
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || /rate limit/i.test(error.message)) return "Batas pengiriman email sedang tercapai. Tunggu beberapa saat sebelum mencoba lagi; jangan menekan kirim ulang berulang kali.";
  if (error.code === "email_address_not_authorized") return "Layanan email bawaan belum mengizinkan alamat ini. Administrator perlu memasang custom SMTP untuk pendaftaran publik.";
  if (error.code === "captcha_failed") return "Verifikasi anti-bot gagal. Muat ulang halaman lalu coba lagi.";
  return error.message;
}
