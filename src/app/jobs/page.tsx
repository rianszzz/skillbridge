import type { Metadata } from "next";
import JobsView from "./jobs-view";

export const metadata: Metadata = {
  title: "Bursa Lowongan Kemitraan Industri | Skillbridge AI",
  description:
    "Lowongan kerja dan magang ramah lulusan SMK & D3/S1 berbasis validasi portofolio nyata dan transparansi kompensasi.",
};

export default function JobsPage() {
  return (
    <main id="main">
      <header className="page-head">
        <p className="eyebrow">Bursa Kerja Kemitraan Industri</p>
        <h1>Lowongan Kerja Berbasis Bukti Nyata</h1>
        <p className="lede">
          Temukan peluang kerja dan magang dari mitra industri yang menghargai portofolio riil Anda. Lamar langsung dengan bukti karya dan skor Skillbridge tervalidasi.
        </p>
      </header>
      <JobsView />
    </main>
  );
}
