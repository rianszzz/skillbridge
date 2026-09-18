import AuthForm from "./auth-form";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; role?: string }>;
}) {
  const params = await searchParams;
  const signup = params.mode === "signup";
  const initialRole = params.role === "recruiter" ? "recruiter" : "candidate";
  const nextTarget =
    params.next && params.next.startsWith("/")
      ? params.next
      : initialRole === "recruiter"
        ? "/recruiter"
        : "/assess";

  return (
    <main id="main">
      <header className="page-head">
        <p className="eyebrow">Akun Skillbridge</p>
        <h1>{signup ? "Daftar untuk mulai menilai." : "Masuk untuk menyimpan bukti."}</h1>
        <p className="lede">
          {signup
            ? "Pilih peran akun Anda: evaluasi portofolio pelamar atau akses Talent Pool industri."
            : "Akun menjaga riwayat lintas perangkat dan mengisolasi data setiap pengguna."}
        </p>
      </header>
      <AuthForm
        initialMode={signup ? "signup" : "login"}
        initialRole={initialRole}
        next={nextTarget}
      />
    </main>
  );
}
