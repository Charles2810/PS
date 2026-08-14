# AGENTS.md

Sistema de prospección de clientes: busca negocios vía Google Places API v1, evalúa reglas de negocio y guarda prospectos + diagnósticos en Supabase. TypeScript + Express, desplegado en Vercel (serverless) y Render.

## Two distinct execution surfaces (do not conflate)

- `src/` — **Express app** used by Render/local. Entrypoint `src/index.ts` (loads `dotenv`), app factory in `src/app.ts`. Run with `npm run dev` (ts-node) or `npm start` (`dist/src/index.js`).
- `api/` — **Vercel serverless functions** using the native Web `Request`/`Response` API. Each file exports `POST`/`GET` handlers. They import `src/services/*` directly and do **not** load dotenv — env comes from Vercel dashboard vars.

Changes to `src/routes/` or controllers only affect the Express app. To change the Vercel behavior, edit `api/*.ts`. There is no shared HTTP layer between the two.

## Commands

| Command | Works | Notes |
| --- | --- | --- |
| `npm run dev` | yes | ts-node, not watch (README claim is stale) |
| `npm run build` | yes | `tsc`; emits `dist/api/` and `dist/src/` (tsconfig `rootDir: "."` includes both trees) |
| `npm run type-check` | yes | `tsc --noEmit` — the reliable pre-commit check |
| `npm run lint` | **no** | eslint not in devDependencies and no `.eslintrc` exists; script will fail |
| `npm test` | **no** | jest not installed, no tests, no jest config |

No CI, no Prettier config, no `.github/`. `type-check` is the only working gate.

## Env & config

- `src/index.ts` loads `.env`; Vercel functions do not. New env vars must be added to `.env`, Vercel project settings, and `render.yaml`.
- `src/config/supabase.ts` initializes the Supabase client **at module import time** and throws if `SUPABASE_URL`/`SUPABASE_KEY` are missing — any unit test or dev script importing `src/services/prospector` needs these set or it crashes on import.
- All env vars: `.env.example`.

## Vercel build quirks (hard-earned)

- `vercel.json` uses `functions` (NOT `builds` — the two conflict), `outputDirectory: "dist"` (static-build requires a real output dir; `tsc` emits `dist/`), and explicit `routes` mapping `/api/*` to `api/*.ts`.
- Do **not** set `runtime` inside `functions` — invalid syntax. Node version is pinned via `package.json` `"engines": { "node": "24.x" }` (Node 20 deprecated; `@supabase/supabase-js@2.112+` needs ≥22).

## Google Places & business rules

- Uses the **new Places API v1**: POST `places:searchNearby` with `X-Goog-FieldMask` header (`src/config/google-places.ts`, `src/services/prospector.ts`). Not the legacy `textsearch`/`findplace`.
- Hardcoded `regionCode: 'PE'`, `languageCode: 'es'`, max 20 results, 10s timeout.
- Regla A: no `websiteUri` → Landing Page (Alta). Regla B: `userRatingCount > 150` → B2B system (Alta sin web, Media con web). Only prospects matching ≥1 rule are persisted; upsert keyed on `place_id`.

## Supabase

- `supabase/schema.sql` is applied manually via Supabase SQL Editor — not migrations, not in CI. If you change tables, update this file and re-run.
- RLS policies are intentionally permissive for the anon key (local testing). Production hardening (revoke anon, service_role only) is documented in comments at the bottom of `schema.sql`.
- `public.limites_uso` + RPC `consumir_uso` back the Vercel request limits (`src/services/rateLimiter.ts`, wired into `api/prospectar.ts`): per-IP/day (`RATE_LIMIT_MAX_POR_DIA`, default 10) and a global monthly budget (`PRESUPUESTO_MENSUAL_GOOGLE`, default 800) to stay under Google's ~1,000 free calls/month. The RPC is `security definer`; the table has RLS on with no policies (only accessed via the RPC). These limits apply ONLY to the Vercel path — Express keeps its own `express-rate-limit`.

## Conventions

- All code, comments, error messages, and docs are in **Spanish**; keep that when adding code.
- `tsconfig` is strict with `noUnusedLocals`/`noUnusedParameters` — build fails on unused vars.
- Request validation: Express uses Joi (`src/middleware/validator.ts`); Vercel `api/prospectar.ts` re-implements it manually. Keep both in sync.

## Verify before assuming

- After any change: `npm run type-check` then `npm run build`.
- Manual local check: `npm run dev` → `GET http://localhost:3000/api/health`. Full prospection requires real Supabase + Google API keys in `.env`.
