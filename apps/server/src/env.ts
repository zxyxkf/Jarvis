import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')
const envPath = resolve(root, '.env')
const fallbackPath = resolve(root, '.env.example')
const selectedPath = existsSync(envPath) ? envPath : process.env.NODE_ENV === 'production' ? undefined : fallbackPath

if (selectedPath && existsSync(selectedPath)) {
  const content = readFileSync(selectedPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    process.env[key] ??= value
  }
}
