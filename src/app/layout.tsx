import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import AuthStatus from "@/components/auth-status";
import "./globals.css";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = { title: "Skillbridge AI", description: "Evaluasi kesiapan kerja berbasis bukti." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-scroll-behavior="smooth" className={`${body.variable} ${display.variable}`}><body>
    <a className="skip-link" href="#main">Lewati ke konten</a>
    <header className="site-header"><Link className="brand" href="/"><span>SB</span> Skillbridge AI</Link><nav aria-label="Navigasi utama"><Link href="/assess">Penilaian</Link><Link href="/history">Riwayat</Link><AuthStatus /></nav></header>
    {children}
    <footer>Prototipe evaluasi indikatif berbasis bukti. Bukan verifikasi kompetensi atau jaminan kerja.</footer>
  </body></html>;
}
