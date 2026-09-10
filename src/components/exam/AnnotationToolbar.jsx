import { createPortal } from 'react-dom'
import { StickyNote, Underline, X } from 'lucide-react'

export const HIGHLIGHT_COLORS = { yellow: '#fff08a', blue: '#bfe0ff', pink: '#ffc2dc' }

export default function AnnotationToolbar({ x, y, onColor, onNote, onClose }) {
  const width = 300
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, x - width / 2))
  const top = Math.max(8, y - 50)
  const stop = (e) => e.preventDefault()
  return createPortal(
    <div role="toolbar" aria-label="Annotate selection" className="bb-fade-in fixed z-40 flex items-center gap-1 rounded-full border border-bb-gray-300 bg-white px-2 py-1 shadow-[0_6px_20px_rgba(0,0,0,0.2)]" style={{ left, top, width }} onMouseDown={stop}>
      {Object.entries(HIGHLIGHT_COLORS).map(([name, color]) => (
        <button key={name} type="button" title={`Highlight ${name}`} aria-label={`Highlight ${name}`} onClick={() => onColor(name)} className="h-6 w-6 rounded-full border border-bb-gray-400 hover:scale-110" style={{ background: color }} />
      ))}
      <button type="button" title="Underline" aria-label="Underline" onClick={() => onColor('underline')} className="rounded p-1 hover:bg-bb-gray-100"><Underline size={16} /></button>
      <span className="mx-1 h-5 w-px bg-bb-gray-300" />
      <button type="button" onClick={onNote} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold hover:bg-bb-gray-100"><StickyNote size={15} /> Add note</button>
      <button type="button" aria-label="Cancel" onClick={onClose} className="ml-auto rounded-full p-1 hover:bg-bb-gray-100"><X size={15} /></button>
    </div>,
    document.body,
  )
}
