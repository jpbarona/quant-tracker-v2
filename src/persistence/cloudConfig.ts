export const isCloudRequired = (): boolean => import.meta.env.PROD

export class CloudPersistenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CloudPersistenceError'
  }
}

export const assertCloudEnvConfigured = (): { url: string; anonKey: string } => {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url && !anonKey) {
    throw new CloudPersistenceError(
      'Cloud persistence is required in production but VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are both missing. Set them in Cloudflare Pages environment variables and redeploy.',
    )
  }
  if (!url) {
    throw new CloudPersistenceError(
      'Cloud persistence is required in production but VITE_SUPABASE_URL is missing. Set it in Cloudflare Pages environment variables and redeploy.',
    )
  }
  if (!anonKey) {
    throw new CloudPersistenceError(
      'Cloud persistence is required in production but VITE_SUPABASE_ANON_KEY is missing. Set it in Cloudflare Pages environment variables and redeploy.',
    )
  }

  return { url, anonKey }
}
