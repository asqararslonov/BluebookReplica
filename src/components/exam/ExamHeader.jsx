import { useEffect, useState } from 'react'
import { ChevronDown, Highlighter, StickyNote, Calculator as CalcIcon, MoreVertical, Sigma, BatteryFull, BatteryMedium, BatteryLow, BatteryCharging } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'
import Timer from './Timer.jsx'
import DirectionsPopover from './DirectionsPopover.jsx'
import MoreMenu from './MoreMenu.jsx'
import { passageApi } from './PassagePane.jsx'
import { useChatStore } from '../../store/chat-store.js'

export function useBattery() {
  const [b, setB] = useState(null)
  useEffect(() => {
    let battery
    const update = () => setB({ level: Math.round(battery.level * 100), charging: battery.charging })
    navigator.getBattery?.().then((bat) => { battery = bat; update(); bat.addEventListener('levelchange', update); bat.addEventListener('chargingchange', update) }).catch(() => {})
    return () => { battery?.removeEventListener('levelchange', update); battery?.removeEventListener('chargingchange', update) }
  }, [])
  return b
}

function ToolButton({ icon, label, active, onClick, extra = {} }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={label} className={`flex flex-col items-center gap-1.5 rounded-md px-2 py-1.5 text-[15px] font-medium ${active ? 'bg-bb-blue-light text-bb-blue' : 'hover:bg-bb-gray-100'}`} {...extra}>
      <span className="flex h-6 items-center gap-1.5">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default function ExamHeader() {
  const stage = useExamStore((s) => s.currentStage())
  const section = useExamStore((s) => s.currentSection())
  const directionsOpen = useExamStore((s) => s.directionsOpen)
  const setDirectionsOpen = useExamStore((s) => s.setDirectionsOpen)
  const calculatorOpen = useExamStore((s) => s.calculatorOpen)
  const setCalculatorOpen = useExamStore((s) => s.setCalculatorOpen)
  const referenceOpen = useExamStore((s) => s.referenceOpen)
  const setReferenceOpen = useExamStore((s) => s.setReferenceOpen)
  const annotationPanel = useExamStore((s) => s.annotationPanel)
  const setAnnotationPanel = useExamStore((s) => s.setAnnotationPanel)
  const sectionIndex = useExamStore((s) => s.test?.sections.findIndex((x) => x.id === stage?.sectionId) ?? 0)
  const battery = useBattery()
  const chatBase = useChatStore((s) => s.base)
  const chatCode = useChatStore((s) => s.code)
  const chatOpen = useChatStore((s) => s.open)
  const chatUnread = useChatStore((s) => s.unread)

  if (!stage || !section) return null
  const title = `Section ${sectionIndex + 1}, Module ${stage.moduleNumber}: ${section.name}`
  const BatteryIcon = battery?.charging ? BatteryCharging : battery && battery.level <= 20 ? BatteryLow : battery && battery.level <= 60 ? BatteryMedium : BatteryFull

  return (
    <header className="bb-dashed-b relative flex h-[104px] shrink-0 items-start justify-between px-[50px] pt-4">
      <div>
        <h1 className="text-[22px] font-bold leading-8">{title}</h1>
        <button type="button" data-directions-toggle onClick={() => setDirectionsOpen(!directionsOpen)} className="mt-1 inline-flex items-center gap-1 text-[17px] font-medium hover:underline" aria-expanded={directionsOpen}>
          Directions <ChevronDown size={18} className={directionsOpen ? 'rotate-180' : ''} />
        </button>
        <DirectionsPopover />
      </div>

      <div className="absolute left-1/2 top-4 -translate-x-1/2"><Timer /></div>

      <div className="flex flex-col items-end">
        {battery && <div className="mb-0.5 flex items-center gap-1 text-[13px] font-medium" aria-label={`Battery ${battery.level}%`}>{battery.level}% <BatteryIcon size={18} /></div>}
        <div className="flex items-start gap-3">
          {section.annotate && (
            <ToolButton icon={<><Highlighter size={20} /><StickyNote size={20} /></>} label="Highlights & Notes" active={!!annotationPanel} onClick={() => { if (annotationPanel) { setAnnotationPanel(null); return } if (!passageApi.annotateSelection()) setAnnotationPanel({ mode: 'list' }) }} />
          )}
          {section.calculator && <ToolButton icon={<CalcIcon size={22} />} label="Calculator" active={calculatorOpen} onClick={() => setCalculatorOpen(!calculatorOpen)} />}
          {section.referenceSheet && <ToolButton icon={<Sigma size={22} />} label="Reference" active={referenceOpen} onClick={() => setReferenceOpen(!referenceOpen)} />}
          <div className="relative">
            <MoreMenu trigger={(onClick, open) => <ToolButton icon={<MoreVertical size={22} />} label="More" active={open} onClick={onClick} extra={{ 'aria-haspopup': 'menu' }} />} />
            {chatBase && chatCode && chatUnread > 0 && !chatOpen && (
              <span className="pointer-events-none absolute right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-bb-red px-1 text-[11px] font-bold text-white" aria-label={`${chatUnread} unread`}>{chatUnread}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
