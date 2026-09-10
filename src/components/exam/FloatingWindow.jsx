import { useState } from 'react'
import { Maximize2, Minimize2, X } from 'lucide-react'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default function FloatingWindow({ title, initial, minWidth = 320, minHeight = 260, expandedWidth = null, onClose, children }) {
  const [box, setBox] = useState(initial)
  const [expanded, setExpanded] = useState(false)

  const drag = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const { x, y } = box
    const move = (ev) => setBox((b) => ({ ...b, x: clamp(x + ev.clientX - startX, 0, window.innerWidth - 120), y: clamp(y + ev.clientY - startY, 0, window.innerHeight - 48) }))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const resize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const { w, h } = box
    const move = (ev) => setBox((b) => ({ ...b, w: clamp(w + ev.clientX - startX, minWidth, window.innerWidth - b.x), h: clamp(h + ev.clientY - startY, minHeight, window.innerHeight - b.y) }))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const width = expanded && expandedWidth ? Math.min(expandedWidth, window.innerWidth - box.x) : box.w

  return (
    <div className="bb-float" style={{ left: box.x, top: box.y, width, height: box.h }} role="dialog" aria-label={title}>
      <div className="bb-float-header" onPointerDown={drag}>
        <span>{title}</span>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {expandedWidth && (
            <button type="button" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(!expanded)} className="rounded p-1 hover:bg-white/15">
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="rounded p-1 hover:bg-white/15"><X size={18} /></button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
      <div className="bb-resize-handle" onPointerDown={resize} aria-hidden="true" />
    </div>
  )
}
