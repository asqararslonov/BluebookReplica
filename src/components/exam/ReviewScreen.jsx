import { useExamStore } from '../../store/exam-store.js'
import { NavBox, NavLegend } from './NavFlyout.jsx'

export default function ReviewScreen() {
  const stage = useExamStore((s) => s.currentStage())
  const section = useExamStore((s) => s.currentSection())
  const mod = useExamStore((s) => s.currentModule())
  const ms = useExamStore((s) => s.currentModuleState())
  const goTo = useExamStore((s) => s.goTo)
  const sectionIndex = useExamStore((s) => s.test?.sections.findIndex((x) => x.id === stage?.sectionId) ?? 0)
  if (!mod || !ms) return null
  const answered = mod.questions.filter((q) => ms.answers[q.id] !== undefined).length
  return (
    <div className="bb-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[760px] px-6 py-10 text-center">
        <h1 className="text-[30px] font-bold">Check Your Work</h1>
        <p className="mx-auto mt-3 max-w-[600px] text-[15px] leading-relaxed text-bb-gray-500">
          You can return to any question in this module until time runs out. When time expires, you'll move on automatically.
        </p>
        <div className="bb-card mt-8 p-6">
          <h2 className="text-[16px] font-bold">Section {sectionIndex + 1}, Module {stage.moduleNumber}: {section.name} Questions</h2>
          <p className="mt-1 text-[13px] text-bb-gray-500">{answered} of {mod.questions.length} answered</p>
          <div className="my-4 border-y border-bb-gray-200 py-3"><NavLegend /></div>
          <div className="grid grid-cols-9 gap-x-4 gap-y-6 px-2 pt-4">
            {mod.questions.map((q, i) => (
              <NavBox key={q.id} number={i + 1} size="lg" answered={ms.answers[q.id] !== undefined} flagged={!!ms.flagged[q.id]} current={false} onClick={() => goTo(i)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
