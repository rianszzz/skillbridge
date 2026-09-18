"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/auth-client";

export default function AuthStatus() {
  const router = useRouter();
  const [authState, setAuthState] = useState<{
    authenticated: boolean;
    role: string | null;
  }>();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      const role = (user?.user_metadata?.role || user?.user_metadata?.account_role || null) as string | null;
      setAuthState({ authenticated: Boolean(data.session), role });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const role = (user?.user_metadata?.role || user?.user_metadata?.account_role || null) as string | null;
      setAuthState({ authenticated: Boolean(session), role });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (authState === undefined) return null;

  async function signOut() {
    await getSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!authState.authenticated) {
    return (
      <>
        <Link href="/jobs">Lowongan</Link>
        <Link href="/auth?mode=signup">Daftar</Link>
        <Link href="/auth">Masuk</Link>
      </>
    );
  }

  if (authState.role === "recruiter") {
    return (
      <>
        <Link href="/jobs">Lowongan</Link>
        <Link href="/recruiter">Portal HR</Link>
        <button className="nav-button" onClick={signOut}>Keluar</button>
      </>
    );
  }

  return (
    <>
      <Link href="/jobs">Lowongan</Link>
      <Link href="/assess">Penilaian</Link>
      <Link href="/history">Riwayat</Link>
      <button className="nav-button" onClick={signOut}>Keluar</button>
    </>
  );
}
