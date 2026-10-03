import './env.js'
import { createHash } from 'node:crypto'
// Telegram Bot API helper. Configuration comes from the environment when it is set
// (Vercel project settings, or a local .env), otherwise from the built-in constants below.
const BUILT_IN_TOKEN = '8367661381:AAFWO7XevZQNFfTqEl_FsBS-rnbjzf6Q0tY' // <- your bot token from @BotFather, or set TELEGRAM_BOT_TOKEN
const BUILT_IN_MENTORS = '1142658539,5199820118' // Telegram user ids allowed to answer students, or set MENTOR_CHAT_IDS

const configuredToken = process.env.TELEGRAM_BOT_TOKEN || BUILT_IN_TOKEN
export const BOT_TOKEN = configuredToken.startsWith('PASTE_') ? '' : configuredToken
export const MENTOR_IDS = (process.env.MENTOR_CHAT_IDS || BUILT_IN_MENTORS).split(',').map((s) => s.trim()).filter(Boolean)
// Webhook secret: Telegram sends it with every webhook call so forged updates are rejected.
// Derived from the bot token when not configured, so no extra setup is needed.
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || (BOT_TOKEN ? createHash('sha256').update(`bluebook-webhook:${BOT_TOKEN}`).digest('hex').slice(0, 48) : '')

export async function tg(method, body) {
  if (!BOT_TOKEN) throw new Error('Bot token is not set (TELEGRAM_BOT_TOKEN, or BUILT_IN_TOKEN in api/_lib/telegram.js)')
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`)
  return data.result
}

export function isMentor(userId) {
  return MENTOR_IDS.includes(String(userId))
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
