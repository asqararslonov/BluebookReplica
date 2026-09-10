import './env.js'
// Message store: Upstash Redis over REST when configured, otherwise an in-memory fallback
// (fine for local development; on Vercel each function instance has its own memory).
const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const MAX_MESSAGES = 400
const CHAT_TTL = 7 * 24 * 3600
const ACTIVE_WINDOW_MS = 3 * 3600 * 1000

export const usingRedis = !!(URL && TOKEN)

async function redis(...command) {
  const res = await fetch(URL, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) })
  const data = await res.json()
  if (data.error) throw new Error(`Redis: ${data.error}`)
  return data.result
}

const mem = { chats: new Map(), students: new Map(), map: new Map() }

export async function appendMessage(code, message) {
  if (usingRedis) {
    const key = `chat:${code}`
    await redis('RPUSH', key, JSON.stringify(message))
    await redis('LTRIM', key, -MAX_MESSAGES, -1)
    await redis('EXPIRE', key, CHAT_TTL)
    return
  }
  const list = mem.chats.get(code) || []
  list.push(message)
  mem.chats.set(code, list.slice(-MAX_MESSAGES))
}

export async function listMessages(code, after = 0) {
  let items
  if (usingRedis) items = (await redis('LRANGE', `chat:${code}`, 0, -1)).map((s) => JSON.parse(s))
  else items = mem.chats.get(code) || []
  return items.filter((m) => m.ts > after)
}

export async function touchStudent(code, info = {}) {
  const now = Date.now()
  const record = { code, lastSeen: now, ...info }
  if (usingRedis) {
    const prev = await redis('GET', `student:${code}`)
    const merged = { ...(prev ? JSON.parse(prev) : {}), ...record }
    await redis('SET', `student:${code}`, JSON.stringify(merged), 'EX', 24 * 3600)
    await redis('ZADD', 'students:active', now, code)
    return merged
  }
  const merged = { ...(mem.students.get(code) || {}), ...record }
  mem.students.set(code, merged)
  return merged
}

export async function activeStudents() {
  const since = Date.now() - ACTIVE_WINDOW_MS
  if (usingRedis) {
    const codes = await redis('ZRANGEBYSCORE', 'students:active', since, '+inf')
    const out = []
    for (const code of codes) {
      const raw = await redis('GET', `student:${code}`)
      if (raw) out.push(JSON.parse(raw))
    }
    return out
  }
  return [...mem.students.values()].filter((s) => s.lastSeen >= since)
}

export async function rememberRoute(chatId, messageId, code) {
  if (usingRedis) { await redis('SET', `route:${chatId}:${messageId}`, code, 'EX', 2 * 24 * 3600); return }
  mem.map.set(`${chatId}:${messageId}`, code)
}

export async function lookupRoute(chatId, messageId) {
  if (usingRedis) return redis('GET', `route:${chatId}:${messageId}`)
  return mem.map.get(`${chatId}:${messageId}`) || null
}
