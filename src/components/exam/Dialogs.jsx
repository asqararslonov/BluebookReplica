import { useEffect, useState } from 'react'
import { Coffee } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { useExamStore } from '../../store/exam-store.js'
import { isElectron } from '../../lib/bridge.js'

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

export const SHORTCUTS = [
  [`${MOD} + →`, 'Next question'],
  [`${MOD} + ←`, 'Previous question'],
  [`${MOD} + B`, 'Mark / unmark for review'],
  [`${MOD} + Shift + A`, 'Toggle answer-choice cross-out (ABC)'],
  [`${MOD} + Shift + Q`, 'Open / close the question navigator'],
  [`${MOD} + Shift + T`, 'Hide / show the timer'],
  [`${MOD} + Shift + C`, 'Open / close the calculator (Math)'],
  [`${MOD} + Shift + E`, 'Open / close the reference sheet (Math)'],
  ['Alt + 1 … 4', 'Select answer choice A … D'],
  ['Esc', 'Close open menus and panels'],
]

export function ExamDialogs() {
  const dialog = useExamStore((s) => s.dialog)
  const setDialog = useExamStore((s) => s.setDialog)
  const abortTest = useExamStore((s) => s.abortTest)
  const zoom = useExamStore((s) => s.zoom)
  const setZoom = useExamStore((s) => s.setZoom)
  const lineReader = useExamStore((s) => s.lineReader)
  const setLineReader = useExamStore((s) => s.setLineReader)
  const setUnscheduledBreak = useExamStore((s) => s.setUnscheduledBreak)
  const lockdownInfo = useExamStore((s) => s.lockdownInfo)
  const incidents = useExamStore((s) => (s.session?.integrityLog || []).filter((e) => e.type !== 'focus').length)
  const lockdown = useExamStore((s) => s.session?.lockdown)
  const close = () => setDialog(null)

  return (
    <>
      <Modal open={dialog === 'help'} onClose={close} title="Help">
        <div className="space-y-4 text-[15px] leading-relaxed">
          <p>If you need help during the test, raise your hand for the proctor. The tools below work as follows.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><b>Directions</b> — reopen the section directions at any time from the top left.</li>
            <li><b>Timer</b> — hide or show it. It reappears automatically in red when 5 minutes remain.</li>
            <li><b>Annotate</b> — select passage text to highlight it, underline it, or attach a note.</li>
            <li><b>Calculator</b> — a Desmos graphing calculator you can move and resize (Math only).</li>
            <li><b>Reference</b> — common geometry formulas (Math only).</li>
            <li><b>Mark for Review</b> — flags a question so you can find it in the navigator.</li>
            <li><b>ABC cross-out</b> — eliminate answer choices you think are wrong.</li>
            <li><b>Question navigator</b> — jump to any question and see what's answered, unanswered, or flagged.</li>
          </ul>
        </div>
      </Modal>

      <Modal open={dialog === 'shortcuts'} onClose={close} title="Keyboard Shortcuts">
        <table className="w-full text-[14px]">
          <tbody>
            {SHORTCUTS.map(([keys, desc]) => (
              <tr key={keys} className="border-b border-bb-gray-200 last:border-0">
                <td className="py-2 pr-4 font-mono text-[13px] font-semibold whitespace-nowrap">{keys}</td>
                <td className="py-2">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      <Modal open={dialog === 'settings'} onClose={close} title="Settings">
        <div className="space-y-6 text-[15px]">
          <div>
            <div className="mb-2 font-semibold">Zoom</div>
            <div className="flex items-center gap-3">
              <button type="button" className="bb-btn-outline !px-4 !py-1" onClick={() => setZoom(zoom - 0.1)} aria-label="Zoom out">−</button>
              <span className="w-16 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" className="bb-btn-outline !px-4 !py-1" onClick={() => setZoom(zoom + 0.1)} aria-label="Zoom in">+</button>
              <button type="button" className="bb-link text-[13px]" onClick={() => setZoom(1)}>Reset</button>
            </div>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={lineReader} onChange={(e) => setLineReader(e.target.checked)} className="h-4 w-4" />
            <span><span className="font-semibold">Line reader</span> — dims everything except the line under your cursor.</span>
          </label>
          <div className="rounded-md bg-bb-gray-50 p-4 text-[14px]">
            <div className="mb-1 font-semibold">Testing environment</div>
            <div>Lockdown mode: <b>{lockdown && isElectron ? 'On (kiosk)' : lockdown ? 'Simulated (browser full-screen)' : 'Off (windowed)'}</b></div>
            {lockdownInfo?.shortcuts && <div>System shortcuts intercepted: <b>{lockdownInfo.shortcuts.registered.length}</b>{lockdownInfo.shortcuts.failed.length ? ` (${lockdownInfo.shortcuts.failed.length} reserved by the OS)` : ''}</div>}
            {lockdownInfo?.displays && <div>Displays detected: <b>{lockdownInfo.displays.count}</b></div>}
            <div>Focus / display incidents this session: <b>{incidents}</b></div>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === 'break'}
        onClose={close}
        title="Unscheduled Break"
        footer={<><button type="button" className="bb-btn-outline" onClick={close}>Cancel</button><button type="button" className="bb-btn-primary" onClick={() => setUnscheduledBreak(true)}>Start Break</button></>}
      >
        <p className="text-[15px] leading-relaxed">Just like on test day, <b>your timer will keep running</b> while you're away. Your screen will be covered until you come back and click Resume Testing.</p>
      </Modal>

      <Modal
        open={dialog === 'exit'}
        onClose={close}
        title="Exit the Exam?"
        footer={<><button type="button" className="bb-btn-outline" onClick={close}>Cancel</button><button type="button" className="bb-btn bg-bb-red text-white hover:bg-red-800" onClick={abortTest}>Exit Exam</button></>}
      >
        <p className="text-[15px] leading-relaxed">If you exit now, this attempt ends. Your answers so far are saved and you'll see partial results, but you can't resume this attempt.</p>
      </Modal>
    </>
  )
}

export function UnscheduledBreakOverlay() {
  const setUnscheduledBreak = useExamStore((s) => s.setUnscheduledBreak)
  const ms = useExamStore((s) => s.currentModuleState())
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bb-navy text-white">
      <Coffee size={48} className="mb-4 opacity-80" />
      <h1 className="text-[32px] font-bold">You're on a break</h1>
      <p className="mt-2 max-w-md text-center text-white/80">Your timer is still running{ms ? ` — ${Math.floor(ms.timeRemaining / 60)} minutes remain in this module` : ''}. Click below when you're ready to continue.</p>
      <button type="button" className="bb-btn mt-8 bg-white text-bb-navy hover:bg-bb-gray-100" onClick={() => setUnscheduledBreak(false)}>Resume Testing</button>
    </div>
  )
}

export function LineReader() {
  const [y, setY] = useState(null)
  useEffect(() => {
    const move = (e) => setY(e.clientY)
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  if (y === null) return null
  const band = 40
  return (
    <div className="pointer-events-none fixed inset-0 z-[35]" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: Math.max(0, y - band / 2) }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ top: y + band / 2 }} />
    </div>
  )
}
