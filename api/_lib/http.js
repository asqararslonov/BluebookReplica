// Minimal request/response helpers that work on Vercel Node functions and the Vite dev middleware.
export function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true }
  return false
}

export function query(req) {
  return new URL(req.url, 'http://localhost').searchParams
}

const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return asObject(req.body)
  if (typeof req.body === 'string') { try { return asObject(JSON.parse(req.body)) } catch { return {} } }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (chunks.length === 0) return {}
  try { return asObject(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { return {} }
}

export function clip(value, max) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
}
