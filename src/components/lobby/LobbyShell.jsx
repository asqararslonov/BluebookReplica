import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import bridge from '../../lib/bridge.js'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../../store/lobby-store.js'
import Modal from '../ui/Modal.jsx'
import { BluebookLogo, BUILD_STAMP } from './Brand.jsx'
import { LobbyChatPanel } from './LobbyChat.jsx'
import { useChatStore } from '../../store/chat-store.js'
import { MessageCircle } from 'lucide-react'

export default function LobbyShell() {
  const { init, settings, saveSettings, loading, info } = useLobbyStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [draft, setDraft] = useState(settings)
  const chatAvailable = useChatStore((s) => !!(s.base && s.code))
  const chatUnread = useChatStore((s) => s.unread)
  const chatOpen = useChatStore((s) => s.open)
  const toggleChat = useChatStore((s) => s.toggle)

  useEffect(() => { init() }, [init])
  useEffect(() => bridge.on('exam:finished', (p) => { init(); navigate(p?.navigateTo || `/results/${p?.sessionId}`) }), [init, navigate])
  useEffect(() => { setDraft(settings) }, [settings])

  if (loading) return <div className="h-full bg-bb-blue-light" />
  if (!settings.signedIn) return <Navigate to="/signin" replace />

  return (
    <div className="flex h-full flex-col bg-white">
      <main className="bb-scroll relative min-h-0 flex-1 overflow-y-auto">
        <header className="bg-bb-blue-light">
          <div className="mx-auto flex h-[100px] max-w-[1180px] items-center justify-between px-6">
            <NavLink to="/" aria-label="Bluebook home"><BluebookLogo size={31} /></NavLink>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-4 text-[20px] font-medium" aria-haspopup="menu" aria-expanded={menuOpen}>
                {settings.studentName}
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-bb-black text-white">
                  <User size={24} />
                  {chatAvailable && chatUnread > 0 && !chatOpen && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bb-red px-1 text-[11px] font-bold text-white" aria-label={`${chatUnread} unread mentor messages`}>{chatUnread}</span>}
                </span>
              </button>
              {menuOpen && (
                <div role="menu" className="bb-fade-in absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-bb-gray-200 bg-white py-2 shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
                  {chatAvailable && (
                    <button type="button" role="menuitem" className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[16px] font-medium hover:bg-bb-gray-100" onClick={() => { setMenuOpen(false); toggleChat() }}>
                      <MessageCircle size={20} className="text-bb-blue" /> Chat with a Mentor
                      {chatUnread > 0 && !chatOpen && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bb-red px-1 text-[11px] font-bold text-white">{chatUnread}</span>}
                    </button>
                  )}
                  {[['Home', () => navigate('/')], ['My Practice', () => navigate('/results')], ['Profile & Settings', () => setProfileOpen(true)], ['Sign Out', async () => { await saveSettings({ signedIn: false }); navigate('/signin') }]].map(([label, fn]) => (
                    <button key={label} type="button" role="menuitem" className="block w-full px-5 py-2.5 text-left text-[16px] hover:bg-bb-gray-100" onClick={() => { setMenuOpen(false); fn() }}>{label}</button>
                  ))}
                  {bridge.isElectron && <button type="button" role="menuitem" className="block w-full px-5 py-2.5 text-left text-[16px] text-bb-red hover:bg-bb-gray-100" onClick={() => bridge.system.quit()}>Quit Bluebook</button>}
                </div>
              )}
            </div>
          </div>
        </header>
        <Outlet />
        <div className="h-16" />
      </main>
      <LobbyChatPanel />
      <div className="pointer-events-none fixed bottom-2 right-3 bg-white/90 px-2 py-1 text-[13px] text-bb-gray-500">{BUILD_STAMP}</div>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Profile & Settings"
        width={640}
        footer={<><button type="button" className="bb-btn-outline !py-2" onClick={() => setProfileOpen(false)}>Cancel</button><button type="button" className="bb-btn-primary !py-2" onClick={async () => { await saveSettings({ ...draft, studentName: FIXED_STUDENT_NAME }); setProfileOpen(false) }}>Save</button></>}
      >
        <div className="space-y-5">
          <label className="block"><span className="mb-1 block text-[15px] font-bold">Student name</span><input className="bb-input !py-2.5" value={FIXED_STUDENT_NAME} readOnly /></label>
          <label className="block"><span className="mb-1 block text-[15px] font-bold">Email</span><input className="bb-input !py-2.5" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-1 block text-[15px] font-bold">Test date</span><input type="date" className="bb-input !py-2.5" value={draft.registration.date.slice(0, 10)} onChange={(e) => setDraft({ ...draft, registration: { ...draft.registration, date: new Date(`${e.target.value}T08:00:00`).toISOString() } })} /></label>
            <label className="block"><span className="mb-1 block text-[15px] font-bold">Test center</span><input className="bb-input !py-2.5" value={draft.registration.center.name} onChange={(e) => setDraft({ ...draft, registration: { ...draft.registration, center: { ...draft.registration.center, name: e.target.value } } })} /></label>
          </div>
          <label className="block"><span className="mb-1 block text-[15px] font-bold">Center address (one line per row)</span><textarea rows={3} className="bb-input !py-2.5" value={draft.registration.center.lines.join('\n')} onChange={(e) => setDraft({ ...draft, registration: { ...draft.registration, center: { ...draft.registration.center, lines: e.target.value.split('\n') } } })} /></label>
          <div className="rounded-lg border border-bb-gray-200 p-4">
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={draft.chat?.enabled !== false} onChange={(e) => setDraft({ ...draft, chat: { ...(draft.chat || {}), enabled: e.target.checked } })} /><span className="text-[15px]"><b>Mentor chat</b> — message your mentors on Telegram from the dashboard or during a test (J key, or the chat button).</span></label>
            <label className="mt-3 block"><span className="mb-1 block text-[13px] font-bold text-bb-gray-600">Chat server URL (your Vercel deployment; leave blank to use this app's own address)</span><input className="bb-input !py-2 !text-[14px]" placeholder="https://your-app.vercel.app" value={draft.chat?.url || ''} onChange={(e) => setDraft({ ...draft, chat: { ...(draft.chat || {}), url: e.target.value.trim() } })} /></label>
          </div>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={draft.lockdown} onChange={(e) => setDraft({ ...draft, lockdown: e.target.checked })} /><span className="text-[15px]"><b>Full-screen test window</b> — tests open in their own full-screen window (you can still switch to other apps).</span></label>
          {info && <div className="rounded-lg bg-bb-gray-50 p-3 text-[13px] text-bb-gray-500">{info.platform}{info.electron ? ` · Electron ${info.electron}` : ' · browser'}{'encryptedStore' in info ? ` · storage ${info.encryptedStore ? 'encrypted' : 'plain'}` : ''}</div>}
        </div>
      </Modal>
    </div>
  )
}
