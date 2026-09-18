import type { Metadata } from "next";
import RecruiterView from "./recruiter-view";

export const metadata: Metadata = {
  title: "Talent Pool Mitra Industri | Skillbridge AI",
  description:
    "Saring lulusan siap kerja berdasarkan bukti nyata (kode GitHub, karya visual, laporan PDF), bukan klaim CV.",
};

export default function RecruiterPage() {
  return (
    <main id="main">
      <header className="page-head">
        <p className="eyebrow">Portal Perusahaan & Perekrut</p>
        <h1>Talent Pool Mitra Industri — Kandidat Kesiapan Kerja Tervalidasi</h1>
        <p className="lede">
          Saring lulusan siap kerja berdasarkan bukti nyata (kode GitHub, karya visual, laporan PDF), bukan klaim CV.
        </p>
      </header>
      <RecruiterView />
    </main>
  );
}
