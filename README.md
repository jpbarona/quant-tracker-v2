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

Without these values, the app runs in local-storage fallback mode.

## Supabase setup

1. Create a Supabase project.
2. Run migration in `supabase/migrations/20260620150000_init_app_state.sql`.
3. Add Vite env variables locally and in Cloudflare Pages.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Pages environment variables.

Optional manual deploy:

```bash
npx wrangler pages deploy dist --project-name quant-tracker-v2
```
# quant-tracker-v2
