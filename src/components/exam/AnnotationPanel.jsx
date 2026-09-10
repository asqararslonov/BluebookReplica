import { useEffect, useRef } from 'react'
import { Trash2, X } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'
import { HIGHLIGHT_COLORS } from './AnnotationToolbar.jsx'

const EMPTY_LIST = []

export default function AnnotationPanel() {
  const panel = useExamStore((s) => s.annotationPanel)
  const setPanel = useExamStore((s) => s.setAnnotationPanel)
  const question = useExamStore((s) => s.currentQuestion())
  const ms = useExamStore((s) => s.currentModuleState())
  const updateAnnotation = useExamStore((s) => s.updateAnnotation)
  const removeAnnotation = useExamStore((s) => s.removeAnnotation)
  const activeId = useExamStore((s) => s.activeAnnotationId)
  const setActive = useExamStore((s) => s.setActiveAnnotation)
  const focusRef = useRef(null)
  const list = ms?.annotations?.[question?.id] || EMPTY_LIST

  useEffect(() => {
    if (panel?.focus && focusRef.current) focusRef.current.focus()
  }, [panel?.focus])

  return (
    <aside className="bb-fade-in absolute bottom-0 right-0 top-0 z-20 flex w-[340px] flex-col border-l border-bb-gray-300 bg-white shadow-[-6px_0_20px_rgba(0,0,0,0.12)]" aria-label="Annotations">
      <div className="flex items-center justify-between border-b border-bb-gray-200 px-4 py-3">
        <h2 className="text-[15px] font-bold">Annotations</h2>
        <button type="button" aria-label="Close annotations" onClick={() => { setPanel(null); setActive(null) }} className="rounded-full p-1 hover:bg-bb-gray-100"><X size={18} /></button>
      </div>
      <div className="bb-scroll flex-1 overflow-y-auto px-4 py-3">
        {list.length === 0 && (
          <p className="text-[14px] leading-relaxed text-bb-gray-500">Select text in the passage to highlight it or add a note. Your annotations are saved with this question.</p>
        )}
        {list.map((a) => {
          const active = a.id === activeId
          return (
            <div key={a.id} className={`mb-3 rounded-md border p-3 ${active ? 'border-bb-blue ring-2 ring-bb-blue/25' : 'border-bb-gray-200'}`} onClick={() => setActive(a.id)}>
              <blockquote className="mb-2 line-clamp-3 border-l-4 pl-2 font-serif text-[14px] italic" style={{ borderColor: HIGHLIGHT_COLORS[a.color] || '#0077c8' }}>{a.text}</blockquote>
              <div className="mb-2 flex items-center gap-1.5">
                {Object.entries(HIGHLIGHT_COLORS).map(([name, color]) => (
                  <button key={name} type="button" aria-label={`Set ${name}`} onClick={() => updateAnnotation(question.id, a.id, { color: name })} className={`h-5 w-5 rounded-full border ${a.color === name ? 'ring-2 ring-bb-black' : 'border-bb-gray-400'}`} style={{ background: color }} />
                ))}
                <button type="button" onClick={() => updateAnnotation(question.id, a.id, { color: 'underline' })} className={`rounded px-1.5 text-[12px] underline ${a.color === 'underline' ? 'bg-bb-gray-100 font-bold' : ''}`}>U</button>
                <button type="button" aria-label="Delete annotation" onClick={() => removeAnnotation(question.id, a.id)} className="ml-auto rounded p-1 text-bb-gray-500 hover:bg-bb-red-light hover:text-bb-red"><Trash2 size={15} /></button>
              </div>
              <textarea
                ref={panel?.focus === a.id ? focusRef : null}
                value={a.note}
                onChange={(e) => updateAnnotation(question.id, a.id, { note: e.target.value })}
                placeholder="Add a note…"
                rows={2}
                className="bb-input !py-1.5 !text-[14px]"
              />
            </div>
          )
        })}
      </div>
    </aside>
  )
}
