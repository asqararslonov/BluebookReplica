import { useEffect, useRef } from 'react'
import { Bookmark, MapPin, X } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'

export function NavBox({ number, answered, flagged, current, onClick, size = 'sm' }) {
  return (
    <div className="relative flex flex-col items-center">
      {current && <MapPin size={14} className="absolute -top-4 text-bb-black" fill="currentColor" aria-label="Current question" />}
      <button
        type="button"
        onClick={onClick}
        className={`bb-navbox ${answered ? 'bb-navbox-answered' : 'bb-navbox-unanswered'} ${current ? 'bb-navbox-current' : ''} ${size === 'lg' ? '!h-10 !w-10 !text-[15px]' : ''}`}
        aria-label={`Question ${number}${answered ? ', answered' : ', unanswered'}${flagged ? ', marked for review' : ''}${current ? ', current' : ''}`}
      >
        {number}
        {flagged && <Bookmark size={12} className="absolute -right-1 -top-1 text-bb-red" fill="currentColor" />}
      </button>
    </div>
  )
}

export function NavLegend() {
  return (
    <div className="flex items-center justify-center gap-6 text-[13px]">
      <span className="inline-flex items-center gap-1.5"><MapPin size={14} fill="currentColor" /> Current</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 border-[1.5px] border-dashed border-bb-black" /> Unanswered</span>
      <span className="inline-flex items-center gap-1.5"><Bookmark size={14} className="text-bb-red" fill="currentColor" /> For Review</span>
    </div>
  )
}

export default function NavFlyout() {
  const open = useExamStore((s) => s.navOpen)
  const setOpen = useExamStore((s) => s.setNavOpen)
  const stage = useExamStore((s) => s.currentStage())
  const section = useExamStore((s) => s.currentSection())
  const mod = useExamStore((s) => s.currentModule())
  const ms = useExamStore((s) => s.currentModuleState())
  const goTo = useExamStore((s) => s.goTo)
  const openReview = useExamStore((s) => s.openReview)
  const sectionIndex = useExamStore((s) => s.test?.sections.findIndex((x) => x.id === stage?.sectionId) ?? 0)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('footer')) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, setOpen])

  if (!open || !mod || !ms) return null
  return (
    <div ref={ref} role="dialog" aria-label="Question navigator" className="bb-fade-in absolute bottom-[72px] left-1/2 z-30 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border border-bb-gray-300 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between border-b border-bb-gray-200 px-5 py-3">
        <h2 className="text-[15px] font-bold">Section {sectionIndex + 1}, Module {stage.moduleNumber}: {section.name} Questions</h2>
        <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-bb-gray-100"><X size={18} /></button>
      </div>
      <div className="border-b border-bb-gray-200 py-3"><NavLegend /></div>
      <div className="bb-scroll max-h-[40vh] overflow-y-auto px-5 pb-4 pt-6">
        <div className="grid grid-cols-10 gap-x-3 gap-y-5">
          {mod.questions.map((q, i) => (
            <NavBox key={q.id} number={i + 1} answered={ms.answers[q.id] !== undefined} flagged={!!ms.flagged[q.id]} current={i === ms.currentIndex} onClick={() => goTo(i)} />
          ))}
        </div>
      </div>
      <div className="flex justify-center border-t border-bb-gray-200 px-5 py-3">
        <button type="button" className="bb-btn-outline !py-1.5 !text-[14px]" onClick={openReview}>Go to Review Page</button>
      </div>
    </div>
  )
}
