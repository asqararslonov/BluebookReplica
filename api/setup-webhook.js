// One-time setup: GET /api/setup-webhook?key=<ADMIN_KEY>  registers this deployment as the bot's webhook.
//                 GET /api/setup-webhook?key=<ADMIN_KEY>&action=info  shows the current webhook.
import { json, query } from './_lib/http.js'
import { tg, WEBHOOK_SECRET } from './_lib/telegram.js'

export default async function handler(req, res) {
  const q = query(req)
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) return json(res, 500, { error: 'Set ADMIN_KEY in the environment first' })
  if (q.get('key') !== adminKey) return json(res, 401, { error: 'Bad key' })
  try {
    if (q.get('action') === 'info') return json(res, 200, await tg('getWebhookInfo'))
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const url = `https://${host}/api/telegram`
    const result = await tg('setWebhook', { url, secret_token: WEBHOOK_SECRET || undefined, allowed_updates: ['message', 'edited_message'], drop_pending_updates: true })
    json(res, 200, { ok: true, url, result })
  } catch (err) {
    json(res, 500, { error: err.message })
  }
}
