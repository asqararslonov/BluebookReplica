import { ShieldAlert } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'

const MESSAGES = {
  blur: ['Bluebook lost focus', 'You switched away from the testing app. On test day this is reported to the proctor and could invalidate your score. Your timer has been paused. Resume as soon as you can.'],
  'fullscreen-exit': ['Full-screen mode ended', 'The test must stay in full-screen. Click Resume Testing to return to full-screen mode.'],
  display: ['Display change detected', 'A monitor was connected or disconnected. Only one display is allowed during testing. Disconnect any extra displays, then resume.'],
}

export default function IntegrityOverlay() {
  const reason = useExamStore((s) => s.pauseReason)
  const resume = useExamStore((s) => s.resume)
  const incidents = useExamStore((s) => (s.session?.integrityLog || []).filter((e) => e.type !== 'focus').length)
  const [title, body] = MESSAGES[reason] || ['Testing paused', 'Click Resume Testing to continue.']
  const onResume = async () => {
    try { if (!document.fullscreenElement && !window.bluebook) await document.documentElement.requestFullscreen?.() } catch { /* ignore */ }
    resume()
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bb-navy/95 text-white" role="alertdialog" aria-labelledby="integrity-title">
      <div className="max-w-lg px-8 text-center">
        <ShieldAlert size={56} className="mx-auto mb-5 text-bb-yellow" />
        <h1 id="integrity-title" className="text-[30px] font-bold">{title}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-white/85">{body}</p>
        <p className="mt-4 text-[13px] text-white/60">Incidents recorded this session: {incidents}</p>
        <button type="button" onClick={onResume} className="bb-btn mt-8 bg-white text-bb-navy hover:bg-bb-gray-100">Resume Testing</button>
      </div>
    </div>
  )
}
