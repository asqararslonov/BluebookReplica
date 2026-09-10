import { Bookmark } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'

export default function QuestionToolbar({ question }) {
  const ms = useExamStore((s) => s.currentModuleState())
  const toggleFlag = useExamStore((s) => s.toggleFlag)
  const strikeMode = useExamStore((s) => s.strikeMode)
  const setStrikeMode = useExamStore((s) => s.setStrikeMode)
  if (!ms) return null
  const flagged = !!ms.flagged[question.id]
  return (
    <div>
      <div className="flex h-10 items-center justify-between bg-bb-gray-100 pr-3">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-9 items-center justify-center bg-bb-black text-[19px] font-bold text-white" aria-label={`Question ${ms.currentIndex + 1}`}>{ms.currentIndex + 1}</div>
          <button type="button" onClick={() => toggleFlag(question.id)} aria-pressed={flagged} className="flex items-center gap-2 text-[17px] font-medium hover:underline">
            <Bookmark size={20} className={flagged ? 'text-bb-red' : ''} fill={flagged ? 'currentColor' : 'none'} />
            Mark for Review
          </button>
        </div>
        {question.type === 'multiple_choice' && (
          <button type="button" onClick={() => setStrikeMode(!strikeMode)} aria-pressed={strikeMode} title="Cross out answer choices you think are wrong" className={`flex h-7 items-center rounded-[5px] border px-1 text-[11px] font-bold italic tracking-wide ${strikeMode ? 'border-bb-blue bg-bb-blue text-white' : 'border-bb-black bg-white'}`}>
            <span className="line-through decoration-[1.5px]">ABC</span>
          </button>
        )}
      </div>
      <div className="bb-rule" />
    </div>
  )
}
