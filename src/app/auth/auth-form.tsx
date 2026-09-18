"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export default function AuthForm({
  initialMode = "login",
  initialRole = "candidate",
  next = "/assess",
}: {
  initialMode?: "login" | "signup";
  initialRole?: "candidate" | "recruiter";
  next?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [role, setRole] = useState<"candidate" | "recruiter">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(false);

  const resolveDestination = useCallback(
    (userRole?: string) => {
      if (userRole === "recruiter") {
        return next && next !== "/assess" ? next : "/recruiter";
      }
      if (next === "/recruiter" && userRole === "candidate") {
        return "/assess";
      }
      return next || (userRole === "recruiter" ? "/recruiter" : "/assess");
    },
    [next],
  );

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const userRole =
          data.session.user.user_metadata?.role ||
          data.session.user.user_metadata?.account_role;
        router.replace(resolveDestination(userRole));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
      } else if (session) {
        const userRole =
          session.user.user_metadata?.role ||
          session.user.user_metadata?.account_role;
        router.replace(resolveDestination(userRole));
      }
    });
    const params = new URLSearchParams(location.hash.slice(1));
    const code = params.get("error_code");
    if (code) {
      history.replaceState(null, "", location.pathname);
      queueMicrotask(() => {
        setError(
          code === "otp_expired"
            ? "Link konfirmasi tidak valid, sudah dipakai, atau kedaluwarsa. Minta link baru lalu gunakan email terbaru."
            : params.get("error_description") ?? "Konfirmasi email gagal.",
        );
      });
    }
    return () => listener.subscription.unsubscribe();
  }, [next, router, resolveDestination]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")), password: String(form.get("password")) };
    const selectedRole = mode === "signup" ? role : undefined;

    try {
      const supabase = getSupabase();
      if (recovery) {
        const { error: updateError } = await supabase.auth.updateUser({ password: credentials.password });
        if (updateError) return setError(authErrorMessage(updateError));
        setRecovery(false);
        setMessage("Password berhasil diperbarui. Anda sekarang dapat melanjutkan.");
        router.replace(resolveDestination());
        router.refresh();
        return;
      }

      const destination = resolveDestination(selectedRole);
      const emailRedirectTo = `${location.origin}/auth?role=${selectedRole ?? "candidate"}&next=${encodeURIComponent(destination)}`;

      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp({
              ...credentials,
              options: {
                emailRedirectTo,
                data: {
                  role: selectedRole,
                  account_role: selectedRole,
                },
              },
            });

      if (result.error) return setError(authErrorMessage(result.error));
      if (result.data.session) {
        const userRole =
          result.data.user?.user_metadata?.role ||
          result.data.user?.user_metadata?.account_role ||
          selectedRole;
        router.replace(resolveDestination(userRole));
        router.refresh();
      } else {
        setMessage(
          "Jika pendaftaran dapat diproses, petunjuk konfirmasi akan dikirim. Periksa inbox dan spam. Jika email ini sudah terdaftar, silakan masuk.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? authErrorMessage(cause) : "Autentikasi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) return setError("Isi email akun yang ingin dikonfirmasi.");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const supabase = getSupabase();
      const destination = resolveDestination(role);
      const emailRedirectTo = `${location.origin}/auth?role=${role}&next=${encodeURIComponent(destination)}`;
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });
      if (resendError) return setError(authErrorMessage(resendError));
      setMessage("Jika permintaan dapat diproses, petunjuk konfirmasi baru akan dikirim. Abaikan link lama.");
    } catch (cause) {
      setError(cause instanceof Error ? authErrorMessage(cause) : "Permintaan kirim ulang gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!email) return setError("Isi email akun terlebih dahulu.");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth?recovery=1`,
      });
      if (resetError) return setError(authErrorMessage(resetError));
      setMessage("Jika akun tersedia, link reset password akan dikirim. Periksa inbox, spam, dan All Mail.");
    } catch (cause) {
      setError(cause instanceof Error ? authErrorMessage(cause) : "Reset password gagal diminta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-shell">
      <form className="panel" method="post" onSubmit={submit}>
        {error && (
          <div className="alert" role="alert">
            <div>{error}</div>
            {error.includes("belum dikonfirmasi") && (
              <button
                type="button"
                className="button secondary"
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  padding: "0.35rem 0.75rem",
                  width: "auto",
                }}
                onClick={resend}
                disabled={loading || !email}
              >
                Kirim ulang email konfirmasi
              </button>
            )}
          </div>
        )}
        {message && <div className="notice" role="status">{message}</div>}

        {mode === "signup" && !recovery && (
          <fieldset className="field" style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
            <legend style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Peran Akun</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  border: `2px solid ${role === "candidate" ? "var(--ink)" : "var(--line)"}`,
                  background: role === "candidate" ? "var(--chalk)" : "white",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                <input
                  type="radio"
                  name="account_role"
                  value="candidate"
                  checked={role === "candidate"}
                  onChange={() => setRole("candidate")}
                  style={{ width: "auto", minHeight: "auto", margin: 0 }}
                />
                Pencari Kerja / Mahasiswa
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  border: `2px solid ${role === "recruiter" ? "var(--ink)" : "var(--line)"}`,
                  background: role === "recruiter" ? "var(--chalk)" : "white",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                <input
                  type="radio"
                  name="account_role"
                  value="recruiter"
                  checked={role === "recruiter"}
                  onChange={() => setRole("recruiter")}
                  style={{ width: "auto", minHeight: "auto", margin: 0 }}
                />
                Perekrut / HR
              </label>
            </div>
            <p className="hint" style={{ marginTop: "0.4rem" }}>
              {role === "recruiter"
                ? "Akun Perekrut diarahkan ke Talent Pool industri untuk menyaring talenta siap kerja."
                : "Akun Pencari Kerja diarahkan ke form penilaian untuk mengevaluasi bukti karya portofolio."}
            </p>
          </fieldset>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={recovery}
          />
        </div>

        <div className="field">
          <label htmlFor="password">{recovery ? "Password baru" : "Password"}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" && !recovery ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="actions">
          <button className="button" disabled={loading}>
            {loading
              ? "Memproses..."
              : recovery
                ? "Simpan password baru"
                : mode === "login"
                  ? "Masuk"
                  : "Buat akun"}
          </button>
          {mode === "signup" && !recovery && Boolean(email.trim() && password) && (
            <button
              type="button"
              className="button secondary"
              onClick={resend}
              disabled={loading || !email}
            >
              Kirim ulang konfirmasi
            </button>
          )}
          {mode === "login" && !recovery && (
            <button
              type="button"
              className="button secondary"
              onClick={forgotPassword}
              disabled={loading || !email}
            >
              Lupa password
            </button>
          )}
        </div>
      </form>

      <aside className="panel">
        <h2>
          {recovery
            ? "Atur ulang akun"
            : mode === "login"
              ? "Belum punya akun?"
              : "Sudah punya akun?"}
        </h2>
        {!recovery && (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setMessage("");
            }}
          >
            {mode === "login" ? "Daftar" : "Masuk"}
          </button>
        )}
        <p className="hint">
          {mode === "signup"
            ? "Konfirmasi email wajib setelah pendaftaran. Jika email belum tiba, periksa spam dan All Mail lalu gunakan kirim ulang."
            : "Gunakan email dan password terdaftar. Gunakan lupa password jika Anda tidak dapat mengakses akun."}
        </p>
      </aside>
    </section>
  );
}
