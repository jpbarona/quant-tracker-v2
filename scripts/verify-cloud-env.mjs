const validateBuildEnv = (env) => {
  const runningOnCloudflarePages = env.CF_PAGES === '1'
  const productionBuild = env.NODE_ENV === 'production' || runningOnCloudflarePages

  if (!productionBuild) {
    return { ok: true }
  }

  const url = env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url && !anonKey) {
    return {
      ok: false,
      message:
        'Build failed: production build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, but both are missing.',
    }
  }

  if (!url) {
    return {
      ok: false,
      message: 'Build failed: production build requires VITE_SUPABASE_URL, but it is missing.',
    }
  }

  if (!anonKey) {
    return {
      ok: false,
      message: 'Build failed: production build requires VITE_SUPABASE_ANON_KEY, but it is missing.',
    }
  }

  return { ok: true }
}

const result = validateBuildEnv(process.env)

if (!result.ok) {
  console.error(result.message)
  console.error('Add them under Cloudflare Pages → Settings → Environment variables, then redeploy.')
  process.exit(1)
}
