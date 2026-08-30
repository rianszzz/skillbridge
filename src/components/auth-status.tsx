"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/auth-client";

export default function AuthStatus() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean>();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (authenticated === undefined) return null;
  if (!authenticated) return <><Link href="/auth?mode=signup">Daftar</Link><Link href="/auth">Masuk</Link></>;

  async function signOut() {
    await getSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return <><Link href="/assess">Penilaian</Link><Link href="/history">Riwayat</Link><button className="nav-button" onClick={signOut}>Keluar</button></>;
}
