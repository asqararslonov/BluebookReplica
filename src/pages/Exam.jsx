import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import bridge from '../lib/bridge.js'
import { useExamStore } from '../store/exam-store.js'
import ExamShell from '../components/exam/ExamShell.jsx'

export default function Exam() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const status = useExamStore((s) => s.status)
  const error = useExamStore((s) => s.error)
  const load = useExamStore((s) => s.load)
  const phase = useExamStore((s) => s.session?.phase)
  const sessionStatus = useExamStore((s) => s.session?.status)

  useEffect(() => { load(sessionId) }, [sessionId, load])

  // Exited early: leave immediately. Completed tests show the Stand By / Finished flow first.
  useEffect(() => {
    if (status !== 'ready' || phase !== 'done' || sessionStatus !== 'aborted') return
    let cancelled = false
    ;(async () => {
      const result = await bridge.exam.abort(sessionId)
      if (!cancelled && !result?.handled) navigate(useExamStore.getState().session?.mode === 'preview' ? '/' : `/results/${sessionId}`, { replace: true })
    })()
    return () => { cancelled = true }
  }, [status, phase, sessionId, sessionStatus, navigate])

  if (status === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white">
        <div className="bb-spinner" />
        <p className="text-sm text-bb-gray-500">Loading your test…</p>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <h1 className="text-2xl font-bold">We couldn't open this test</h1>
        <p className="max-w-md text-bb-gray-500">{error}</p>
        <button type="button" className="bb-btn-primary" onClick={async () => { const r = await bridge.exam.abort(sessionId); if (!r?.handled) navigate('/', { replace: true }) }}>
          Return to Bluebook
        </button>
      </div>
    )
  }
  return <ExamShell />
}
