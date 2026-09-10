import { useEffect, useRef, useState } from 'react'
import { SendHorizontal, MessageCircle } from 'lucide-react'
import { useChatStore } from '../../store/chat-store.js'
import { useExamStore } from '../../store/exam-store.js'

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function MentorChat() {
  const { open, messages, status, error, send, sending, code } = useChatStore()
  const stage = useExamStore((s) => s.currentStage())
  const section = useExamStore((s) => s.currentSection())
  const ms = useExamStore((s) => s.currentModuleState())
  const [text, setText] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Opening with J must not focus the input, so the next J press hides the chat instead of typing.
  useEffect(() => { if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [open, messages.length])

  if (!open) return null
  const context = stage?.type === 'module' && section ? `${section.shortName} · Module ${stage.moduleNumber}${ms ? ` · Q${ms.currentIndex + 1}` : ''}` : ''

  const submit = async (e) => {
    e?.preventDefault()
    if (!text.trim() || sending) return
    const ok = await send(text, context)
    if (ok) setText('')
  }

  return (
    <aside className="bb-fade-in fixed bottom-[92px] right-6 z-40 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-bb-gray-300 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.25)]" role="dialog" aria-label="Mentor chat">
      <header className="flex items-center justify-between bg-bb-navy px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <div>
            <div className="text-[15px] font-bold leading-tight">Mentor Chat</div>
            <div className="flex items-center gap-1.5 text-[12px] text-white/75">
              <span className={`inline-block h-2 w-2 rounded-full ${status === 'online' ? 'bg-green-400' : status === 'offline' ? 'bg-red-400' : 'bg-yellow-300'}`} />
              {status === 'online' ? 'Connected' : status === 'offline' ? 'Reconnecting…' : 'Connecting…'} · code {code}
            </div>
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold">J</span>
      </header>

      <div ref={listRef} className="bb-scroll flex-1 space-y-3 overflow-y-auto bg-bb-gray-50 px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-[13px] leading-relaxed text-bb-gray-500">Ask your mentor about the question you're on. Your message is sent with the section, module and question number so they can see what you're looking at.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.from === 'student' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${m.from === 'student' ? 'rounded-br-sm bg-bb-blue text-white' : 'rounded-bl-sm border border-bb-gray-200 bg-white'}`}>{m.text}</div>
            <div className="mt-1 text-[11px] text-bb-gray-500">{m.from === 'mentor' ? m.name || 'Mentor' : 'You'} · {timeLabel(m.ts)}{m.from === 'student' && m.context ? ` · ${m.context}` : ''}</div>
          </div>
        ))}
        {error && status === 'offline' && <p className="text-center text-[12px] text-bb-red">{error}</p>}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-bb-gray-200 bg-white p-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } else if (e.key === 'Escape') { e.currentTarget.blur() } }}
          rows={2}
          placeholder="Type your question… (Enter to send)"
          className="bb-input !rounded-xl !px-3 !py-2 !text-[14px]"
          maxLength={1000}
        />
        <button type="submit" disabled={!text.trim() || sending} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bb-blue text-white hover:bg-bb-blue-dark disabled:bg-bb-gray-300"><SendHorizontal size={18} /></button>
      </form>
      <div className="bg-white px-3 pb-2 text-center text-[11px] text-bb-gray-500">Press <b>J</b> to show or hide this chat · click the box to type, <b>Esc</b> to leave it</div>
    </aside>
  )
}
