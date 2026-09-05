"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeAssessment, useAssessments } from "@/lib/assessment-client";
import { rubrics } from "@/lib/rubrics";
import { catalog } from "@/lib/learning-catalog";

export default function ResultView({ id }: { id: string }) {
  const router = useRouter();
  const { items, loading, error } = useAssessments(id);
  const result = items[0];
  if (loading) return <section className="page-head"><p>Memuat hasil...</p></section>;
  if (error) return <section className="page-head"><div className="alert" role="alert">{error}</div><Link className="button" href="/auth">Masuk</Link></section>;
  if (!result) return <section className="page-head"><p className="eyebrow">Hasil</p><h1>Hasil tidak ditemukan.</h1><p>Hasil demo tersimpan pada browser yang menjalankan penilaian.</p><Link className="button" href="/assess">Mulai penilaian</Link></section>;
  const rubric = rubrics[result.role]; const gaps = result.criteria.filter(({ score }) => score !== null && score < 75).sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 3);
  const sufficientCount = result.criteria.filter(({ evidence_sufficiency }) => evidence_sufficiency === "sufficient").length;
  async function remove() { try { await removeAssessment(id); router.push("/history"); } catch (cause) { alert(cause instanceof Error ? cause.message : "Hasil gagal dihapus."); } }
  return <><header className="page-head"><p className="eyebrow">Rubrik {result.rubric_version} · {result.role}</p><h1>{result.finalScore === null ? "Bukti belum cukup" : <span className="score">{result.finalScore}<small>/100</small></span>}</h1>{result.finalScore === null && <p className="assessment-progress">{sufficientCount} dari {result.criteria.length} kriteria dapat dinilai.</p>}<p className="lede">Penilaian indikatif berdasarkan bukti yang dikirim. Bukan verifikasi identitas, kepemilikan karya, atau jaminan diterima kerja.</p></header><section className="panel">
    {result.criteria.map((item, index) => { const criterion = rubric.find(({ id: criterionId }) => criterionId === item.criterion_id); const anchor = item.score === null ? null : String(item.score) as "0" | "25" | "50" | "75" | "100"; return <article className="criterion" key={item.criterion_id}><div><p className="eyebrow">Kriteria {index + 1}</p><h3>{criterion?.label}</h3><strong>{item.score === null ? "Bukti kurang" : `${item.score}/100`}</strong>{anchor && <p className="anchor-label">{criterion?.anchors[anchor]}</p>}<p className="hint">Keyakinan: {confidenceLabel(item.confidence)}</p></div><div className="criterion-detail"><p><strong>Mengapa nilai ini</strong><br/>{item.reason}</p>{item.details ? <><DetailList title="Yang sudah terbukti" items={item.details.met_indicators}/><DetailList title="Yang belum terbukti" items={item.details.missing_indicators}/>{item.details.evidence_quotes.length > 0 && <div><strong>Kutipan bukti</strong>{item.details.evidence_quotes.map(({ reference, quote }) => <blockquote className="evidence-quote" key={`${reference}-${quote}`}><code>{reference}</code><p>“{quote}”</p></blockquote>)}</div>}<div className="next-action"><strong>{item.score === null ? "Bukti yang perlu ditambahkan" : item.score === 100 ? "Pertahankan kualitas" : "Agar naik ke anchor berikutnya"}</strong><p>{item.details.next_action}</p></div></> : <div>{item.evidence_refs.map((ref) => <span className="marker" key={ref}>{ref}</span>)}</div>}</div></article>; })}
  </section><section className="section grid-3"><article><p className="eyebrow">Kekuatan</p>{result.strengths.map((item) => <p key={item}>{item}</p>)}</article><article><p className="eyebrow">Gap utama</p>{result.gaps.map((item) => <p key={item}>{item}</p>)}</article><article><p className="eyebrow">Batas penilaian</p>{result.limitations.map((item) => <p key={item}>{item}</p>)}</article></section>
  <section className="section"><p className="eyebrow">Langkah berikutnya</p><h2>Materi dari katalog terkurasi.</h2><div className="grid-3">{gaps.map((gap) => { const resource = catalog[gap.criterion_id]?.[0]; return resource && <a className="card" href={resource.url} target="_blank" rel="noreferrer" key={gap.criterion_id}><strong>{resource.title}</strong><p>Dipilih untuk gap {rubric.find(({ id: criterionId }) => criterionId === gap.criterion_id)?.label.toLowerCase()}.</p></a>; })}</div><div className="actions"><Link className="button" href={`/interview/${id}`}>Mulai wawancara</Link><Link className="button secondary" href="/assess">Nilai bukti baru</Link><button className="button secondary" onClick={remove}>Hapus hasil</button></div></section></>;
}

function DetailList({ title, items }: { title: string; items: string[] }) { return items.length > 0 && <div><strong>{title}</strong><ul className="detail-list">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>; }
function confidenceLabel(value: "low" | "medium" | "high") { return ({ low: "Rendah", medium: "Sedang", high: "Tinggi" })[value]; }
