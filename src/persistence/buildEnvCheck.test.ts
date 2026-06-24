import { describe, expect, it } from 'vitest'
import { validateBuildEnv } from './buildEnvCheck'

describe('validateBuildEnv', () => {
  it('passes for non-production builds without Supabase vars', () => {
    const result = validateBuildEnv({ NODE_ENV: 'development' })
    expect(result).toEqual({ ok: true })
  })

  it('fails in production when both Supabase vars are missing', () => {
    const result = validateBuildEnv({ NODE_ENV: 'production' })
    expect(result).toEqual({
      ok: false,
      message:
        'Build failed: production build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, but both are missing.',
    })
  })

  it('fails in production when url is missing', () => {
    const result = validateBuildEnv({
      NODE_ENV: 'production',
      VITE_SUPABASE_ANON_KEY: 'key',
    })
    expect(result).toEqual({
      ok: false,
      message: 'Build failed: production build requires VITE_SUPABASE_URL, but it is missing.',
    })
  })

  it('fails in production when anon key is missing', () => {
    const result = validateBuildEnv({
      NODE_ENV: 'production',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
    })
    expect(result).toEqual({
      ok: false,
      message: 'Build failed: production build requires VITE_SUPABASE_ANON_KEY, but it is missing.',
    })
  })

  it('passes in production when both Supabase vars are present', () => {
    const result = validateBuildEnv({
      NODE_ENV: 'production',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    })
    expect(result).toEqual({ ok: true })
  })
})
