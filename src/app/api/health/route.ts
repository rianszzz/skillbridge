export async function GET() {
  const configured = Boolean(
    process.env.GROQ_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  let supabase = false;
  if (configured) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        cache: "no-store",
      });
      supabase = response.ok;
    } catch {}
  }
  const healthy = configured && supabase;
  return Response.json(
    { status: healthy ? "ok" : "misconfigured", service: "skillbridge-ai", checks: { supabase } },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
