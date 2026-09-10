import { BatteryFull, BatteryMedium, BatteryLow, BatteryCharging } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'
import { mss } from '../../lib/format.js'
import { useBattery } from './ExamHeader.jsx'

function BatteryPill() {
  const battery = useBattery()
  if (!battery) return null
  const Icon = battery.charging ? BatteryCharging : battery.level <= 20 ? BatteryLow : battery.level <= 60 ? BatteryMedium : BatteryFull
  return (
    <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-[14px] font-bold" aria-label={`Battery ${battery.level}%`}>
      {battery.level}% <Icon size={18} />
    </div>
  )
}

export default function BreakScreen() {
  const b = useExamStore((s) => s.session?.breakState)
  const studentName = useExamStore((s) => s.session?.studentName)
  const mode = useExamStore((s) => s.session?.mode)
  const endBreak = useExamStore((s) => s.endBreak)
  if (!b) return null

  // In the proctored test-day flow the clock must run out before testing resumes;
  // in a self-run mock the student may move on when the break is over for them.
  const testDay = mode === 'test-day'
  const canResume = !testDay || b.timeRemaining <= 0

  return (
    <div className="fixed inset-0 flex bg-bb-black text-white">
      <BatteryPill />

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="rounded-[4px] border border-white px-14 py-5">
          <p className="text-[22px] font-bold">Remaining Break Time:</p>
          <div className="mt-1 text-[64px] font-bold leading-tight tabular-nums" data-testid="break-timer">{mss(b.timeRemaining)}</div>
        </div>
        {canResume && (
          <button type="button" onClick={endBreak} className="mt-9 rounded-full bg-bb-yellow px-7 py-3 text-[17px] font-bold text-bb-black hover:bg-bb-yellow-dark">
            {testDay ? 'Resume Testing Now' : 'Resume Testing'}
          </button>
        )}
      </div>

      <div className="flex w-[52%] items-center pr-24">
        <div className="max-w-[520px]">
          <hr className="my-7 border-t border-white/80" />
          <h2 className="text-[34px] font-bold leading-tight">Take a Break: Do Not Close Your Device</h2>
          <p className="mt-5 text-[17px] leading-relaxed">
            After the break, use the <b>Resume Testing</b> button to start the next section.
          </p>
          <p className="mt-5 text-[17px] font-bold">Follow these rules during the break:</p>
          <ol className="mt-3 list-decimal space-y-3 pl-6 text-[17px] leading-relaxed marker:font-normal">
            <li>Do not disturb students who are still testing.</li>
            <li>Do not exit the app or close your laptop.</li>
            <li>Do not access phones, smartwatches, textbooks, notes, or the internet.</li>
            <li>Do not eat or drink near any testing device.</li>
            <li>Do not speak in the testing room; outside the room, do not discuss the exam with anyone.</li>
          </ol>
        </div>
      </div>

      <div className="absolute bottom-6 left-10 text-[19px] font-bold">{studentName}</div>
    </div>
  )
}
