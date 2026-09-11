import { useEffect, useState } from 'react'
import { Lock, Monitor, Clock } from 'lucide-react'
import bridge, { isElectron } from '../../lib/bridge.js'
import { useExamStore } from '../../store/exam-store.js'
import { getModule } from '../../lib/schema.js'

export default function StartScreen() {
  const session = useExamStore((s) => s.session)
  const test = useExamStore((s) => s.test)
  const beginTest = useExamStore((s) => s.beginTest)
  const setLockdownInfo = useExamStore((s) => s.setLockdownInfo)
  const [sys, setSys] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([bridge.system.info(), bridge.system.displays()]).then(([info, displays]) => {
      if (!alive) return
      setSys({ info, displays })
      setLockdownInfo({ displays, info })
    })
    return () => { alive = false }
  }, [setLockdownInfo])

  const rows = session.stages.map((stage, i) => {
    if (stage.type === 'break') return { key: stage.key, label: 'Break', detail: `${stage.durationMinutes} minutes` }
    const section = test.sections.find((s) => s.id === stage.sectionId)
    const sectionIndex = test.sections.findIndex((s) => s.id === stage.sectionId)
    const mod = getModule(test, stage.sectionId, stage.moduleNumber, stage.variant === 'auto' ? null : stage.variant)
    return { key: stage.key, label: `Section ${sectionIndex + 1}, Module ${stage.moduleNumber}: ${section.name}`, detail: `${mod.questions.length} questions · ${mod.durationMinutes} minutes${stage.variant === 'auto' ? ' · difficulty adapts to Module 1' : stage.variant ? ` · ${stage.variant === 'hard' ? 'harder' : 'easier'} module` : ''}`, index: i }
  })
  const totalMinutes = session.stages.reduce((a, st) => a + (st.type === 'break' ? st.durationMinutes : getModule(test, st.sectionId, st.moduleNumber, st.variant === 'auto' ? null : st.variant).durationMinutes), 0)

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="bb-dashed-b flex h-[72px] shrink-0 items-center justify-between px-8">
        <div className="text-[18px] font-bold">{test.title}</div>
        <div className="text-[15px] font-semibold">{session.studentName}</div>
      </header>
      <main className="bb-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-6 py-10">
          <h1 className="text-[32px] font-bold">{test.preview ? 'Test Preview' : 'Ready to begin?'}</h1>
          <p className="mt-2 text-[16px] text-bb-gray-500">{session.presetLabel} · about {Math.round(totalMinutes)} minutes</p>

          <div className="bb-card mt-6 p-6">
            <h2 className="mb-3 text-[16px] font-bold">What to expect</h2>
            <ol className="space-y-2">
              {rows.map((r) => (
                <li key={r.key} className="flex items-start gap-3 text-[15px]">
                  <Clock size={18} className="mt-0.5 shrink-0 text-bb-gray-500" />
                  <div><div className="font-semibold">{r.label}</div><div className="text-[13px] text-bb-gray-500">{r.detail}</div></div>
                </li>
              ))}
            </ol>
          </div>

          <div className="bb-card mt-4 p-6">
            <h2 className="mb-3 text-[16px] font-bold">Testing environment</h2>
            <div className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="flex items-center gap-2"><Lock size={16} className="text-bb-gray-500" /> Test window: <b>{session.lockdown ? 'Full screen' : 'Windowed'}</b></div>
              <div className="flex items-center gap-2"><Monitor size={16} className="text-bb-gray-500" /> Displays: <b>{sys ? sys.displays.count : '…'}</b></div>
            </div>
          </div>

          <div className="bb-content mt-6 !text-[15px] !leading-relaxed">
            <p>The timer starts as soon as you click <b>Start Test</b>. Each module is timed separately, and you'll move on automatically when time runs out. You can hide the timer, mark questions for review, cross out answer choices, and use the question navigator to move around within a module — but you can't return to a module once it's over.</p>
          </div>
        </div>
      </main>
      <footer className="bb-dashed-t flex h-16 shrink-0 items-center justify-end px-8">
        <button type="button" className="bb-btn-primary !px-8" onClick={beginTest} autoFocus>Start Test</button>
      </footer>
    </div>
  )
}
