const cloudRequired = process.env.VITE_REQUIRE_CLOUD === 'true'

if (!cloudRequired) {
  process.exit(0)
}

const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

if (!url && !anonKey) {
  console.error(
    'Build failed: VITE_REQUIRE_CLOUD=true but VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are both missing.',
  )
  console.error('Add them under Cloudflare Pages → Settings → Environment variables, then redeploy.')
  process.exit(1)
}

if (!url) {
  console.error('Build failed: VITE_REQUIRE_CLOUD=true but VITE_SUPABASE_URL is missing.')
  console.error('Add it under Cloudflare Pages → Settings → Environment variables, then redeploy.')
  process.exit(1)
}

if (!anonKey) {
  console.error('Build failed: VITE_REQUIRE_CLOUD=true but VITE_SUPABASE_ANON_KEY is missing.')
  console.error('Add it under Cloudflare Pages → Settings → Environment variables, then redeploy.')
  process.exit(1)
}
