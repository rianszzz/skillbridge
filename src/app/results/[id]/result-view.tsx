"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeAssessment, useAssessments } from "@/lib/assessment-client";
import { rubrics } from "@/lib/rubrics";

const resources: Record<string, { title: string; url: string }[]> = {
  web_code_quality: [{ title: "MDN: JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }], web_project_structure: [{ title: "Next.js Project Structure", url: "https://nextjs.org/docs/app/getting-started/project-structure" }], web_documentation: [{ title: "GitHub README guide", url: "https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes" }], web_contribution_history: [{ title: "Git commit guidance", url: "https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project" }],
  design_visual_consistency: [{ title: "Nielsen Norman Group: Visual hierarchy", url: "https://www.nngroup.com/articles/visual-hierarchy-ux-definition/" }], design_process_iteration: [{ title: "Design Council: Double Diamond", url: "https://www.designcouncil.org.uk/our-resources/the-double-diamond/" }], design_narrative: [{ title: "Nielsen Norman Group: UX portfolios", url: "https://www.nngroup.com/articles/ux-design-portfolios/" }], design_problem_solving: [{ title: "IDEO: Design thinking", url: "https://designthinking.ideo.com/" }],
  marketing_methodology: [{ title: "Google: Digital marketing fundamentals", url: "https://skillshop.exceedlms.com/student/catalog/list?category_ids=53-google-ads" }], marketing_data_use: [{ title: "Google Analytics Academy", url: "https://skillshop.exceedlms.com/student/catalog/list?category_ids=540-google-analytics" }], marketing_measurable_results: [{ title: "Google Ads measurement", url: "https://support.google.com/google-ads/answer/1722022" }], marketing_report_quality: [{ title: "Looker Studio fundamentals", url: "https://support.google.com/looker-studio/answer/6283323" }],
};

export default function ResultView({ id }: { id: string }) {
  const router = useRouter();
  const { items, loading, error } = useAssessments(id);
  const result = items[0];
  if (loading) return <section className="page-head"><p>Memuat hasil...</p></section>;
  if (error) return <section className="page-head"><div className="alert" role="alert">{error}</div><Link className="button" href="/auth">Masuk</Link></section>;
  if (!result) return <section className="page-head"><p className="eyebrow">Hasil</p><h1>Hasil tidak ditemukan.</h1><p>Hasil demo tersimpan pada browser yang menjalankan penilaian.</p><Link className="button" href="/assess">Mulai penilaian</Link></section>;
  const rubric = rubrics[result.role]; const gaps = result.criteria.filter(({ score }) => score !== null && score < 75).sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 3);
  async function remove() { try { await removeAssessment(id); router.push("/history"); } catch (cause) { alert(cause instanceof Error ? cause.message : "Hasil gagal dihapus."); } }
  return <><header className="page-head"><p className="eyebrow">Rubrik {result.rubric_version} · {result.role}</p><h1>{result.finalScore === null ? "Bukti belum cukup" : <span className="score">{result.finalScore}<small>/100</small></span>}</h1><p className="lede">Penilaian indikatif berdasarkan bukti yang dikirim. Bukan verifikasi identitas, kepemilikan karya, atau jaminan diterima kerja.</p></header><section className="panel">
    {result.criteria.map((item, index) => { const criterion = rubric.find(({ id: criterionId }) => criterionId === item.criterion_id); return <article className="criterion" key={item.criterion_id}><div><p className="eyebrow">Kriteria {index + 1}</p><h3>{criterion?.label}</h3><strong>{item.score === null ? "Bukti kurang" : `${item.score}/100`}</strong><p className="hint">Confidence: {item.confidence}</p></div><div><p>{item.reason}</p><div>{item.evidence_refs.map((ref) => <span className="marker" key={ref}>{ref}</span>)}</div></div></article>; })}
  </section><section className="section grid-3"><article><p className="eyebrow">Kekuatan</p>{result.strengths.map((item) => <p key={item}>{item}</p>)}</article><article><p className="eyebrow">Gap utama</p>{result.gaps.map((item) => <p key={item}>{item}</p>)}</article><article><p className="eyebrow">Batas penilaian</p>{result.limitations.map((item) => <p key={item}>{item}</p>)}</article></section>
  <section className="section"><p className="eyebrow">Langkah berikutnya</p><h2>Materi dari katalog terkurasi.</h2><div className="grid-3">{gaps.map((gap) => { const resource = resources[gap.criterion_id]?.[0]; return resource && <a className="card" href={resource.url} target="_blank" rel="noreferrer" key={gap.criterion_id}><strong>{resource.title}</strong><p>Dipilih untuk gap {rubric.find(({ id: criterionId }) => criterionId === gap.criterion_id)?.label.toLowerCase()}.</p></a>; })}</div><div className="actions"><Link className="button" href={`/interview/${id}`}>Mulai wawancara</Link><Link className="button secondary" href="/assess">Nilai bukti baru</Link><button className="button secondary" onClick={remove}>Hapus hasil</button></div></section></>;
}
