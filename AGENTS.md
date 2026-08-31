# AGENTS.md

## Stack

- Single Next.js 16 + React 19 app (TypeScript, Tailwind v4). Node 22 required (`engines`).
- Supabase = Auth + Postgres + Storage. Groq = LLM (assessment + vision). No other runtime deps.
- Logic lives in `src/lib` (colocated tests), API routes in `src/app/api`. No CI; tests are the gate.

## Commands

- `npm run check` — lint → typecheck → test → build. Run before any commit/deploy.
- `npm run deploy` — runs `check`, then `vercel --prod`.
- Single test: `node --test --experimental-strip-types src/lib/github.test.ts` — node:test with type stripping, not vitest/jest.
- Local share: `npm run dev:3001` + `npm run share` (ngrok). Ngrok URL changes per tunnel — add `<url>/auth` to Supabase Auth redirect allowlist each time.

## DB migrations

- `supabase/migrations/` applied manually via Supabase, strictly in order 001→004.
- Prod DB already at 001/002: apply only `003` + `004`. Re-running 001 breaks (policies/tables exist).
- Migration `003` must exist before deploying current code — assessment/interview endpoints fail safe without its RPCs (`consume_api_quota`, `save_assessment_atomic`).

## AI contract

`docs/AI_QUALITY_SECURITY.md` is binding; `docs/PRODUCT.md` is scope source of truth.

- Scores only anchors 0/25/50/75/100; `null` when `insufficient_evidence` (UI shows `—/100`). Final score computed by app, never taken from model output.
- Server strictly validates model JSON. Malformed output = error metadata only, never a completed assessment.
- Rubric/prompt/model/dataset changes must be recorded in `docs/AI_QUALITY_SECURITY.md`.
- Groq: `openai/gpt-oss-20b`, `response_format: json_object` (strict JSON schema was removed — it caused `json_validate_failed`), `maxRetries: 0`, timeout 22s assessment / 14s vision.
- Groq ~8k TPM: consecutive AI requests need ~65 s gap. Don't loop production assessment calls.
- Groq 429 must map to HTTP 429 `ai_rate_limit` + `Retry-After: 60` (`errorResponse` in `src/lib/api-security.ts`), never 500.
- Evidence quotes are grounded to markers: PDF `[PAGE:n:BLOCK:n]`, GitHub source `[FILE:n:Lx-Ly]`. Quotes not matching their referenced block are rejected server-side.
- User evidence is untrusted input, never instructions.

## Env & deploy

- Never prefix `GROQ_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`.
- `.vercelignore` excludes `.env*` except `.env.example`.
- Changing any `NEXT_PUBLIC_*` requires rebuild/redeploy — values are baked into the browser bundle.
- Production: https://skillbridge-6ndn.vercel.app — smoke test `GET /api/health` must return `{"status":"ok"}`.

## Conventions

- Docs and user-facing strings are Indonesian; keep them that way.
- Quota is enforced DB-side (per-user daily limit in migration 003 RPC), not in app code.
