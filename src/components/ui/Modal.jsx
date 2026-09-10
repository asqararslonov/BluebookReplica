import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 560, footer = null, closable = true, dark = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && closable) onClose?.() }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => ref.current?.querySelector('button, input, [tabindex]')?.focus(), 0)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open, onClose, closable])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && closable) onClose?.() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={`bb-fade-in flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg ${dark ? 'bg-bb-navy text-white' : 'bg-white'} shadow-2xl`} style={{ maxWidth: width }}>
        {(title || closable) && (
          <div className={`flex items-center justify-between border-b px-6 py-4 ${dark ? 'border-white/15' : 'border-bb-gray-200'}`}>
            <h2 className="text-lg font-bold">{title}</h2>
            {closable && (
              <button type="button" onClick={onClose} aria-label="Close" className={`rounded-full p-1 ${dark ? 'hover:bg-white/10' : 'hover:bg-bb-gray-100'}`}>
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="bb-scroll overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className={`flex items-center justify-end gap-3 border-t px-6 py-4 ${dark ? 'border-white/15' : 'border-bb-gray-200'}`}>{footer}</div>}
      </div>
    </div>
  )
}
