"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { roles } from "@/lib/rubrics";
import { authHeaders } from "@/lib/auth-client";
import type { Field } from "@/lib/types";

const guidance: Record<Field, { title: string; body: string; hint: string }> = {
  informatics: { title: "Repositori kode", body: "Kualitas kode, struktur proyek, dokumentasi README, dan pola kontribusi.", hint: "Kode tidak dijalankan. Sistem membaca metadata, tree, README, dan 10 commit terbaru." },
  design: { title: "Karya visual dan proses", body: "Konsistensi visual, proses/iterasi, narasi portofolio, dan pemecahan masalah desain.", hint: "Unggah satu PNG/JPEG hasil karya. Jelaskan brief, audiens, keputusan, dan minimal dua tahap proses atau iterasi." },
  marketing: { title: "Laporan studi kasus", body: "Metodologi analitis, penggunaan data, hasil kampanye/penjualan terukur, dan kualitas laporan.", hint: "Unggah satu PDF dengan text layer berisi tujuan, metode, periode, tabel/metrik, hasil, dan tindak lanjut." },
};

export default function AssessmentForm() {
  const router = useRouter();
  const [field, setField] = useState<Field>("informatics");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File>();
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  function resetOperation() { idempotencyKey.current = crypto.randomUUID(); }
  function changeField(next: Field) { setField(next); setFile(undefined); setDescription(""); setUrl(""); setError(""); resetOperation(); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      let response: Response;
      if (field === "informatics") {
        response = await fetch("/api/assess", { method: "POST", headers: { ...await authHeaders(), "Idempotency-Key": idempotencyKey.current }, body: JSON.stringify({ role: roles[field], sourceUrl: url, consent }) });
      } else {
        if (!file) throw new Error("Pilih satu file bukti.");
        const form = new FormData(); form.set("field", field); form.set("file", file); form.set("description", description); form.set("consent", String(consent));
        response = await fetch("/api/assess", { method: "POST", headers: { ...await authHeaders(false), "Idempotency-Key": idempotencyKey.current }, body: form });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      resetOperation();
      router.push(`/results/${data.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Penilaian belum dapat diproses."); }
    finally { setLoading(false); }
  }

  return <div className="form-shell"><form className="panel" onSubmit={submit} aria-busy={loading}>{error && <div className="alert" role="alert">{error}</div>}
    <div className="field"><label htmlFor="field">Bidang dan target peran</label><select id="field" value={field} onChange={(event) => changeField(event.target.value as Field)}><option value="informatics">Informatika — Junior Web Developer</option><option value="design">DKV — Junior Graphic Designer</option><option value="marketing">Bisnis/Pemasaran — Junior Digital Marketer</option></select><p className="hint">Rubrik versi 1.0 dipilih dari target ini.</p></div>
    {field === "informatics" ? <div className="field"><label htmlFor="url">URL repositori GitHub publik</label><input id="url" type="url" required placeholder="https://github.com/pemilik/repositori" value={url} onChange={(event) => { setUrl(event.target.value); resetOperation(); }} aria-describedby="evidence-hint"/><p className="hint" id="evidence-hint">{guidance[field].hint}</p></div> : <>
      <div className="field"><label htmlFor="file">{field === "design" ? "Gambar hasil karya" : "PDF laporan kampanye"}</label><input id="file" type="file" required accept={field === "design" ? "image/png,image/jpeg" : "application/pdf"} onChange={(event) => { setFile(event.target.files?.[0]); resetOperation(); }} aria-describedby="evidence-hint"/><p className="hint" id="evidence-hint">{guidance[field].hint} Maksimal 4 MB{field === "marketing" ? " dan 15 halaman" : ""}.</p>{file && <p className="chip">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}</div>
      {field === "design" && <div className="field"><label htmlFor="description">Deskripsi proyek dan proses</label><textarea id="description" required minLength={80} maxLength={5000} rows={7} value={description} onChange={(event) => { setDescription(event.target.value); resetOperation(); }} aria-describedby="description-hint"/><p className="hint" id="description-hint">Minimal 80 karakter. Sertakan brief/masalah, target audiens, keputusan visual, dan minimal dua tahap atau iterasi.</p></div>}
    </>}
    <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required/><span><strong>Persetujuan pemrosesan AI</strong><br/><span className="hint">Bukti dikirim ke Groq untuk dinilai. Nama dan email tidak dibutuhkan. Saya memahami batas penilaian dan dapat menghapus hasil melalui akun.</span></span></label>
    <div className="actions"><button className="button" disabled={loading || !consent}>{loading ? field === "informatics" ? "Mengekstrak dan menilai..." : "Mengunggah dan menilai..." : "Kirim dan nilai bukti"}</button></div>
  </form><aside className="panel"><p className="eyebrow">Sebelum mengirim</p><h3>{guidance[field].title}</h3><p>{guidance[field].body}</p><hr/><p className="hint">Hasil dan file tersimpan privat di Supabase. File hanya diproses server dan dapat dihapus bersama hasil.</p></aside></div>;
}
