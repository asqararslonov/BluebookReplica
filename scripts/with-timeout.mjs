// Usage: node scripts/with-timeout.mjs <seconds> <command...>
import { spawn } from 'node:child_process'
const [secs, ...cmd] = process.argv.slice(2)
const child = spawn(cmd.join(' '), { stdio: 'inherit', shell: true })
const t = setTimeout(() => { console.error(`[with-timeout] killed after ${secs}s`); child.kill('SIGKILL'); process.exit(124) }, Number(secs) * 1000)
child.on('exit', (code) => { clearTimeout(t); process.exit(code ?? 0) })
