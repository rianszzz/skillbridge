import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/breadcrumbs";
import PageIcon from "@/components/page-icon";

export const metadata: Metadata = { title: "FAQ | Skillbridge AI", description: "Jawaban tentang penilaian bukti, skor, privasi, dan batas Skillbridge AI." };

const questions = [
  ["Apakah skor Skillbridge menjamin saya diterima kerja?", "Tidak. Skor bersifat indikatif berdasarkan bukti dan rubrik. Hasil bukan verifikasi identitas, kepemilikan karya, atau jaminan kerja."],
  ["Bukti apa yang dapat dinilai?", "Repositori GitHub publik untuk Informatika, PNG/JPEG beserta proses untuk DKV, dan PDF dengan text layer untuk Bisnis/Pemasaran."],
  ["Mengapa hasil saya bertuliskan bukti belum cukup?", "Satu atau lebih kriteria tidak memiliki bukti yang diperlukan. Bukti kurang tidak diubah menjadi nilai nol dan skor akhir tidak ditampilkan."],
  ["Apakah kode repository dijalankan?", "Tidak. Sistem hanya membaca data publik yang dibatasi dan tidak mengeksekusi kode pengguna."],
  ["Ke mana bukti dikirim?", "Bukti diproses server, disimpan privat di Supabase bila berupa file, dan dikirim ke Groq setelah persetujuan eksplisit."],
  ["Bisakah hasil dan file dihapus?", "Bisa. Gunakan tombol Hapus hasil pada halaman hasil. Data turunan dan file terkait ikut diproses untuk penghapusan."],
  ["Email konfirmasi belum masuk. Apa yang harus dilakukan?", "Periksa Inbox, Spam, dan All Mail. Tunggu minimal 60 detik sebelum menekan Kirim ulang konfirmasi agar tidak terkena batas pengiriman."],
];

export default function FaqPage() {
  return <main id="main"><Breadcrumbs current="FAQ"/><header className="support-head"><div><p className="eyebrow">Pertanyaan umum</p><h1>Jawaban sebelum Anda mulai.</h1><p className="lede">Tentang bukti, skor, keamanan, dan batas penilaian.</p></div><PageIcon type="question"/></header><section className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section><section className="section"><h2>Siap menguji bukti?</h2><div className="actions"><Link className="button" href="/assess">Mulai penilaian</Link><Link className="button secondary" href="/privacy">Baca kebijakan privasi</Link></div></section></main>;
}
