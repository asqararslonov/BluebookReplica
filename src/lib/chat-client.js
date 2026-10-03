// Client for the mentor-chat relay (api/ on Vercel, or the Vite dev middleware).

// Fallback so the desktop app still finds the relay even if a build was made
// without VITE_CHAT_URL set (Profile & Settings → Chat server URL always overrides this).
const DEFAULT_CHAT_BASE = 'https://sat-mock-asqararslonov2008s-projects.vercel.app'

export function resolveChatBase(settings) {
  const override = settings?.chat?.url?.trim()
  if (override) return override.replace(/\/+$/, '')
  const env = import.meta.env.VITE_CHAT_URL
  if (env) return String(env).replace(/\/+$/, '')
  if (typeof window !== 'undefined' && /^https?:/.test(window.location.origin)) {
    if (/localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      return DEFAULT_CHAT_BASE
    }
    return window.location.origin
  }
  return DEFAULT_CHAT_BASE
}

export function newChatCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

async function request(base, path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${base}/api/${path}`, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (data?.protection?.vercel_auth_enabled || data?.error?.message === 'Protected deployment') {
        throw new Error('Chat server is locked by Vercel Deployment Protection. Turn off Vercel Authentication in the project settings.')
      }
      const detail = typeof data?.error === 'string' ? data.error : data?.error?.message
      throw new Error(detail || `Chat server error (HTTP ${res.status})`)
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

export const chatApi = {
  health: (base) => request(base, 'health'),
  messages: (base, code, after, name, context) => {
    let qs = `messages?code=${encodeURIComponent(code)}&after=${after || 0}`
    if (name) qs += `&name=${encodeURIComponent(name)}`
    if (context) qs += `&context=${encodeURIComponent(context)}`
    return request(base, qs)
  },
  send: (base, payload) => request(base, 'send', { method: 'POST', body: JSON.stringify(payload) }),
}
