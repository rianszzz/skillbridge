"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/auth-client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean>();

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session) {
        setAllowed(false);
        router.replace("/auth?next=/assess");
        return;
      }
      const role =
        session.user.user_metadata?.role ||
        session.user.user_metadata?.account_role;
      if (role === "recruiter") {
        setAllowed(false);
        router.replace("/recruiter");
        return;
      }
      setAllowed(true);
    });
  }, [router]);

  if (!allowed) return <main id="main"><section className="page-head"><p>Memeriksa sesi...</p></section></main>;
  return children;
}
