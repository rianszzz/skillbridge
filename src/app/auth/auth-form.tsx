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
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace(next); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY") setRecovery(true); else if (session) router.replace(next); });
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get("error_code");
    if (code) {
      history.replaceState(null, "", location.pathname);
      queueMicrotask(() => {
        setError(code === "otp_expired" ? "Link konfirmasi tidak valid, sudah dipakai, atau kedaluwarsa. Minta link baru lalu gunakan email terbaru." : params.get("error_description") ?? "Konfirmasi email gagal.");
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
      if (recovery) {
        const { error: updateError } = await supabase.auth.updateUser({ password: credentials.password });
        if (updateError) return setError(authErrorMessage(updateError));
        setRecovery(false); setMessage("Password berhasil diperbarui. Anda sekarang dapat melanjutkan."); router.replace(next); router.refresh(); return;
      }
      const result = mode === "login" ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: `${location.origin}/auth?next=${encodeURIComponent(next)}` } });
      if (result.error) return setError(authErrorMessage(result.error));
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
      if (resendError) return setError(authErrorMessage(resendError));
      setMessage("Jika permintaan dapat diproses, petunjuk konfirmasi baru akan dikirim. Abaikan link lama.");
    } catch (cause) { setError(cause instanceof Error ? authErrorMessage(cause) : "Permintaan kirim ulang gagal. Coba lagi."); }
    finally { setLoading(false); }
  }

  async function forgotPassword() {
    if (!email) return setError("Isi email akun terlebih dahulu.");
    setLoading(true); setError(""); setMessage("");
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth?recovery=1` });
      if (resetError) return setError(authErrorMessage(resetError));
      setMessage("Jika akun tersedia, link reset password akan dikirim. Periksa inbox, spam, dan All Mail.");
    } catch (cause) { setError(cause instanceof Error ? authErrorMessage(cause) : "Reset password gagal diminta."); }
    finally { setLoading(false); }
  }

  return <section className="form-shell"><form className="panel" method="post" onSubmit={submit}>{error && <div className="alert" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={recovery}/></div><div className="field"><label htmlFor="password">{recovery ? "Password baru" : "Password"}</label><input id="password" name="password" type="password" autoComplete={mode === "login" && !recovery ? "current-password" : "new-password"} minLength={8} required/></div><div className="actions"><button className="button" disabled={loading}>{loading ? "Memproses..." : recovery ? "Simpan password baru" : mode === "login" ? "Masuk" : "Buat akun"}</button>{!recovery && <button type="button" className="button secondary" onClick={resend} disabled={loading || !email}>Kirim ulang konfirmasi</button>}{mode === "login" && !recovery && <button type="button" className="button secondary" onClick={forgotPassword} disabled={loading || !email}>Lupa password</button>}</div></form><aside className="panel"><h2>{recovery ? "Atur ulang akun" : mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}</h2>{!recovery && <button type="button" className="button secondary" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Daftar" : "Masuk"}</button>}<p className="hint">Konfirmasi email wajib sebelum login. Jika email belum tiba, periksa spam dan All Mail lalu gunakan kirim ulang. Gunakan lupa password untuk akun lama.</p></aside></section>;
}
