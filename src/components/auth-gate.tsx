"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/auth-client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean>();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      const signedIn = Boolean(data.session);
      setAuthenticated(signedIn);
      if (!signedIn) router.replace("/auth?next=/assess");
    });
  }, [router]);

  if (!authenticated) return <main id="main"><section className="page-head"><p>Memeriksa sesi...</p></section></main>;
  return children;
}
