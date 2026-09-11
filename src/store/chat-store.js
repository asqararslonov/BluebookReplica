import { create } from 'zustand'
import { chatApi } from '../lib/chat-client.js'

export const useChatStore = create((set, get) => ({
  base: null,
  code: null,
  name: 'Student',
  open: false,
  messages: [],
  unread: 0,
  status: 'idle', // idle | connecting | online | offline
  error: null,
  lastTs: 0,
  sending: false,

  configure({ base, code, name }) {
    const changed = base !== get().base || code !== get().code
    set({ base, code, name, ...(changed ? { messages: [], unread: 0, lastTs: 0, status: base && code ? 'connecting' : 'idle', error: null } : {}) })
  },
  toggle() { const open = !get().open; set({ open, unread: open ? 0 : get().unread }) },
  setOpen(open) { set({ open, unread: open ? 0 : get().unread }) },

  async poll() {
    const { base, code, lastTs } = get()
    if (!base || !code) return
    try {
      const data = await chatApi.messages(base, code, lastTs)
      const incoming = (data.messages || []).filter((m) => !get().messages.some((x) => x.id === m.id))
      if (incoming.length) {
        const newFromMentor = incoming.filter((m) => m.from === 'mentor').length
        set((s) => {
          const fresh = incoming.filter((m) => !s.messages.some((x) => x.id === m.id))
          const mentorCount = fresh.filter((m) => m.from === 'mentor').length
          return { messages: [...s.messages, ...fresh].sort((a, b) => a.ts - b.ts), unread: s.open ? 0 : s.unread + mentorCount, lastTs: Math.max(s.lastTs, ...fresh.map((m) => m.ts)) }
        })
      }
      set({ status: 'online', error: null })
    } catch (err) {
      set({ status: 'offline', error: err.message })
    }
  },

  async send(text, context) {
    const { base, code, name } = get()
    const body = String(text || '').trim()
    if (!base || !code || !body) return false
    set({ sending: true })
    try {
      const data = await chatApi.send(base, { code, name, text: body, context })
      if (data.message) set((s) => ({ messages: s.messages.some((x) => x.id === data.message.id) ? s.messages : [...s.messages, data.message], lastTs: Math.max(s.lastTs, data.message.ts), status: 'online', error: null }))
      return true
    } catch (err) {
      set({ status: 'offline', error: err.message })
      return false
    } finally {
      set({ sending: false })
    }
  },
}))
