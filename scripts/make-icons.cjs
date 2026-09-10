// Renders build/icon.svg to PNGs with Electron, then builds icon.icns (macOS) and icon.ico (Windows).
// Run: npx electron scripts/make-icons.cjs
const { app, BrowserWindow, nativeImage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const BUILD = path.join(__dirname, '..', 'build')
const svg = fs.readFileSync(path.join(BUILD, 'icon.svg'), 'utf8')

function ico(pngBuffers) {
  // ICO container with PNG-compressed entries (Vista+).
  const count = pngBuffers.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4)
  const dir = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count
  pngBuffers.forEach(({ size, buf }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o); dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3); dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(buf.length, o + 8); dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })
  return Buffer.concat([header, dir, ...pngBuffers.map((p) => p.buf)])
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1024, height: 1024, transparent: true, frame: false, webPreferences: { offscreen: true } })
  await win.loadURL(`data:text/html,<html><body style="margin:0;background:transparent">${encodeURIComponent(svg.replace('<svg ', '<svg width="1024" height="1024" '))}</body></html>`)
  await new Promise((r) => setTimeout(r, 800))
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })
  fs.writeFileSync(path.join(BUILD, 'icon.png'), image.toPNG())
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
  const iconset = path.join(BUILD, 'icon.iconset')
  fs.mkdirSync(iconset, { recursive: true })
  const pngs = []
  for (const s of sizes) {
    const buf = image.resize({ width: s, height: s, quality: 'best' }).toPNG()
    pngs.push({ size: s, buf })
    if (s <= 512) fs.writeFileSync(path.join(iconset, `icon_${s}x${s}.png`), buf)
    if (s >= 32) fs.writeFileSync(path.join(iconset, `icon_${s / 2}x${s / 2}@2x.png`), buf)
  }
  fs.writeFileSync(path.join(BUILD, 'icon.ico'), ico(pngs.filter((p) => p.size <= 256)))
  try {
    execSync(`iconutil -c icns "${iconset}" -o "${path.join(BUILD, 'icon.icns')}"`)
    console.log('[icons] icon.icns written')
  } catch (err) { console.warn('[icons] iconutil unavailable, skipped .icns:', err.message) }
  console.log('[icons] icon.png, icon.ico written to build/')
  app.quit()
})
