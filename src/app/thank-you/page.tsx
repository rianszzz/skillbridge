import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/breadcrumbs";
import PageIcon from "@/components/page-icon";

export const metadata: Metadata = { title: "Terima Kasih | Skillbridge AI", description: "Konfirmasi bahwa masukan atau pengujian Skillbridge telah diterima." };

export default function ThankYouPage() {
  return <main id="main"><Breadcrumbs current="Terima kasih"/><section className="error-page"><div><p className="eyebrow">Selesai</p><h1>Terima kasih sudah mencoba.</h1><p className="lede">Masukan Anda membantu menjaga penilaian tetap jelas, aman, dan berguna bagi pencari kerja pemula.</p><div className="actions"><Link className="button" href="/assess">Nilai bukti lain</Link><Link className="button secondary" href="/faq">Baca FAQ</Link></div></div><PageIcon type="check"/></section></main>;
}
