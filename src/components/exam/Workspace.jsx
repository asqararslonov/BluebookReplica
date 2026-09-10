import { useRef, useState } from 'react'
import { useExamStore } from '../../store/exam-store.js'
import PassagePane from './PassagePane.jsx'
import QuestionPane from './QuestionPane.jsx'

export default function Workspace() {
  const section = useExamStore((s) => s.currentSection())
  const question = useExamStore((s) => s.currentQuestion())
  const zoom = useExamStore((s) => s.zoom)
  const [split, setSplit] = useState(50)
  const containerRef = useRef(null)

  if (!question || !section) return null
  const hasStimulus = !!(question.passage || question.stimulusSvg || question.stimulusImage || question.table)
  const isSplit = section.layout === 'split' && hasStimulus

  const startDrag = (e) => {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const move = (ev) => setSplit(Math.max(28, Math.min(72, ((ev.clientX - rect.left) / rect.width) * 100)))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  if (!isSplit) {
    return (
      <div className="bb-scroll h-full overflow-y-auto" style={{ zoom }}>
        <div className="mx-auto max-w-[900px] px-6 pb-10 pt-12">
          <QuestionPane key={question.id} question={question} single />
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex h-full" style={{ zoom }}>
      <section className="bb-scroll h-full overflow-y-auto" style={{ width: `${split}%` }} aria-label="Passage">
        <PassagePane key={question.id} question={question} />
      </section>
      <div role="separator" aria-orientation="vertical" onPointerDown={startDrag} className="relative w-[3px] shrink-0 cursor-col-resize bg-bb-gray-400">
        <span className="absolute left-1/2 top-1/2 flex h-9 w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[3px] bg-bb-gray-600 text-[10px] leading-none text-white" aria-hidden="true">◀▶</span>
      </div>
      <section className="bb-scroll h-full min-w-0 flex-1 overflow-y-auto" aria-label="Question">
        <QuestionPane key={question.id} question={question} />
      </section>
    </div>
  )
}
