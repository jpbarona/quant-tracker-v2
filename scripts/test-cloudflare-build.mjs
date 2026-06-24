import { spawnSync } from 'node:child_process'

const buildEnv = {
  ...process.env,
  CF_PAGES: '1',
  NODE_ENV: 'production',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
}

const run = (command, args, timeout, envOverrides = {}) => {
  const result = spawnSync(command, args, {
    env: { ...buildEnv, ...envOverrides },
    encoding: 'utf-8',
    timeout,
  })
  if (result.error) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(`${command} ${args.join(' ')} exited ${result.status}.\n${output}`)
  }
  return result
}

try {
  const verify = run('node', ['scripts/verify-cloud-env.mjs'], 30000)
  if (!verify.stderr.includes('Build warning: production build is missing')) {
    throw new Error('verify-cloud-env did not emit missing-env warning.')
  }

  run('node', ['./node_modules/typescript/bin/tsc', '-b'], 120000)
  const configuredVerify = run(
    'node',
    ['scripts/verify-cloud-env.mjs'],
    30000,
    {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    },
  )
  if (configuredVerify.stderr.includes('Build warning: production build is missing')) {
    throw new Error('verify-cloud-env still warns when Supabase env vars are present.')
  }

  console.log('Cloudflare preflight test passed.')
} catch (error) {
  console.error(`Cloudflare preflight test failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
