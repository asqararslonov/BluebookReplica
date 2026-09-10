import { ChevronUp } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'

export default function Footer() {
  const studentName = useExamStore((s) => s.session?.studentName)
  const view = useExamStore((s) => s.session?.view)
  const ms = useExamStore((s) => s.currentModuleState())
  const mod = useExamStore((s) => s.currentModule())
  const navOpen = useExamStore((s) => s.navOpen)
  const setNavOpen = useExamStore((s) => s.setNavOpen)
  const next = useExamStore((s) => s.next)
  const back = useExamStore((s) => s.back)
  if (!ms || !mod) return null
  const isFirst = ms.currentIndex === 0 && view !== 'review'
  return (
    <footer className="bb-dashed-t relative flex h-[80px] shrink-0 items-center justify-between px-[50px]">
      <div className="text-[24px] font-bold">{studentName}</div>
      {view !== 'review' && (
        <button type="button" onClick={() => setNavOpen(!navOpen)} className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-bb-black px-5 py-2.5 text-[18px] font-bold text-white" aria-expanded={navOpen} aria-haspopup="dialog">
          Question {ms.currentIndex + 1} of {mod.questions.length}
          <ChevronUp size={20} className={navOpen ? 'rotate-180' : ''} />
        </button>
      )}
      <div className="flex items-center gap-4">
        {!isFirst && <button type="button" onClick={back} className="bb-btn-primary !px-9 !py-3 !text-[18px] !font-bold">Back</button>}
        <button type="button" onClick={next} className="bb-btn-primary !px-9 !py-3 !text-[18px] !font-bold">Next</button>
      </div>
    </footer>
  )
}
