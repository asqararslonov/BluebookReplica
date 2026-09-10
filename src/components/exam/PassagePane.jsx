import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useExamStore } from '../../store/exam-store.js'
import { toHtml, tableHtml, figureHtml } from '../../lib/rich-text.jsx'
import { applyHighlights, selectionOffsets, clearSelection } from '../../lib/highlights.js'
import AnnotationToolbar from './AnnotationToolbar.jsx'

// Lets the header "Annotate" button act on the current passage selection.
export const passageApi = { annotateSelection: () => false }
const EMPTY = [] // stable reference so the highlight effect doesn't re-run (and clear the selection) on every render

export default function PassagePane({ question }) {
  const ms = useExamStore((s) => s.currentModuleState())
  const addAnnotation = useExamStore((s) => s.addAnnotation)
  const setAnnotationPanel = useExamStore((s) => s.setAnnotationPanel)
  const setActiveAnnotation = useExamStore((s) => s.setActiveAnnotation)
  const activeAnnotationId = useExamStore((s) => s.activeAnnotationId)
  const annotations = ms?.annotations?.[question.id] || EMPTY
  const ref = useRef(null)
  const [toolbar, setToolbar] = useState(null)

  const html = useMemo(() => figureHtml(question) + toHtml(question.passage) + tableHtml(question.table), [question])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = html
    applyHighlights(el, annotations)
    if (activeAnnotationId) {
      el.querySelectorAll(`mark[data-id="${activeAnnotationId}"]`).forEach((m) => m.classList.add('bb-hl-active'))
      el.querySelector(`mark[data-id="${activeAnnotationId}"]`)?.scrollIntoView({ block: 'nearest' })
    }
  }, [html, annotations, activeAnnotationId])

  const createFromSelection = (color) => {
    const off = selectionOffsets(ref.current)
    if (!off) return null
    const ann = addAnnotation(question.id, { start: off.start, end: off.end, text: off.text, color })
    clearSelection()
    setToolbar(null)
    return ann
  }
  passageApi.annotateSelection = () => {
    const ann = createFromSelection('yellow')
    if (!ann) return false
    setActiveAnnotation(ann.id)
    setAnnotationPanel({ mode: 'list', focus: ann.id })
    return true
  }

  const onMouseUp = () => {
    setTimeout(() => {
      const off = selectionOffsets(ref.current)
      if (!off) { setToolbar(null); return }
      const rect = window.getSelection().getRangeAt(0).getBoundingClientRect()
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top })
    }, 0)
  }

  const onClick = (e) => {
    const mark = e.target.closest?.('mark.bb-hl, .bb-note-pin')
    if (mark?.dataset.id) {
      setActiveAnnotation(mark.dataset.id)
      setAnnotationPanel({ mode: 'list', focus: mark.dataset.id })
    }
  }

  return (
    <div className="px-[55px] py-12">
      <div ref={ref} className="bb-content select-text" onMouseUp={onMouseUp} onClick={onClick} data-testid="passage" />
      {toolbar && (
        <AnnotationToolbar
          x={toolbar.x}
          y={toolbar.y}
          onColor={(c) => createFromSelection(c)}
          onNote={() => {
            const ann = createFromSelection('yellow')
            if (!ann) return
            setActiveAnnotation(ann.id)
            setAnnotationPanel({ mode: 'list', focus: ann.id })
          }}
          onClose={() => { clearSelection(); setToolbar(null) }}
        />
      )}
    </div>
  )
}
