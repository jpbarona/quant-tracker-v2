import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { assertCloudEnvConfigured, CloudPersistenceError, isCloudRequired } from './cloudConfig'

describe('isCloudRequired', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when VITE_REQUIRE_CLOUD is unset', () => {
    vi.stubEnv('VITE_REQUIRE_CLOUD', '')
    expect(isCloudRequired()).toBe(false)
  })

  it('is true when VITE_REQUIRE_CLOUD is true', () => {
    vi.stubEnv('VITE_REQUIRE_CLOUD', 'true')
    expect(isCloudRequired()).toBe(true)
  })
})

describe('assertCloudEnvConfigured', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_REQUIRE_CLOUD', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when both env vars are missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(() => assertCloudEnvConfigured()).toThrow(CloudPersistenceError)
    expect(() => assertCloudEnvConfigured()).toThrow(/both missing/)
  })

  it('throws when only url is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key')
    expect(() => assertCloudEnvConfigured()).toThrow(/VITE_SUPABASE_URL is missing/)
  })

  it('throws when only anon key is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(() => assertCloudEnvConfigured()).toThrow(/VITE_SUPABASE_ANON_KEY is missing/)
  })

  it('returns trimmed values when configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '  https://example.supabase.co  ')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '  anon-key  ')
    expect(assertCloudEnvConfigured()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    })
  })
})
