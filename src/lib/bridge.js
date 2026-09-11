// Unified bridge: uses the Electron preload API when present, otherwise a
// browser shim (localStorage + fetch) so the renderer runs in a plain browser.

const listeners = new Map()
function emit(channel, payload) {
  for (const cb of listeners.get(channel) || []) {
    try { cb(payload) } catch (err) { console.error(err) }
  }
}
function on(channel, cb) {
  if (!listeners.has(channel)) listeners.set(channel, new Set())
  listeners.get(channel).add(cb)
  return () => listeners.get(channel)?.delete(cb)
}

const SHIM_KEY = 'bluebook-shim-store'
function readAll() {
  try { return JSON.parse(localStorage.getItem(SHIM_KEY) || '{}') } catch { return {} }
}
function writeAll(data) { localStorage.setItem(SHIM_KEY, JSON.stringify(data)) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(relPath) {
  const url = new URL(relPath, document.baseURI).toString()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${relPath} (${res.status})`)
  return res.json()
}

const shim = {
  isElectron: false,
  platform: 'web',
  versions: {},
  store: {
    async get(key) { const d = readAll(); return key in d ? d[key] : null },
    async set(key, value) { const d = readAll(); d[key] = value; writeAll(d); return value },
    async delete(key) { const d = readAll(); delete d[key]; writeAll(d) },
  },
  sessions: {
    async list() { const s = (readAll().sessions) || {}; return Object.values(s).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) },
    async get(id) { return (readAll().sessions || {})[id] || null },
    async save(session) { const d = readAll(); d.sessions = d.sessions || {}; d.sessions[session.id] = { ...session, updatedAt: Date.now() }; writeAll(d); return d.sessions[session.id] },
    async delete(id) { const d = readAll(); if (d.sessions) delete d.sessions[id]; writeAll(d); return true },
  },
  tests: {
    async manifest() {
      const m = await fetchJson('tests/manifest.json')
      const cached = readAll().cachedTests || {}
      return m.tests.map((t) => ({ ...t, cached: !!cached[t.testId], cachedAt: cached[t.testId] || null }))
    },
    async download(testId) {
      const m = await fetchJson('tests/manifest.json')
      const entry = m.tests.find((t) => t.testId === testId)
      if (!entry) throw new Error(`Unknown test ${testId}`)
      const res = await fetch(new URL(`tests/${entry.file || `${testId}.json`}`, document.baseURI))
      const text = await res.text()
      const total = text.length
      for (let loaded = 0; loaded < total; loaded += Math.ceil(total / 12)) {
        emit('tests:progress', { testId, loaded: Math.min(loaded, total), total, percent: Math.round((Math.min(loaded, total) / total) * 100) })
        await sleep(60)
      }
      emit('tests:progress', { testId, loaded: total, total, percent: 100 })
      JSON.parse(text)
      const d = readAll(); d.cachedTests = d.cachedTests || {}; d.cachedTests[testId] = Date.now(); writeAll(d)
      return { testId, bytes: total, cachedAt: Date.now() }
    },
    async load(testId) {
      const m = await fetchJson('tests/manifest.json')
      const entry = m.tests.find((t) => t.testId === testId)
      if (!entry) throw new Error(`Unknown test ${testId}`)
      return fetchJson(`tests/${entry.file || `${testId}.json`}`)
    },
    async remove(testId) { const d = readAll(); if (d.cachedTests) delete d.cachedTests[testId]; writeAll(d); return true },
  },
  exam: {
    async start(sessionId, options = {}) {
      if (options.lockdown !== false) {
        // Full-screen needs a user gesture and can hang in embedded browsers, so never wait on it for long.
        try { await Promise.race([document.documentElement.requestFullscreen?.(), new Promise((r) => setTimeout(r, 800))]) } catch { /* user gesture required */ }
      }
      window.location.hash = `#/exam/${sessionId}`
      return { ok: true, lockdown: false, simulated: true, shortcuts: { registered: [], failed: [] }, displays: { count: 1 } }
    },
    async finish() { try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* ignore */ } return { handled: false } },
    async abort() { try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* ignore */ } return { handled: false } },
  },
  system: {
    async displays() { return { count: 1, displays: [{ id: 1, width: window.screen.width, height: window.screen.height, internal: true, scale: window.devicePixelRatio }] } },
    async info() { return { platform: 'web', browser: navigator.userAgent, encryptedStore: false } },
    async quit() { window.close() },
    async openExternal(url) { window.open(url, '_blank', 'noopener') },
  },
  on,
}

const bridge = typeof window !== 'undefined' && window.bluebook ? window.bluebook : shim
export const isElectron = !!bridge.isElectron
export default bridge
