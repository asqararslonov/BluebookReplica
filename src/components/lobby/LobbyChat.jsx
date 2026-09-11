// Mentor chat on the dashboard: a header button, the J hotkey, and the shared chat panel.
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import bridge from '../../lib/bridge.js'
import { useLobbyStore } from '../../store/lobby-store.js'
import { useChatStore } from '../../store/chat-store.js'
import { resolveChatBase, newChatCode } from '../../lib/chat-client.js'
import MentorChat from '../exam/MentorChat.jsx'

export function useLobbyChat() {
  const settings = useLobbyStore((s) => s.settings)
  const loading = useLobbyStore((s) => s.loading)
  const saveSettings = useLobbyStore((s) => s.saveSettings)
  const configure = useChatStore((s) => s.configure)
  const poll = useChatStore((s) => s.poll)
  const open = useChatStore((s) => s.open)
  const toggle = useChatStore((s) => s.toggle)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (loading || !settings.signedIn) return
    let alive = true
    ;(async () => {
      const on = settings.chat?.enabled !== false
      const base = on ? resolveChatBase(settings) : null
      let code = settings.chatCode || null
      if (base && !code) { code = newChatCode(); await saveSettings({ chatCode: code }) }
      if (!alive) return
      configure({ base, code, name: settings.studentName })
      setEnabled(!!(base && code))
    })()
    return () => { alive = false }
  }, [loading, settings.signedIn, settings.chat?.enabled, settings.chat?.url, settings.chatCode, settings.studentName, configure, saveSettings])

  useEffect(() => {
    if (!enabled) return
    poll()
    const id = setInterval(poll, open ? 2500 : 6000)
    return () => clearInterval(id)
  }, [enabled, open, poll])

  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      if (e.key !== 'j' && e.key !== 'J') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, toggle])

  return enabled
}

export function LobbyChatButton() {
  const enabled = useChatStore((s) => !!(s.base && s.code))
  const open = useChatStore((s) => s.open)
  const unread = useChatStore((s) => s.unread)
  const toggle = useChatStore((s) => s.toggle)
  if (!enabled) return null
  return (
    <button type="button" onClick={toggle} aria-pressed={open} className={`relative inline-flex items-center gap-2 rounded-full border-[1.5px] border-bb-black px-5 py-2 text-[16px] font-medium ${open ? 'bg-bb-black text-white' : 'bg-white hover:bg-bb-gray-100'}`} title="Chat with a mentor (J)">
      <MessageCircle size={20} /> Chat with a Mentor
      {unread > 0 && !open && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bb-red px-1 text-[11px] font-bold text-white" aria-label={`${unread} unread`}>{unread}</span>}
    </button>
  )
}

export function LobbyChatPanel() {
  const enabled = useLobbyChat()
  const bridgeReady = !!bridge
  return enabled && bridgeReady ? <MentorChat /> : null
}
