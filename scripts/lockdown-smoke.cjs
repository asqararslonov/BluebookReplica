// Creates the kiosk exam window for a moment, reports which OS shortcuts were
// intercepted, then releases everything and quits. Run: npx electron scripts/lockdown-smoke.cjs
const { app } = require('electron')
const path = require('node:path')
const lockdown = require('../electron/lockdown.cjs')

app.whenReady().then(() => {
  const { win, release, shortcuts } = lockdown.createExamWindow({ preload: path.join(__dirname, '..', 'electron', 'preload.cjs'), debug: false })
  win.loadURL('data:text/html,<h1 style="font-family:sans-serif">Lockdown smoke test</h1>')
  win.once('ready-to-show', () => {
    win.show()
    console.log(`[lockdown] kiosk=${win.isKiosk()} fullscreen=${win.isFullScreen()} alwaysOnTop=${win.isAlwaysOnTop()} displays=${lockdown.displaySummary().count}`)
    console.log(`[lockdown] shortcuts registered=${shortcuts.registered.length} failed=${shortcuts.failed.length}`)
    console.log(`[lockdown] failed (OS-reserved): ${shortcuts.failed.join(', ') || 'none'}`)
    setTimeout(() => { release(); console.log('[lockdown] released'); app.quit() }, 2500)
  })
})
setTimeout(() => { console.error('[lockdown] timeout'); app.exit(2) }, 15000)
