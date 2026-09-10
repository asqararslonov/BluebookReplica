// Launches Electron against the running Vite dev server (cross-platform env handling).
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const electronBinary = require('electron')

const child = spawn(electronBinary, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5199' },
})
child.on('exit', (code) => process.exit(code ?? 0))
