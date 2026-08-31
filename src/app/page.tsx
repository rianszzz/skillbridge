import Link from "next/link";

export default function Home() {
  return <main id="main">
    <section className="hero"><div><p className="eyebrow">Bukti lebih kuat dari klaim</p><h1>Ukur kesiapan. Tunjukkan buktinya.</h1><p className="lede">Skillbridge membaca karya nyata, menilainya dengan rubrik transparan, lalu menunjukkan gap yang layak dikerjakan berikutnya.</p><div className="actions"><Link className="button" href="/assess">Mulai penilaian</Link><a className="button secondary" href="#cara-kerja">Lihat cara kerja</a></div></div>
      <div className="ledger" aria-label="Alur Skillbridge"><article data-step="1"><strong>Bukti</strong><p className="hint">Repositori GitHub publik.</p></article><article data-step="2"><strong>Rubrik</strong><p className="hint">Empat kriteria dengan bobot terbuka.</p></article><article data-step="3"><strong>Langkah berikutnya</strong><p className="hint">Gap spesifik, materi terkurasi, wawancara.</p></article></div></section>
    <section id="cara-kerja" className="section"><p className="eyebrow">Tiga jalur awal</p><h2>Satu mesin evaluasi, tiga jenis karya.</h2><div className="grid-3"><article className="card"><strong>Junior Web Developer</strong><p>Kode, struktur, dokumentasi, dan riwayat kontribusi.</p></article><article className="card"><strong>Junior Graphic Designer</strong><p>Konsistensi visual, iterasi, narasi, dan problem solving.</p></article><article className="card"><strong>Junior Digital Marketer</strong><p>Metodologi, data, hasil terukur, dan kualitas laporan.</p></article></div></section>
    <section className="section faq-teaser"><div><h2>Pahami hasil sebelum menilai.</h2><p className="lede">Pelajari arti bukti kurang, batas skor, pemrosesan AI, dan cara menghapus data.</p></div><Link className="button secondary" href="/faq">Buka FAQ</Link></section>
  </main>;
}
