# Quant Interview Tracker MVP

Mobile-first dark-mode PWA for structured quant-interview practice with:

- Green / Yellow / Red / Off day protocol
- Readiness logging
- Mental-maths timer
- Timed attempts + short postmortem
- 1/3/7/21 review scheduling
- Automatic topic progression (Easy -> Medium -> Hard -> Mixed Practice)
- Adherence streaks + lightweight badges
- Supabase cloud persistence (single-user row model)

## Local run

```bash
make local
```

Equivalent:

```bash
npm install
npm run dev -- --host
```

## Environment

Copy `.env.example` to `.env` and provide:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Without these values, the app runs in local-storage fallback mode during local development.

## Supabase setup

1. Create a Supabase project.
2. Run migration in `supabase/migrations/20260620150000_init_app_state.sql`.
3. Add Vite env variables locally and in Cloudflare Pages.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Set these environment variables for **Production** (and Preview if used):

```bash
VITE_REQUIRE_CLOUD=true
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`VITE_REQUIRE_CLOUD=true` makes the build fail if Supabase env vars are missing, and makes the deployed app refuse to start without a working Supabase connection (no local-storage fallback). Do **not** set `VITE_REQUIRE_CLOUD` for local prototyping.

Optional manual deploy:

```bash
npx wrangler pages deploy dist --project-name quant-tracker-v2
```
