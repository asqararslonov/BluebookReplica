import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, Bookmark } from 'lucide-react'
import bridge from '../lib/bridge.js'
import { normalizeTest, getModule } from '../lib/schema.js'
import { buildResults, routingThreshold } from '../lib/mst.js'
import { formatDate } from '../lib/format.js'
import QuestionReview from '../components/lobby/QuestionReview.jsx'

function Outcome({ outcome }) {
  if (outcome === 'correct') return <span className="inline-flex items-center gap-1 text-bb-green"><CheckCircle2 size={16} /> Correct</span>
  if (outcome === 'incorrect') return <span className="inline-flex items-center gap-1 text-bb-red"><XCircle size={16} /> Incorrect</span>
  return <span className="inline-flex items-center gap-1 text-bb-gray-500"><MinusCircle size={16} /> Omitted</span>
}

export default function ResultDetail() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [test, setTest] = useState(null)
  const [error, setError] = useState(null)
  const [review, setReview] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const s = await bridge.sessions.get(sessionId)
        if (!s) throw new Error('Attempt not found')
        const raw = await bridge.tests.load(s.testId)
        if (!alive) return
        setSession(s)
        setTest(normalizeTest(raw))
      } catch (e) { setError(e.message) }
    })()
    return () => { alive = false }
  }, [sessionId])

  const results = useMemo(() => (session && test ? session.results || buildResults(test, session) : null), [session, test])

  if (error) return <div className="p-10 text-bb-red">{error}</div>
  if (!session || !test || !results) return <div className="p-10 text-bb-gray-500">Loading…</div>

  const preview = test.preview
  return (
    <div className="mx-auto max-w-[1160px] px-8 py-8">
      <button type="button" className="bb-link text-[14px]" onClick={() => navigate('/results')}>← My Practice</button>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-bold">{session.testTitle}</h1>
          <p className="text-[14px] text-bb-gray-500">{session.presetLabel} · {formatDate(session.completedAt || session.createdAt)} · {session.studentName}</p>
        </div>
        {session.status === 'aborted' && <span className="rounded-full bg-bb-red-light px-3 py-1 text-[13px] font-semibold text-bb-red">Exited early — partial results</span>}
      </div>

      <div className="mt-6 grid grid-cols-[300px_1fr] gap-4">
        <div className="bb-card flex flex-col items-center justify-center p-6 text-center">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-bb-gray-500">{preview ? 'Preview' : 'Total Score'}</div>
          {preview ? (
            <div className="mt-2 text-[40px] font-bold">{results.totalCorrect}/{results.totalQuestions}</div>
          ) : results.composite != null ? (
            <><div className="mt-1 text-[56px] font-bold leading-none">{results.composite}</div><div className="mt-2 text-[13px] text-bb-gray-500">400–1600{results.compositeEstimated ? ' · estimated' : ''}</div></>
          ) : (
            <><div className="mt-1 text-[56px] font-bold leading-none">{results.sections[0]?.scaled ?? '—'}</div><div className="mt-2 text-[13px] text-bb-gray-500">{results.sections[0]?.name} · 200–800{results.sections[0]?.estimated ? ' · estimated' : ''}</div></>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {results.sections.map((sec) => {
            const section = test.sections.find((s) => s.id === sec.sectionId)
            const m1 = getModule(test, sec.sectionId, 1, null)
            const threshold = m1 ? routingThreshold(section, m1) : null
            const m1Result = sec.modules.find((m) => m.moduleNumber === 1)
            return (
              <div key={sec.sectionId} className="bb-card p-5">
                <div className="flex items-baseline justify-between"><h2 className="text-[16px] font-bold">{sec.name}</h2>{!preview && <span className="text-[28px] font-bold">{sec.scaled}{sec.estimated ? '*' : ''}</span>}</div>
                <div className="mt-1 text-[13px] text-bb-gray-500">{sec.raw} of {sec.total} correct ({sec.percent}%)</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bb-gray-200"><div className="h-full bg-bb-blue" style={{ width: `${sec.percent}%` }} /></div>
                <ul className="mt-3 space-y-1 text-[13px]">
                  {sec.modules.map((m) => (
                    <li key={m.key} className="flex justify-between"><span>Module {m.moduleNumber}{m.variant ? ` (${m.variant === 'hard' ? 'harder' : 'easier'})` : ''}</span><span className="font-semibold">{m.correct}/{m.total}</span></li>
                  ))}
                </ul>
                {sec.routedVariant && m1Result && threshold != null && (
                  <p className="mt-3 rounded bg-bb-gray-50 px-3 py-2 text-[12px] text-bb-gray-500">Adaptive routing: {m1Result.correct} correct in Module 1 vs. threshold {threshold} → routed to the <b>{sec.routedVariant === 'hard' ? 'harder' : 'easier'}</b> Module 2.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {results.domains.length > 0 && (
        <div className="bb-card mt-4 p-5">
          <h2 className="text-[16px] font-bold">Knowledge and Skills</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3">
            {results.domains.map((d) => (
              <div key={d.domain}>
                <div className="flex justify-between text-[13px]"><span className="font-semibold">{d.domain}</span><span className="text-bb-gray-500">{d.correct}/{d.total}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-bb-gray-200"><div className={`h-full ${d.percent >= 70 ? 'bg-bb-green' : d.percent >= 45 ? 'bg-amber-500' : 'bg-bb-red'}`} style={{ width: `${d.percent}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.sections.map((sec) => sec.modules.map((m) => {
        const mod = getModule(test, sec.sectionId, m.moduleNumber, m.variant)
        const state = session.modules[m.key]
        return (
          <div key={m.key} className="bb-card mt-4 overflow-hidden">
            <div className="flex items-center justify-between bg-bb-gray-50 px-5 py-3">
              <h2 className="text-[15px] font-bold">{sec.name} — Module {m.moduleNumber}{m.variant ? ` (${m.variant === 'hard' ? 'harder' : 'easier'})` : ''}</h2>
              <span className="text-[13px] text-bb-gray-500">{m.correct}/{m.total} correct{m.timeUsedSeconds != null ? ` · ${Math.round(m.timeUsedSeconds / 60)} min used` : ''}</span>
            </div>
            <table className="w-full text-[13px]">
              <thead className="text-left text-[11px] uppercase tracking-wide text-bb-gray-500"><tr><th className="px-5 py-2">#</th><th className="px-3 py-2">Domain</th><th className="px-3 py-2">Your answer</th><th className="px-3 py-2">Correct</th><th className="px-3 py-2">Result</th><th className="px-3 py-2"></th></tr></thead>
              <tbody className="divide-y divide-bb-gray-200">
                {m.questions.map((q, i) => (
                  <tr key={q.id} className="hover:bg-bb-gray-50">
                    <td className="px-5 py-2 font-semibold">{q.number}{q.flagged && <Bookmark size={12} className="ml-1 inline text-bb-red" fill="currentColor" />}</td>
                    <td className="px-3 py-2 text-bb-gray-500">{q.domain}</td>
                    <td className="px-3 py-2 font-mono">{q.answer ?? '—'}</td>
                    <td className="px-3 py-2 font-mono">{Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : typeof q.correctAnswer === 'object' ? `${q.correctAnswer.min}–${q.correctAnswer.max}` : q.correctAnswer}</td>
                    <td className="px-3 py-2"><Outcome outcome={q.outcome} /></td>
                    <td className="px-3 py-2 text-right"><button type="button" className="bb-link text-[13px]" onClick={() => setReview({ module: mod, index: i, state })}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }))}

      {review && <QuestionReview module={review.module} index={review.index} state={review.state} onClose={() => setReview(null)} onNavigate={(i) => setReview({ ...review, index: i })} />}
    </div>
  )
}
