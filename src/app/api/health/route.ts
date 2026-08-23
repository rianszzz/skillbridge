export function GET() {
  const configured = Boolean(
    process.env.GROQ_API_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return Response.json(
    { status: configured ? "ok" : "misconfigured", service: "skillbridge-ai" },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
