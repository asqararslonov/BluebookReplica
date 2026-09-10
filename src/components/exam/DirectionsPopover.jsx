import { useEffect, useRef } from 'react'
import { useExamStore } from '../../store/exam-store.js'
import { RichText } from '../../lib/rich-text.jsx'

export default function DirectionsPopover() {
  const open = useExamStore((s) => s.directionsOpen)
  const setOpen = useExamStore((s) => s.setDirectionsOpen)
  const section = useExamStore((s) => s.currentSection())
  const mod = useExamStore((s) => s.currentModule())
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-directions-toggle]')) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, setOpen])
  if (!open || !section) return null
  return (
    <div ref={ref} className="bb-fade-in absolute left-6 top-[88px] z-30 w-[560px] max-w-[calc(100vw-48px)] rounded-lg border border-bb-gray-300 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.2)]" role="dialog" aria-label="Directions">
      <div className="bb-scroll max-h-[60vh] overflow-y-auto px-6 py-5">
        <RichText text={mod?.directions || section.directions} className="!text-[15px] !leading-relaxed" />
      </div>
      <div className="flex justify-end border-t border-bb-gray-200 px-5 py-3">
        <button type="button" className="bb-btn-primary !py-1.5 !text-[14px]" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  )
}
