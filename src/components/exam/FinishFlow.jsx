import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleHelp, Home, X } from 'lucide-react'
import bridge from '../../lib/bridge.js'
import { useExamStore } from '../../store/exam-store.js'
import { Dots } from '../lobby/Brand.jsx'
import Modal from '../ui/Modal.jsx'

function Confetti() {
  const pieces = useMemo(() => {
    let a = 7
    const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647 }
    const colors = ['#f6c945', '#f4a0b5', '#7fd3e6', '#ffffff', '#ff8fa3']
    return Array.from({ length: 110 }, (_, i) => ({ id: i, x: rnd() * 100, y: rnd() * 100, r: rnd() * 180, c: colors[Math.floor(rnd() * colors.length)], w: 3 + rnd() * 3, h: 7 + rnd() * 8, dot: rnd() < 0.3 }))
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => <span key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.dot ? 8 : p.w, height: p.dot ? 8 : p.h, background: p.c, borderRadius: p.dot ? '50%' : 2, transform: `rotate(${p.r}deg)`, opacity: 0.9 }} />)}
    </div>
  )
}

function UploadArt() {
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="105" fill="#eef1fb" />
      <rect x="50" y="70" width="120" height="82" rx="8" fill="#fff" stroke="#3a3a3a" strokeWidth="5" />
      <rect x="62" y="82" width="96" height="60" fill="#e9ecf3" />
      <rect x="30" y="150" width="160" height="14" rx="4" fill="#cfd6e6" stroke="#3a3a3a" strokeWidth="4" />
      <path d="M110 74 L136 106 L120 106 L120 128 L100 128 L100 106 L84 106 Z" fill="#fff" stroke="#3a3a3a" strokeWidth="5" strokeLinejoin="round" />
      <rect x="94" y="118" width="32" height="10" rx="3" fill="#8fc7e8" stroke="#3a3a3a" strokeWidth="3" /><rect x="94" y="132" width="32" height="8" rx="3" fill="#8fc7e8" stroke="#3a3a3a" strokeWidth="3" />
    </svg>
  )
}
function SmileArt() {
  return (
    <svg width="300" height="260" viewBox="0 0 300 260" aria-hidden="true">
      <circle cx="150" cy="130" r="120" fill="#eef1fb" />
      <rect x="30" y="50" width="240" height="150" rx="12" fill="#fff" stroke="#3a3a3a" strokeWidth="6" />
      <rect x="48" y="66" width="204" height="120" fill="#e9ecf3" />
      <circle cx="150" cy="126" r="42" fill="#bfe3f0" stroke="#3a3a3a" strokeWidth="5" />
      <circle cx="136" cy="118" r="4" fill="#3a3a3a" /><circle cx="164" cy="118" r="4" fill="#3a3a3a" />
      <path d="M132 134 q18 18 36 0" fill="none" stroke="#3a3a3a" strokeWidth="5" strokeLinecap="round" />
      <rect x="10" y="200" width="280" height="20" rx="6" fill="#cfd6e6" stroke="#3a3a3a" strokeWidth="5" />
    </svg>
  )
}

