"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth-client";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get("error_code");
    if (!code) return;
    history.replaceState(null, "", location.pathname);
    queueMicrotask(() => {
      setError(code === "otp_expired" ? "Link konfirmasi tidak valid, sudah dipakai, atau kedaluwarsa. Minta link baru lalu gunakan email terbaru." : params.get("error_description") ?? "Konfirmasi email gagal.");
      setCanResend(code === "otp_expired");
    });
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")), password: String(form.get("password")) };
    const result = mode === "login" ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: `${location.origin}/auth` } });
    setLoading(false);
    if (result.error) return setError(result.error.message);
    if (result.data.session) { router.push("/assess"); router.refresh(); }
    else { setCanResend(true); setMessage("Periksa email untuk konfirmasi akun. Gunakan hanya link konfirmasi terbaru."); }
  }

  async function resend() {
    if (!email) return setError("Isi email akun yang ingin dikonfirmasi.");
    setLoading(true); setError(""); setMessage("");
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${location.origin}/auth` } });
    setLoading(false);
    if (resendError) return setError(resendError.message);
    setMessage("Link konfirmasi baru dikirim. Abaikan link lama dan buka hanya email terbaru.");
  }

  return <section className="form-shell"><form className="panel" method="post" onSubmit={submit}>{error && <div className="alert" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required/></div><div className="actions"><button className="button" disabled={loading}>{loading ? "Memproses..." : mode === "login" ? "Masuk" : "Buat akun"}</button>{canResend && <button type="button" className="button secondary" onClick={resend} disabled={loading || !email}>Kirim ulang konfirmasi</button>}</div></form><aside className="panel"><h2>{mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}</h2><button type="button" className="button secondary" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Daftar" : "Masuk"}</button><p className="hint">Jika link konfirmasi kedaluwarsa, kembali ke halaman ini dan minta link baru. Link lama tidak dapat digunakan kembali.</p></aside></section>;
}
