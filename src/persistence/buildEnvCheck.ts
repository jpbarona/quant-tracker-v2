export interface BuildEnvCheckResult {
  ok: boolean
  message?: string
}

export interface BuildEnv {
  NODE_ENV?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

export const validateBuildEnv = (env: BuildEnv): BuildEnvCheckResult => {
  if (env.NODE_ENV !== 'production') {
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