export default function FinishFlow() {
  const navigate = useNavigate()
  const session = useExamStore((s) => s.session)
  const setFeedback = useExamStore((s) => s.setFeedback)
  const [stage, setStage] = useState('standby')
  const [pct, setPct] = useState(0)
  const [rating, setRating] = useState(null)
  const [comment, setComment] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (stage !== 'standby') return
    const start = Date.now()
    const id = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / 3200) * 100))
      setPct(p)
      if (p >= 100) { clearInterval(id); setTimeout(() => setStage('feedback'), 400) }
    }, 120)
    return () => clearInterval(id)
  }, [stage])

  const end = async (navigateTo) => {
    const r = await bridge.exam.finish(session.id, { navigateTo })
    if (!r?.handled) navigate(navigateTo, { replace: true })
  }

  const bar = (
    <div className="flex h-[70px] shrink-0 items-center justify-between bg-white px-[380px]">
      <button type="button" onClick={() => setHelpOpen(true)} className="flex items-center gap-3 text-[18px] font-medium"><CircleHelp size={26} /> Help</button>
      <button type="button" onClick={() => end('/')} className="flex items-center gap-2 text-[18px] font-medium">Return to Home <Home size={22} /></button>
    </div>
  )

  if (stage === 'standby') {
    return (
      <div className="flex h-full flex-col bg-bb-gray-50">
        {bar}
        <div className="flex flex-1 flex-col items-center pt-14 text-center">
          <h1 className="text-[40px] font-normal">Your Test Is Over: Stand By!</h1>
          <p className="mt-6 max-w-[520px] text-[24px] leading-snug text-bb-gray-600">All your work has been saved, and we're uploading it now. Do not refresh this page or quit the app.</p>
          <div className="mt-8 w-[570px] rounded-2xl bg-white px-10 py-10 shadow-[0_2px_10px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-center gap-4"><span className="scale-75"><Dots /></span><span className="text-[22px] font-medium">{pct}%</span></div>
            <div className="mt-4 flex justify-center"><UploadArt /></div>
            <p className="mt-6 text-[20px]">If this screen doesn't update in a few minutes, hit <b>Return to Home</b></p>
          </div>
        </div>
        <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Help"><p className="text-[16px]">Your responses are saved on this device as they're submitted. If this screen doesn't finish, return to Home; your score report will still be available under My Practice.</p></Modal>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-bb-night text-white">
      <div className="relative z-10 flex h-[70px] shrink-0 items-center justify-between bg-white px-[380px] text-bb-black">
        <button type="button" onClick={() => setHelpOpen(true)} className="flex items-center gap-3 text-[18px] font-medium"><CircleHelp size={26} /> Help</button>
        <button type="button" onClick={() => end('/')} className="flex items-center gap-2 text-[18px] font-medium">Return to Home <Home size={22} /></button>
      </div>
      <Confetti />
      <div className="relative z-10 flex flex-1 flex-col items-center pt-12">
        <h1 className="text-[44px] font-normal">You're All Finished!</h1>
        <div className="mt-12 flex w-[900px] items-stretch rounded-2xl bg-white px-10 py-12 text-bb-black shadow-xl">
          <div className="flex w-[380px] items-center justify-center border-r border-bb-gray-300"><SmileArt /></div>
          <div className="flex flex-1 items-center pl-16 text-[22px] leading-snug">
            <p>Congratulations on completing the SAT! Your score report is ready — select <b>View Your Score</b> to see how you did.</p>
          </div>
        </div>
        <button type="button" onClick={() => end(`/results/${session.id}`)} className="bb-btn-yellow mt-12 !px-9 !py-4 !text-[18px]">View Your Score</button>
      </div>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Help"><p className="text-[16px]">Your test is complete and saved. Choose <b>View Your Score</b> for your score report, or <b>Return to Home</b>.</p></Modal>

      {stage === 'feedback' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="fb-title" className="bb-fade-in relative w-[820px] rounded-2xl bg-white px-[108px] pb-10 pt-14 text-bb-black">
            <button type="button" aria-label="Close" onClick={() => setStage('finished')} className="absolute right-11 top-20 text-bb-gray-600 hover:text-bb-black"><X size={26} /></button>
            <h2 id="fb-title" className="text-center text-[32px] font-medium leading-tight">Overall, how would you rate your experience taking a test?</h2>
            <div className="mt-8 space-y-3" role="radiogroup">
              {['Excellent', 'Good', 'Fair', 'Poor'].map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-4 rounded-md bg-bb-gray-50 px-3 py-3 text-[20px]">
                  <input type="radio" name="rating" className="h-6 w-6 accent-bb-blue" checked={rating === r} onChange={() => setRating(r)} /> {r}
                </label>
              ))}
            </div>
            <div className="mt-12 text-[24px] font-medium">What went well? What can we improve?</div>
            <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className="bb-input mt-4 !rounded-lg !text-[18px]" />
            <div className="mt-16 flex items-center justify-end gap-10">
              <button type="button" className="text-[20px] font-medium text-bb-blue" onClick={() => setStage('finished')}>Dismiss</button>
              <button type="button" disabled={!rating} className={`rounded-full px-8 py-4 text-[20px] font-medium ${rating ? 'bg-bb-yellow text-bb-black' : 'bg-bb-gray-200 text-bb-gray-500'}`} onClick={() => { setFeedback({ rating, comment }); setStage('finished') }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
