// Kiosk / lockdown simulation: fullscreen kiosk window, OS shortcut interception,
// focus-loss + display-change integrity listeners, screen-capture protection.
const { BrowserWindow, globalShortcut, screen } = require('electron')
const path = require('node:path')

// Best-effort global interception. Some accelerators are reserved by the OS
// (e.g. Cmd+Tab on macOS, Ctrl+Alt+Del on Windows) and will report as failed.
const BLOCKED_ACCELERATORS = [
  'Alt+Tab', 'Alt+Shift+Tab', 'CommandOrControl+Tab', 'CommandOrControl+Shift+Tab',
  'Control+Escape', 'Alt+F4', 'CommandOrControl+Q', 'CommandOrControl+W',
  'PrintScreen', 'F11', 'F12', 'CommandOrControl+Shift+I', 'CommandOrControl+Shift+J',
  'CommandOrControl+Shift+C', 'CommandOrControl+Alt+I',
  'CommandOrControl+M', 'CommandOrControl+H', 'CommandOrControl+Alt+H',
  'CommandOrControl+Shift+3', 'CommandOrControl+Shift+4', 'CommandOrControl+Shift+5',
  'CommandOrControl+R', 'CommandOrControl+Shift+R', 'F5',
  'CommandOrControl+N', 'CommandOrControl+T', 'CommandOrControl+P',
  'Alt+Escape', 'Alt+Space', 'CommandOrControl+Alt+Escape', 'CommandOrControl+Shift+Escape',
  'Super', 'Super+D', 'Super+Tab', 'Super+E', 'Super+R',
]

const BLOCKED_KEYS = new Set(['F11', 'F12', 'PrintScreen', 'F5', 'F1', 'F3'])

function shouldBlockInput(input) {
  if (input.type !== 'keyDown' && input.type !== 'keyUp') return false
  const key = input.key
  const mod = input.control || input.meta
  if (BLOCKED_KEYS.has(key)) return true
  if (input.alt && key === 'F4') return true
  if (input.alt && key === 'Tab') return true
  if (input.meta && key === 'Tab') return true
  if (mod && input.shift && ['I', 'i', 'J', 'j', 'C', 'c', 'R', 'r', '3', '4', '5'].includes(key)) return true
  if (mod && ['q', 'Q', 'w', 'W', 'r', 'R', 'm', 'M', 'h', 'H', 'n', 'N', 't', 'T', 'p', 'P'].includes(key)) return true
  if (input.control && key === 'Escape') return true
  return false
}

function registerShortcuts() {
  const registered = []
  const failed = []
  for (const accel of BLOCKED_ACCELERATORS) {
    try {
      const ok = globalShortcut.register(accel, () => {
        // Swallow the key combination.
      })
      ;(ok ? registered : failed).push(accel)
    } catch {
      failed.push(accel)
    }
  }
  return { registered, failed }
}

function releaseShortcuts() {
  try { globalShortcut.unregisterAll() } catch { /* ignore */ }
}

function displaySummary() {
  const displays = screen.getAllDisplays()
  return {
    count: displays.length,
    displays: displays.map((d) => ({ id: d.id, width: d.size.width, height: d.size.height, internal: !!d.internal, scale: d.scaleFactor })),
  }
}

/**
 * Creates the exam kiosk window.
 * @param {{ preload: string, debug?: boolean, onIntegrity?: (evt) => void }} opts
 */
function createExamWindow({ preload, debug = false }) {
  const primary = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    kiosk: !debug,
    fullscreen: true,
    alwaysOnTop: !debug,
    frame: false,
    show: false,
    x: primary.bounds.x,
    y: primary.bounds.y,
    width: primary.bounds.width,
    height: primary.bounds.height,
    backgroundColor: '#ffffff',
    minimizable: false,
    fullscreenable: true,
    autoHideMenuBar: true,
    title: 'Bluebook — Testing',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: debug,
      spellcheck: false,
    },
  })

  let allowClose = false
  const send = (payload) => { if (!win.isDestroyed()) win.webContents.send('integrity', { at: Date.now(), ...payload }) }

  win.setMenuBarVisibility(false)
  if (!debug) {
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    try { win.setContentProtection(true) } catch { /* unsupported platform */ }
  }

  // Block in-window escape hatches (DevTools, reload, quit, screenshots, window switching).
  win.webContents.on('before-input-event', (event, input) => {
    if (!debug && shouldBlockInput(input)) event.preventDefault()
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL()
    if (!url.startsWith(current.split('#')[0])) event.preventDefault()
  })

  // Integrity listeners
  win.on('blur', () => send({ type: 'blur' }))
  win.on('focus', () => send({ type: 'focus' }))
  win.on('leave-full-screen', () => {
    send({ type: 'fullscreen-exit' })
    if (!debug && !win.isDestroyed()) setTimeout(() => { if (!win.isDestroyed()) win.setFullScreen(true) }, 50)
  })
  win.on('minimize', () => { if (!debug && !win.isDestroyed()) win.restore() })
  win.on('close', (event) => { if (!allowClose) event.preventDefault() })

  const onDisplayChange = (kind) => () => send({ type: 'display', kind, ...displaySummary() })
  const listeners = {
    'display-added': onDisplayChange('added'),
    'display-removed': onDisplayChange('removed'),
    'display-metrics-changed': onDisplayChange('metrics'),
  }
  for (const [evt, fn] of Object.entries(listeners)) screen.on(evt, fn)

  const shortcuts = debug ? { registered: [], failed: [] } : registerShortcuts()

  const release = () => {
    for (const [evt, fn] of Object.entries(listeners)) screen.removeListener(evt, fn)
    releaseShortcuts()
    allowClose = true
    if (!win.isDestroyed()) {
      try { win.setKiosk(false) } catch { /* ignore */ }
      win.destroy()
    }
  }

  return { win, release, shortcuts }
}

module.exports = { createExamWindow, displaySummary, BLOCKED_ACCELERATORS, shouldBlockInput }
