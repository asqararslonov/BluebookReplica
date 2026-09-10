import { Clock } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'
import { mmss } from '../../lib/format.js'

export default function Timer() {
  const ms = useExamStore((s) => s.currentModuleState())
  const toggleTimer = useExamStore((s) => s.toggleTimer)
  const untimed = useExamStore((s) => s.test?.preview || s.session?.mode === 'preview')
  if (!ms || untimed) return null
  const low = ms.timeRemaining <= 300
  const hidden = ms.timerHidden
  return (
    <div className="flex flex-col items-center" aria-live={low ? 'polite' : 'off'}>
      {hidden ? (
        <div className="flex h-[36px] items-center text-bb-gray-600"><Clock size={24} /></div>
      ) : (
        <div className={`h-[36px] text-[27px] font-normal leading-[36px] tabular-nums ${low ? 'bb-timer-red' : ''}`} data-testid="timer">{mmss(ms.timeRemaining)}</div>
      )}
      <button type="button" onClick={toggleTimer} className={`mt-1.5 rounded-full border-[1.5px] px-3.5 py-0.5 text-[15px] font-medium ${low ? 'border-bb-red text-bb-red' : 'border-bb-black'}`} aria-label={hidden ? 'Show timer' : 'Hide timer'}>
        {hidden ? 'Show' : 'Hide'}
      </button>
    </div>
  )
}
