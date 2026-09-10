// Test bank repository: bundled JSON tests -> local cache (userData/tests) for offline readiness.
const { app, net } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

function bundledDir() {
  const dev = !!process.env.VITE_DEV_SERVER_URL
  return dev
    ? path.join(app.getAppPath(), 'public', 'tests')
    : path.join(app.getAppPath(), 'dist', 'tests')
}

function cacheDir() {
  const dir = path.join(app.getPath('userData'), 'tests')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function cachePath(testId) {
  if (!/^[a-z0-9-]+$/i.test(testId)) throw new Error(`Invalid test id: ${testId}`)
  return path.join(cacheDir(), `${testId}.json`)
}

function readManifest() {
  const file = path.join(bundledDir(), 'manifest.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  return raw.tests.map((t) => {
    const cached = fs.existsSync(cachePath(t.testId))
    let cachedAt = null
    if (cached) cachedAt = fs.statSync(cachePath(t.testId)).mtimeMs
    return { ...t, cached, cachedAt }
  })
}

function validateTest(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Test file is not an object')
  if (!obj.testId || !Array.isArray(obj.sections) || obj.sections.length === 0) throw new Error('Test file missing testId/sections')
  for (const s of obj.sections) {
    if (!Array.isArray(s.modules) || s.modules.length === 0) throw new Error(`Section ${s.id} has no modules`)
    for (const m of s.modules) {
      if (!Array.isArray(m.questions) || m.questions.length === 0) throw new Error(`Module ${s.id}/${m.moduleNumber} has no questions`)
    }
  }
  return obj
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function download(testId, onProgress) {
  const entry = readManifest().find((t) => t.testId === testId)
  if (!entry) throw new Error(`Unknown test: ${testId}`)
  const target = cachePath(testId)
  const tmp = `${target}.part`
  let buffer

  if (entry.url && /^https?:\/\//.test(entry.url)) {
    const res = await net.fetch(entry.url)
    if (!res.ok) throw new Error(`Download failed (${res.status})`)
    const total = Number(res.headers.get('content-length')) || 0
    const chunks = []
    let loaded = 0
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
      loaded += value.length
      onProgress?.({ testId, loaded, total, percent: total ? Math.round((loaded / total) * 100) : null })
    }
    buffer = Buffer.concat(chunks)
  } else {
    // Bundled file: stream in chunks so the UI shows real progress (simulates the network path).
    const source = path.join(bundledDir(), entry.file || `${testId}.json`)
    const data = fs.readFileSync(source)
    const total = data.length
    const chunk = 48 * 1024
    const parts = []
    for (let offset = 0; offset < total; offset += chunk) {
      parts.push(data.subarray(offset, Math.min(offset + chunk, total)))
      const loaded = Math.min(offset + chunk, total)
      onProgress?.({ testId, loaded, total, percent: Math.round((loaded / total) * 100) })
      await sleep(35)
    }
    buffer = Buffer.concat(parts)
  }

  const parsed = validateTest(JSON.parse(buffer.toString('utf8')))
  fs.writeFileSync(tmp, JSON.stringify(parsed))
  fs.renameSync(tmp, target)
  return { testId, bytes: buffer.length, cachedAt: Date.now() }
}

function load(testId) {
  const file = cachePath(testId)
  if (!fs.existsSync(file)) {
    // Allow loading straight from the bundle (e.g. Test Preview) without an explicit download.
    const entry = readManifest().find((t) => t.testId === testId)
    if (entry?.alwaysAvailable) {
      return validateTest(JSON.parse(fs.readFileSync(path.join(bundledDir(), entry.file || `${testId}.json`), 'utf8')))
    }
    throw new Error(`Test ${testId} is not downloaded`)
  }
  return validateTest(JSON.parse(fs.readFileSync(file, 'utf8')))
}

function remove(testId) {
  const file = cachePath(testId)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return true
}

module.exports = { readManifest, download, load, remove, cacheDir }
