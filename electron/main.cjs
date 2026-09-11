const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('node:path')
const { Store } = require('./store.cjs')
const lockdown = require('./lockdown.cjs')
const testsRepo = require('./tests-repo.cjs')

const DEV_URL = process.env.VITE_DEV_SERVER_URL || null
const DEBUG = process.env.BLUEBOOK_DEBUG === '1'
const PRELOAD = path.join(__dirname, 'preload.cjs')
const ICON = path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png')

let store = null
let lobbyWin = null
let exam = null // { win, release, shortcuts, sessionId }

if (!app.requestSingleInstanceLock()) app.quit()

function loadRoute(win, route) {
  if (DEV_URL) return win.loadURL(`${DEV_URL}/#${route}`)
  return win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: route })
}

function buildMenu({ exam: inExam }) {
  const isMac = process.platform === 'darwin'
  const template = []
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }],
    })
  }
  template.push({
    label: 'Edit',
    submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }],
  })
  if (!inExam) {
    template.push({ label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }, ...(DEBUG || DEV_URL ? [{ role: 'toggleDevTools' }] : [])] })
    template.push({ label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(isMac ? [{ role: 'front' }] : [{ role: 'close' }])] })
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createLobbyWindow() {
  lobbyWin = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Bluebook',
    icon: ICON,
    backgroundColor: '#e7ecf9',
    show: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })
  lobbyWin.once('ready-to-show', () => lobbyWin.show())
  lobbyWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  lobbyWin.on('closed', () => { lobbyWin = null })
  loadRoute(lobbyWin, '/')
  buildMenu({ exam: false })
  if (process.env.BLUEBOOK_SMOKE) {
    // CI smoke mode: verify the renderer loads, then exit.
    lobbyWin.webContents.once('did-finish-load', () => {
      console.log(`[smoke] lobby loaded: ${lobbyWin.webContents.getURL()} store=${store.filePath()} encrypted=${store.isEncrypted()}`)
      setTimeout(() => app.quit(), 1500)
    })
    lobbyWin.webContents.on('console-message', (_e, level, message) => { if (level >= 2) console.log(`[smoke][renderer] ${message}`) })
  }
}

// ---------- Sessions ----------
function getSessions() { return store.get('sessions', {}) }
function saveSession(session) {
  const sessions = getSessions()
  sessions[session.id] = { ...session, updatedAt: Date.now() }
  store.set('sessions', sessions)
  return sessions[session.id]
}

// ---------- Exam lifecycle ----------
function endExam(sessionId, reason, navigateTo = null) {
  if (!exam) return { handled: false }
  const finished = exam
  exam = null
  finished.release()
  buildMenu({ exam: false })
  if (!lobbyWin || lobbyWin.isDestroyed()) createLobbyWindow()
  else {
    lobbyWin.show()
    lobbyWin.focus()
  }
  lobbyWin.webContents.send('exam:finished', { sessionId: sessionId || finished.sessionId, reason, navigateTo })
  return { handled: true }
}

function registerIpc() {
  ipcMain.handle('store:get', (_e, key) => store.get(key, null))
  ipcMain.handle('store:set', (_e, key, value) => store.set(key, value))
  ipcMain.handle('store:delete', (_e, key) => store.delete(key))

  ipcMain.handle('sessions:list', () => Object.values(getSessions()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
  ipcMain.handle('sessions:get', (_e, id) => getSessions()[id] || null)
  ipcMain.handle('sessions:save', (_e, session) => saveSession(session))
  ipcMain.handle('sessions:delete', (_e, id) => {
    const sessions = getSessions()
    delete sessions[id]
    store.set('sessions', sessions)
    return true
  })

  ipcMain.handle('tests:manifest', () => testsRepo.readManifest())
  ipcMain.handle('tests:download', (event, testId) => testsRepo.download(testId, (p) => {
    if (!event.sender.isDestroyed()) event.sender.send('tests:progress', p)
  }))
  ipcMain.handle('tests:load', (_e, testId) => testsRepo.load(testId))
  ipcMain.handle('tests:remove', (_e, testId) => testsRepo.remove(testId))

  ipcMain.handle('system:displays', () => lockdown.displaySummary())
  ipcMain.handle('system:info', () => ({
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    encryptedStore: store.isEncrypted(),
    storePath: store.filePath(),
    testsCache: testsRepo.cacheDir(),
    debug: DEBUG,
  }))
  ipcMain.handle('app:quit', () => app.quit())
  ipcMain.handle('shell:open', (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url) })

  ipcMain.handle('exam:start', (event, sessionId, options = {}) => {
    const useLockdown = options.lockdown !== false
    if (!useLockdown) {
      // Windowed practice mode: run the exam inside the lobby window.
      const win = BrowserWindow.fromWebContents(event.sender)
      loadRoute(win, `/exam/${sessionId}`)
      return { ok: true, lockdown: false }
    }
    if (exam) return { ok: false, error: 'An exam is already running' }
    const created = lockdown.createExamWindow({ preload: PRELOAD, debug: DEBUG })
    exam = { ...created, sessionId }
    buildMenu({ exam: true })
    created.win.once('ready-to-show', () => {
      created.win.show()
      created.win.focus()
      if (lobbyWin && !lobbyWin.isDestroyed()) lobbyWin.hide()
      if (DEBUG) created.win.webContents.openDevTools({ mode: 'detach' })
    })
    created.win.on('closed', () => {
      // Unexpected close (e.g. crash) — restore the lobby.
      if (exam && exam.win === created.win) endExam(sessionId, 'closed')
    })
    loadRoute(created.win, `/exam/${sessionId}`)
    return { ok: true, lockdown: true, shortcuts: created.shortcuts, displays: lockdown.displaySummary() }
  })

  ipcMain.handle('exam:finish', (_e, sessionId, options = {}) => endExam(sessionId, 'finished', options.navigateTo || null))
  ipcMain.handle('exam:abort', (_e, sessionId) => endExam(sessionId, 'aborted'))
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) { try { app.dock.setIcon(ICON) } catch { /* ignore */ } }
  store = new Store()
  registerIpc()
  createLobbyWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createLobbyWindow() })
})

app.on('second-instance', () => {
  const win = exam?.win || lobbyWin
  if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.focus() }
})

app.on('window-all-closed', () => app.quit())
