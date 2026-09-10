// Encrypted JSON persistence for exam state, sessions, downloads and settings.
// Uses Electron's safeStorage (OS keychain-backed) when available; falls back to plain JSON.
const { app, safeStorage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const MAGIC = Buffer.from('BBENC1')

class Store {
  constructor(name = 'bluebook-store') {
    this.file = path.join(app.getPath('userData'), `${name}.bin`)
    this.data = this._read()
  }

  _canEncrypt() {
    try { return safeStorage.isEncryptionAvailable() } catch { return false }
  }

  _read() {
    try {
      if (!fs.existsSync(this.file)) return {}
      const buf = fs.readFileSync(this.file)
      if (buf.length >= MAGIC.length && buf.subarray(0, MAGIC.length).equals(MAGIC)) {
        if (!this._canEncrypt()) {
          console.warn('[store] encrypted store present but encryption unavailable; starting empty')
          return {}
        }
        return JSON.parse(safeStorage.decryptString(buf.subarray(MAGIC.length)))
      }
      return JSON.parse(buf.toString('utf8'))
    } catch (err) {
      console.error('[store] failed to read store, starting empty:', err.message)
      return {}
    }
  }

  _write() {
    const json = JSON.stringify(this.data)
    const payload = this._canEncrypt()
      ? Buffer.concat([MAGIC, safeStorage.encryptString(json)])
      : Buffer.from(json, 'utf8')
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    fs.writeFileSync(tmp, payload)
    fs.renameSync(tmp, this.file) // atomic replace
  }

  get(key, fallback) {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : fallback
  }

  set(key, value) {
    this.data[key] = value
    this._write()
    return value
  }

  update(key, fn, fallback) {
    return this.set(key, fn(this.get(key, fallback)))
  }

  delete(key) {
    delete this.data[key]
    this._write()
  }

  isEncrypted() { return this._canEncrypt() }
  filePath() { return this.file }
}

module.exports = { Store }
