"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/auth-client";

export default function AuthStatus() {
  const [email, setEmail] = useState<string>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!email) return <Link href="/auth">Masuk</Link>;
  return <button className="nav-button" onClick={() => supabase.auth.signOut()}>Keluar</button>;
}
