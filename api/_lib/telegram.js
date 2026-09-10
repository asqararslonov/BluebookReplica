import './env.js'
// Telegram Bot API helper. Configuration is built in here (no environment variables needed):
export const BOT_TOKEN = 'PASTE_YOUR_BOT_TOKEN_HERE' // <- your bot token from @BotFather
export const MENTOR_IDS = ['1142658539'] // Telegram user ids allowed to answer students
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''

export async function tg(method, body) {
  if (!BOT_TOKEN || BOT_TOKEN.startsWith('PASTE_')) throw new Error('Bot token is not set in api/_lib/telegram.js')
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`)
  return data.result
}

export function isMentor(chatId) {
  return MENTOR_IDS.includes(String(chatId))
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// On Vercel, register this deployment as the bot's webhook the first time an API function runs
// (no manual setup step). Skipped in local development, where the dev server long-polls instead.
let webhookPromise = null
export function ensureWebhook(req) {
  if (!BOT_TOKEN || process.env.VERCEL !== '1') return Promise.resolve(false)
  if (!webhookPromise) {
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const url = `https://${host}/api/telegram`
    webhookPromise = (async () => {
      try {
        const info = await tg('getWebhookInfo')
        if (info.url === url) return true
        await tg('setWebhook', { url, secret_token: WEBHOOK_SECRET || undefined, allowed_updates: ['message', 'edited_message'] })
        console.log(`[telegram] webhook registered: ${url}`)
        return true
      } catch (err) {
        console.error('[telegram] webhook registration failed:', err.message)
        webhookPromise = null
        return false
      }
    })()
  }
  return webhookPromise
}
