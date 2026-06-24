const validateBuildEnv = (env) => {
  const runningOnCloudflarePages = env.CF_PAGES === '1'
  const productionBuild = env.NODE_ENV === 'production' || runningOnCloudflarePages

  if (!productionBuild) {
    return { ok: true, warning: null }
  }

  const url = env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url && !anonKey) {
    return {
      ok: true,
      warning:
        'Build warning: production build is missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Deploy will build, but runtime boot will fail with a Cloud persistence error screen.',
    }
  }

  if (!url) {
    return {
      ok: true,
      warning:
        'Build warning: production build is missing VITE_SUPABASE_URL. Deploy will build, but runtime boot will fail with a Cloud persistence error screen.',
    }
  }

  if (!anonKey) {
    return {
      ok: true,
      warning:
        'Build warning: production build is missing VITE_SUPABASE_ANON_KEY. Deploy will build, but runtime boot will fail with a Cloud persistence error screen.',
    }
  }

  return { ok: true, warning: null }
}

const result = validateBuildEnv(process.env)

if (result.warning) {
  console.warn(result.warning)
  console.warn('Set env vars in Cloudflare Pages → Settings → Environment variables.')
}
