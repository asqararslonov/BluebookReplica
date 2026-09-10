import { useExamStore } from '../../store/exam-store.js'
import { Dots } from '../lobby/Brand.jsx'

export default function TransitionScreen() {
  const reason = useExamStore((s) => s.transitionReason)
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center" aria-live="polite">
      <h1 className="text-[38px] font-light text-bb-heading">{reason === 'time' ? 'Time Is Up' : 'This Module Is Over'}</h1>
      <p className="mt-9 text-[24px] text-bb-gray-600">All your work has been saved.</p>
      <p className="mt-5 text-[24px] text-bb-gray-600">You'll move on automatically in just a moment.</p>
      <p className="mt-5 text-[24px] text-bb-gray-600">Do not refresh this page or quit the app.</p>
      <div className="mt-20"><Dots /></div>
    </div>
  )
}
