"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export default function AuthForm({ initialMode = "login", next = "/assess" }: { initialMode?: "login" | "signup"; next?: "/assess" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace(next); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (session) router.replace(next); });
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get("error_code");
    if (code) {
      history.replaceState(null, "", location.pathname);
      queueMicrotask(() => {
        setError(code === "otp_expired" ? "Link konfirmasi tidak valid, sudah dipakai, atau kedaluwarsa. Minta link baru lalu gunakan email terbaru." : params.get("error_description") ?? "Konfirmasi email gagal.");
        setCanResend(code === "otp_expired");
      });
    }
    return () => listener.subscription.unsubscribe();
  }, [next, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")), password: String(form.get("password")) };
    try {
      const supabase = getSupabase();
      const result = mode === "login" ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: `${location.origin}/auth?next=${encodeURIComponent(next)}` } });
      if (result.error) { setCanResend(result.error.code === "email_not_confirmed"); return setError(authErrorMessage(result.error)); }
      if (result.data.session) { router.replace(next); router.refresh(); }
      else setMessage("Jika pendaftaran dapat diproses, petunjuk konfirmasi akan dikirim. Periksa inbox dan spam. Jika email ini sudah terdaftar, silakan masuk.");
    } catch (cause) { setError(cause instanceof Error ? authErrorMessage(cause) : "Autentikasi gagal. Coba lagi."); }
    finally { setLoading(false); }
  }

  async function resend() {
    if (!email) return setError("Isi email akun yang ingin dikonfirmasi.");
    setLoading(true); setError(""); setMessage("");
    try {
      const supabase = getSupabase();
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${location.origin}/auth?next=${encodeURIComponent(next)}` } });
      if (resendError) { if (/rate limit/i.test(resendError.message)) setCanResend(false); return setError(authErrorMessage(resendError)); }
      setCanResend(false);
      setMessage("Jika permintaan dapat diproses, petunjuk konfirmasi baru akan dikirim. Abaikan link lama.");
    } catch (cause) { setError(cause instanceof Error ? authErrorMessage(cause) : "Permintaan kirim ulang gagal. Coba lagi."); }
    finally { setLoading(false); }
  }

  return <section className="form-shell"><form className="panel" method="post" onSubmit={submit}>{error && <div className="alert" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required/></div><div className="actions"><button className="button" disabled={loading}>{loading ? "Memproses..." : mode === "login" ? "Masuk" : "Buat akun"}</button>{canResend && <button type="button" className="button secondary" onClick={resend} disabled={loading || !email}>Kirim ulang konfirmasi</button>}</div></form><aside className="panel"><h2>{mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}</h2><button type="button" className="button secondary" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); setCanResend(false); }}>{mode === "login" ? "Daftar" : "Masuk"}</button><p className="hint">Jika link konfirmasi kedaluwarsa, masuk dengan akun tersebut untuk menampilkan opsi kirim ulang. Link lama tidak dapat digunakan kembali.</p></aside></section>;
}
