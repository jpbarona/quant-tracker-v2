import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const MARKER = 'qt-local-dummy-seed-v1'
const ID_PREFIX = 'local-dummy-topic-0'
const distDir = 'dist'
const assetsDir = join(distDir, 'assets')

const buildEnv = {
  ...process.env,
  CF_PAGES: '1',
  NODE_ENV: 'production',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
}

const run = (command, args, timeout) => {
  const result = spawnSync(command, args, {
    env: buildEnv,
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
  run('node', ['./node_modules/typescript/bin/tsc', '-b'], 120000)
  run('node', ['./node_modules/vite/bin/vite.js', 'build'], 120000)

  const assetFiles = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))
  const hits = []

  for (const file of assetFiles) {
    const content = readFileSync(join(assetsDir, file), 'utf-8')
    if (content.includes(MARKER)) {
      hits.push(`${file}: ${MARKER}`)
    }
    if (content.includes(ID_PREFIX)) {
      hits.push(`${file}: ${ID_PREFIX}`)
    }
  }

  if (hits.length > 0) {
    console.error('Local dummy data leaked into production bundle:')
    for (const hit of hits) {
      console.error(`  - ${hit}`)
    }
    process.exit(1)
  }

  console.log('Production bundle does not contain local dummy data markers.')
} catch (error) {
  console.error(
    `Local dummy prod verification failed: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
} finally {
  rmSync(distDir, { recursive: true, force: true })
}
