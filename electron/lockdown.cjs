// Full-screen test window. Students may switch to other apps freely: no kiosk mode,
// no always-on-top, no shortcut interception, no focus-loss pausing.
const { BrowserWindow, screen } = require('electron')
const path = require('node:path')

function displaySummary() {
  const displays = screen.getAllDisplays()
  return {
    count: displays.length,
    displays: displays.map((d) => ({ id: d.id, width: d.size.width, height: d.size.height, internal: !!d.internal, scale: d.scaleFactor })),
  }
}

/**
 * Creates the full-screen exam window.
 * @param {{ preload: string, debug?: boolean }} opts
 */
function createExamWindow({ preload, debug = false }) {
  const primary = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    fullscreen: !debug,
    frame: false,
    show: false,
    x: primary.bounds.x,
    y: primary.bounds.y,
    width: primary.bounds.width,
    height: primary.bounds.height,
    backgroundColor: '#ffffff',
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

  win.setMenuBarVisibility(false)
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL()
    if (!url.startsWith(current.split('#')[0])) event.preventDefault()
  })

  const release = () => { if (!win.isDestroyed()) win.destroy() }
  return { win, release, shortcuts: { registered: [], failed: [] } }
}

module.exports = { createExamWindow, displaySummary, BLOCKED_ACCELERATORS: [], shouldBlockInput: () => false }
