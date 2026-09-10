import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'
import { RichText, toHtml, tableHtml, figureHtml } from '../../lib/rich-text.jsx'
import { SPR_DIRECTIONS } from '../../lib/schema.js'
import QuestionToolbar from './QuestionToolbar.jsx'
import OptionList from './OptionList.jsx'
import SprInput from './SprInput.jsx'

export default function QuestionPane({ question, single = false }) {
  const ms = useExamStore((s) => s.currentModuleState())
  const strikeMode = useExamStore((s) => s.strikeMode)
  const answer = useExamStore((s) => s.answer)
  const toggleEliminate = useExamStore((s) => s.toggleEliminate)
  const [sprOpen, setSprOpen] = useState(false)
  const stimulusHtml = useMemo(() => (single ? figureHtml(question) + toHtml(question.passage) + tableHtml(question.table) : ''), [question, single])
  if (!ms) return null
  const value = ms.answers[question.id]

  return (
    <div className={single ? 'overflow-hidden rounded-lg border border-bb-gray-200' : 'pl-[55px] pr-[55px] pt-12'}>
      <QuestionToolbar question={question} />
      <div className="pb-6 pt-6">
        {single && stimulusHtml && <div className="bb-content mb-5" dangerouslySetInnerHTML={{ __html: stimulusHtml }} />}
        {question.type === 'spr' && (
          <div className="mb-5 rounded border border-bb-gray-300">
            <button type="button" onClick={() => setSprOpen(!sprOpen)} aria-expanded={sprOpen} className="flex w-full items-center justify-between px-3 py-2 text-[14px] font-semibold">
              Student-produced response directions
              <ChevronDown size={16} className={sprOpen ? 'rotate-180' : ''} />
            </button>
            {sprOpen && <RichText text={SPR_DIRECTIONS.replace(/^\*\*.*\*\*\n\n/, '')} className="border-t border-bb-gray-200 px-4 py-3 !text-[14px]" />}
          </div>
        )}
        <RichText text={question.stem} className="mb-6" />
        {question.type === 'multiple_choice' ? (
          <OptionList
            question={question}
            value={value}
            eliminated={ms.eliminated[question.id] || []}
            strikeMode={strikeMode}
            onSelect={(id) => answer(question.id, id)}
            onToggleEliminate={(id) => toggleEliminate(question.id, id)}
          />
        ) : (
          <SprInput value={value || ''} onChange={(v) => answer(question.id, v)} />
        )}
      </div>
    </div>
  )
}
