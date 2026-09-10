// Loads a local .env file into process.env (development only; Vercel injects real env vars).
import fs from 'node:fs'
import path from 'node:path'

let loaded = false
export function loadLocalEnv() {
  if (loaded) return
  loaded = true
  try {
    const file = path.join(process.cwd(), '.env')
    if (!fs.existsSync(file)) return
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (!m || line.trim().startsWith('#')) continue
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* ignore */ }
}
loadLocalEnv()
