// Telegram Bot API helper. The token is never in code: set TELEGRAM_BOT_TOKEN in the environment.
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
export const MENTOR_IDS = (process.env.MENTOR_CHAT_IDS || '1142658539').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''

export async function tg(method, body) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
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
