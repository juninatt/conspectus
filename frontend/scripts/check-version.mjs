// Fails if the frontend and backend versions differ: the app has one version.
import { readFileSync } from 'node:fs'

const frontend = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version
const pyproject = readFileSync(
  new URL('../../backend/pyproject.toml', import.meta.url),
  'utf8',
)
const backend = pyproject.match(/^version\s*=\s*"([^"]+)"/m)?.[1]

if (frontend !== backend) {
  console.error(
    `Version mismatch: frontend ${frontend}, backend ${backend ?? 'not found'}`,
  )
  process.exit(1)
}
console.log(`Versions match: ${frontend}`)
