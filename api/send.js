// POST /api/send { code, name, text, context } -> stores the student's message and forwards it to the mentors.
import { json, cors, readJson, clip } from './_lib/http.js'
import { appendMessage, touchStudent, rememberRoute } from './_lib/store.js'
import { tg, MENTOR_IDS, BOT_TOKEN, newId, ensureWebhook } from './_lib/telegram.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  ensureWebhook(req)
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
  const body = await readJson(req)
  const code = clip(body.code, 12).toUpperCase()
  const name = clip(body.name, 60) || 'Student'
  const text = clip(body.text, 1000)
  const context = clip(body.context, 120)
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return json(res, 400, { error: 'Invalid code' })
  if (!text) return json(res, 400, { error: 'Empty message' })

  const message = { id: newId(), ts: Date.now(), from: 'student', name, text, context }
  try {
    await appendMessage(code, message)
    await touchStudent(code, { name, context })
    let delivered = 0
    if (BOT_TOKEN) {
      const header = `#${code} ${name}${context ? ` · ${context}` : ''}`
      for (const chatId of MENTOR_IDS) {
        let sent = null
        try {
          sent = await tg('sendMessage', { chat_id: chatId, text: `${header}\n\n${text}` })
          delivered++
        } catch (err) {
          console.error('[send] forward failed', chatId, err.message)
        }
        if (sent) { try { await rememberRoute(chatId, sent.message_id, code) } catch (err) { console.error('[send] route store failed', err.message) } }
      }
    }
    json(res, 200, { ok: true, message, delivered })
  } catch (err) {
    json(res, 500, { error: err.message })
  }
}
