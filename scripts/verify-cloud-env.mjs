import { validateBuildEnv } from '../src/persistence/buildEnvCheck.ts'

const result = validateBuildEnv(process.env)

if (!result.ok) {
  console.error(result.message)
  console.error('Add them under Cloudflare Pages → Settings → Environment variables, then redeploy.')
  process.exit(1)
}
