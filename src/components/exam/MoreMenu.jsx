import { useEffect, useRef, useState } from 'react'
import { CircleHelp, Keyboard, Settings, Coffee, LogOut } from 'lucide-react'
import { useExamStore } from '../../store/exam-store.js'

export default function MoreMenu({ trigger }) {
  const [open, setOpen] = useState(false)
  const setDialog = useExamStore((s) => s.setDialog)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const items = [
    { label: 'Help', icon: CircleHelp, action: () => setDialog('help') },
    { label: 'Keyboard Shortcuts', icon: Keyboard, action: () => setDialog('shortcuts') },
    { label: 'Settings', icon: Settings, action: () => setDialog('settings') },
    { label: 'Unscheduled Break', icon: Coffee, action: () => setDialog('break') },
    { label: 'Exit the Exam', icon: LogOut, action: () => setDialog('exit'), danger: true },
  ]
  return (
    <div ref={ref} className="relative">
      {trigger(() => setOpen(!open), open)}
      {open && (
        <div role="menu" className="bb-fade-in absolute right-0 top-full z-30 mt-1 w-60 rounded-md border border-bb-gray-300 bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          {items.map(({ label, icon: Icon, action, danger }) => (
            <button key={label} type="button" role="menuitem" onClick={() => { setOpen(false); action() }} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-bb-gray-100 ${danger ? 'text-bb-red' : ''}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
