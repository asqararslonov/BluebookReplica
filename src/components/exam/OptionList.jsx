import { InlineRich } from '../../lib/rich-text.jsx'

export default function OptionList({ question, value, eliminated = [], strikeMode, onSelect, onToggleEliminate }) {
  return (
    <div role="radiogroup" aria-label="Answer choices" className="flex flex-col gap-4">
      {question.options.map((opt) => {
        const selected = value === opt.id
        const struck = eliminated.includes(opt.id)
        return (
          <div key={opt.id} className="flex items-center gap-3">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => { if (struck) return; onSelect(selected ? null : opt.id) }}
              className={`bb-option ${selected ? 'bb-option-selected' : ''} ${struck ? 'bb-option-struck' : ''}`}
            >
              <span className="bb-option-letter">{opt.id}</span>
              <span className="bb-content min-w-0 flex-1 !text-[19px] !leading-[1.4]"><InlineRich text={opt.text} /></span>
            </button>
            {strikeMode && (
              struck ? (
                <button type="button" onClick={() => onToggleEliminate(opt.id)} className="w-12 shrink-0 text-[15px] font-medium underline">Undo</button>
              ) : (
                <button type="button" onClick={() => onToggleEliminate(opt.id)} aria-label={`Cross out choice ${opt.id}`} className="bb-strike-letter w-12 shrink-0 justify-self-center">{opt.id}</button>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
