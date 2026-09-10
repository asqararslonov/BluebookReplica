import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import bridge from '../lib/bridge.js'
import { useLobbyStore } from '../store/lobby-store.js'
import { formatDate } from '../lib/format.js'

function StatusBadge({ status }) {
  const map = { completed: ['Completed', 'bg-bb-green-light text-bb-green'], 'in-progress': ['In progress', 'bg-bb-blue-light text-bb-blue'], ready: ['Not started', 'bg-bb-gray-100 text-bb-gray-500'], aborted: ['Exited early', 'bg-bb-red-light text-bb-red'] }
  const [label, cls] = map[status] || [status, 'bg-bb-gray-100']
  return <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${cls}`}>{label}</span>
}

function scoreLabel(s) {
  if (!s.results) return '—'
  if (s.results.composite != null) return `${s.results.composite}${s.results.compositeEstimated ? '*' : ''}`
  const sec = s.results.sections[0]
  if (!sec) return '—'
  return `${sec.scaled}${sec.estimated ? '*' : ''} (${sec.sectionId === 'math' ? 'Math' : 'R&W'})`
}

export default function Results() {
  const navigate = useNavigate()
  const { sessions, deleteSession } = useLobbyStore()
  const completed = sessions.filter((s) => s.status === 'completed' && s.results?.composite != null)
  const best = completed.length ? Math.max(...completed.map((s) => s.results.composite)) : null
  const avg = completed.length ? Math.round(completed.reduce((a, s) => a + s.results.composite, 0) / completed.length) : null

  return (
    <div className="mx-auto max-w-[1160px] px-8 py-8">
      <h1 className="text-[30px] font-bold">My Practice</h1>
      <p className="mt-1 text-[15px] text-bb-gray-500">Scores, routing decisions, and question-by-question review for every attempt.</p>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bb-card p-5"><div className="text-[13px] text-bb-gray-500">Full tests completed</div><div className="mt-1 text-[32px] font-bold">{completed.length}</div></div>
        <div className="bb-card p-5"><div className="text-[13px] text-bb-gray-500">Best total score</div><div className="mt-1 text-[32px] font-bold">{best ?? '—'}</div></div>
        <div className="bb-card p-5"><div className="text-[13px] text-bb-gray-500">Average total score</div><div className="mt-1 text-[32px] font-bold">{avg ?? '—'}</div></div>
      </div>
      <div className="bb-card mt-6 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead className="bg-bb-gray-50 text-left text-[12px] uppercase tracking-wide text-bb-gray-500">
            <tr><th className="px-4 py-3">Test</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Score</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-bb-gray-200">
            {sessions.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-bb-gray-500">No attempts yet. Start a practice test from the Home page.</td></tr>}
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-bb-gray-50">
                <td className="px-4 py-3 font-semibold">{s.testTitle}</td>
                <td className="px-4 py-3 text-bb-gray-500">{s.presetLabel}</td>
                <td className="px-4 py-3 text-bb-gray-500">{formatDate(s.completedAt || s.startedAt || s.createdAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 font-bold tabular-nums">{scoreLabel(s)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    {s.status === 'completed' || s.status === 'aborted' ? (
                      <button type="button" className="bb-btn-outline !py-1 !text-[13px]" onClick={() => navigate(`/results/${s.id}`)}>View</button>
                    ) : (
                      <button type="button" className="bb-btn-primary !py-1 !text-[13px]" onClick={() => bridge.exam.start(s.id, { lockdown: s.lockdown })}>Resume</button>
                    )}
                    <button type="button" aria-label="Delete attempt" className="rounded-full p-1.5 text-bb-gray-500 hover:bg-bb-red-light hover:text-bb-red" onClick={() => { if (window.confirm('Delete this attempt? This cannot be undone.')) deleteSession(s.id) }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-bb-gray-500">* Estimated — computed from a partial section or module.</p>
    </div>
  )
}
