import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const scriptPath = resolve(process.cwd(), 'scripts/verify-cloud-env.mjs')

const runScript = (env: Record<string, string | undefined>) =>
  spawnSync('node', [scriptPath], {
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  })

describe('verify-cloud-env script', () => {
  it('fails in production when Supabase vars are missing', () => {
    const result = runScript({
      NODE_ENV: 'production',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Build failed: production build requires VITE_SUPABASE_URL')
  })

  it('passes outside production without Supabase vars', () => {
    const result = runScript({
      NODE_ENV: 'development',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    })
    expect(result.status).toBe(0)
  })

  it('fails on Cloudflare Pages when Supabase vars are missing', () => {
    const result = runScript({
      CF_PAGES: '1',
      NODE_ENV: 'development',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Build failed: production build requires VITE_SUPABASE_URL')
  })
})
