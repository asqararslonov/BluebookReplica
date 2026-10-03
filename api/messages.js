// GET /api/messages?code=ABC123&after=<ts>  -> { messages, serverTime }
import { json, cors, query, clip } from './_lib/http.js'
import { listMessages, touchStudent } from './_lib/store.js'
import { ensureWebhook } from './_lib/telegram.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  ensureWebhook(req)
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' })
  const q = query(req)
  const code = clip(q.get('code'), 12).toUpperCase()
  const name = clip(q.get('name'), 60)
  const context = clip(q.get('context'), 120)
  const after = Number(q.get('after') || 0)
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return json(res, 400, { error: 'Invalid code' })
  try {
    const messages = await listMessages(code, Number.isFinite(after) ? after : 0)
    await touchStudent(code, { ...(name ? { name } : {}), ...(context ? { context } : {}) })
    json(res, 200, { messages, serverTime: Date.now() })
  } catch (err) {
    json(res, 500, { error: err.message })
  }
}
