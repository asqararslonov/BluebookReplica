import { Check, X as XIcon } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { RichText, InlineRich, toHtml, tableHtml, figureHtml } from '../../lib/rich-text.jsx'
import { questionOutcome } from '../../lib/mst.js'

export default function QuestionReview({ module, index, state, onClose, onNavigate }) {
  const q = module.questions[index]
  const answer = state?.answers?.[q.id]
  const outcome = questionOutcome(q, answer)
  const stimulus = figureHtml(q) + toHtml(q.passage) + tableHtml(q.table)
  const correctText = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' or ') : typeof q.correctAnswer === 'object' ? `${q.correctAnswer.min} to ${q.correctAnswer.max}` : q.correctAnswer
  return (
    <Modal
      open
      onClose={onClose}
      width={1040}
      title={<span>Question {index + 1} of {module.questions.length} <span className={`ml-3 rounded-full px-2.5 py-0.5 text-[12px] ${outcome === 'correct' ? 'bg-bb-green-light text-bb-green' : outcome === 'incorrect' ? 'bg-bb-red-light text-bb-red' : 'bg-bb-gray-100 text-bb-gray-500'}`}>{outcome}</span></span>}
      footer={<><button type="button" className="bb-btn-outline" disabled={index === 0} onClick={() => onNavigate(index - 1)}>Back</button><button type="button" className="bb-btn-primary" disabled={index >= module.questions.length - 1} onClick={() => onNavigate(index + 1)}>Next</button></>}
    >
      <div className={`grid gap-8 ${stimulus ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {stimulus && <div className="bb-content border-r border-bb-gray-200 pr-6" dangerouslySetInnerHTML={{ __html: stimulus }} />}
        <div>
          <div className="mb-1 text-[12px] text-bb-gray-500">{q.domain}{q.skill ? ` · ${q.skill}` : ''} · {q.difficulty}</div>
          <RichText text={q.stem} className="mb-4" />
          {q.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {q.options.map((o) => {
                const isCorrect = o.id === q.correctAnswer
                const chosen = o.id === answer
                return (
                  <div key={o.id} className={`flex items-start gap-3 rounded-md border px-3 py-2 ${isCorrect ? 'border-bb-green bg-bb-green-light' : chosen ? 'border-bb-red bg-bb-red-light' : 'border-bb-gray-200'}`}>
                    <span className="bb-option-letter !h-6 !w-6 !text-[13px]">{o.id}</span>
                    <span className="bb-content flex-1 !text-[15px]"><InlineRich text={o.text} /></span>
                    {isCorrect && <Check size={18} className="text-bb-green" />}
                    {chosen && !isCorrect && <XIcon size={18} className="text-bb-red" />}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-1 text-[15px]">
              <div>Your answer: <b className="font-mono">{answer ?? '—'}</b></div>
              <div>Correct answer: <b className="font-mono">{correctText}</b></div>
            </div>
          )}
          {q.explanation && (
            <div className="mt-5 rounded-md bg-bb-gray-50 p-4">
              <div className="mb-1 text-[13px] font-bold uppercase tracking-wide text-bb-gray-500">Explanation</div>
              <RichText text={q.explanation} className="!text-[15px]" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
