"use client";
import Link from "next/link";
import { useAssessments } from "@/lib/assessment-client";

export default function HistoryView() {
  const { items, loading, error } = useAssessments();
  if (loading) return <section className="section"><p>Memuat riwayat...</p></section>;
  if (error) return <section className="section"><div className="alert" role="alert">{error}</div><Link className="button" href="/auth">Masuk</Link></section>;

  const demoLinks = (
    <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
      <p className="hint"><strong>Simulasi Sidang Kompres (Data Seed):</strong></p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <Link className="button secondary" href="/results/00000000-0000-0000-0000-000000000002">Demo Informatika (50/100 · +25 Δ)</Link>
        <Link className="button secondary" href="/results/00000000-0000-0000-0000-000000000022">Demo DKV (50/100)</Link>
        <Link className="button secondary" href="/results/00000000-0000-0000-0000-000000000032">Demo Marketing (61/100)</Link>
      </div>
    </div>
  );

  if (!items.length) {
    return (
      <section className="section">
        <h2>Belum ada penilaian.</h2>
        <Link className="button" href="/assess">Nilai bukti pertama</Link>
        {demoLinks}
      </section>
    );
  }

  return (
    <section className="history-list">
      {items.map((item) => (
        <article className="card history-item" key={item.id}>
          <strong>{item.finalScore ?? "—"}<small>/100</small></strong>
          <div>
            <h3>{item.role}</h3>
            <p className="hint">{new Date(item.createdAt).toLocaleString("id-ID")} · Rubrik {item.rubric_version}</p>
          </div>
          <div className="actions">
            <Link className="button secondary" href={`/results/${item.id}`}>Lihat hasil</Link>
          </div>
        </article>
      ))}
      {demoLinks}
    </section>
  );
}
