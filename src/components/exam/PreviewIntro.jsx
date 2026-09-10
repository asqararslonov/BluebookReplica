import { useNavigate } from 'react-router-dom'
import { Search, Clock, Accessibility } from 'lucide-react'
import bridge from '../../lib/bridge.js'
import { useExamStore } from '../../store/exam-store.js'

const ITEMS = [
  { icon: Search, title: 'Explore Bluebook', text: 'Sample questions from AP Exams or the SAT Suite of Assessments, and try out the testing tools. You won’t receive scores or any feedback on your answers.' },
  { icon: Clock, title: 'Take Your Time', text: 'The sections in this preview are untimed. On test day, a timer will be running.' },
  { icon: Accessibility, title: 'Assistive Technology', text: 'You may use assistive technology with the preview. If you’re approved for extra time or breaks, you’ll get that on test day but not in this preview.' },
]

export default function PreviewIntro() {
  const navigate = useNavigate()
  const session = useExamStore((s) => s.session)
  const beginTest = useExamStore((s) => s.beginTest)
  const back = async () => {
    const r = await bridge.exam.abort(session.id)
    if (!r?.handled) navigate('/', { replace: true })
  }
  return (
    <div className="flex h-full flex-col bg-bb-gray-50">
      <main className="bb-scroll flex-1 overflow-y-auto">
        <h1 className="mt-10 text-center text-[52px] font-normal">Take a Test Preview</h1>
        <div className="mx-auto mb-12 mt-14 w-[1040px] rounded-2xl bg-white px-24 py-16 shadow-[0_2px_10px_rgba(0,0,0,0.12)]">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="mb-12 grid grid-cols-[76px_1fr] gap-x-6 last:mb-0">
              <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-bb-gray-200"><Icon size={38} strokeWidth={1.8} /></span>
              <div>
                <h2 className="mt-2 text-[36px] font-medium leading-tight">{title}</h2>
                <p className="mt-4 max-w-[760px] text-[28px] leading-[1.45] text-bb-gray-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer className="flex h-[130px] shrink-0 items-center justify-end gap-8 bg-white px-8 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <button type="button" onClick={back} className="bb-btn-primary !px-11 !py-5 !text-[24px] !font-bold">Back</button>
        <button type="button" onClick={beginTest} className="bb-btn-primary !px-11 !py-5 !text-[24px] !font-bold" autoFocus>Next</button>
      </footer>
    </div>
  )
}
