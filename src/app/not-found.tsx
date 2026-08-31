import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/breadcrumbs";
import PageIcon from "@/components/page-icon";

export const metadata: Metadata = { title: "Halaman Tidak Ditemukan | Skillbridge AI", description: "Halaman yang Anda cari tidak tersedia." };

export default function NotFound() {
  return <main id="main"><Breadcrumbs current="Halaman tidak ditemukan"/><section className="error-page"><div><p className="eyebrow">Error 404</p><h1>Jalur ini tidak ditemukan.</h1><p className="lede">Tautan mungkin sudah berubah. Kembali ke halaman utama atau mulai penilaian baru.</p><div className="actions"><Link className="button" href="/">Kembali ke beranda</Link><Link className="button secondary" href="/assess">Mulai penilaian</Link></div></div><PageIcon type="lost"/></section><section className="section"><h2>Tujuan yang mungkin Anda cari.</h2><div className="link-list"><Link href="/faq">Pertanyaan umum <span aria-hidden="true">→</span></Link><Link href="/privacy">Kebijakan privasi <span aria-hidden="true">→</span></Link><Link href="/auth">Masuk atau daftar <span aria-hidden="true">→</span></Link></div></section></main>;
}
