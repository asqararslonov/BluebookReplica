import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Download } from 'lucide-react'
import { useLobbyStore } from '../store/lobby-store.js'
import StartTestDialog, { startFullTest } from '../components/lobby/StartTestDialog.jsx'

export default function Practice() {
  const navigate = useNavigate()
  const { manifest, progress, download, remove, loading, error, settings } = useLobbyStore()
  const [dialogTest, setDialogTest] = useState(null)
  const [busy, setBusy] = useState(false)
  const tests = manifest.filter((t) => t.kind !== 'preview')

  const start = async (t) => {
    setBusy(true)
    try { await startFullTest(t, settings) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-6 pt-10">
      <button type="button" className="bb-link text-[18px]" onClick={() => navigate('/')}>← Return to Home</button>
      <h1 className="mt-4 text-[40px] font-bold">Full-Length Practice</h1>
      <p className="mt-2 max-w-3xl text-[18px] leading-relaxed text-bb-gray-600">Full-length tests run exactly like the digital SAT: two adaptive Reading and Writing modules, a 10-minute break, and two adaptive Math modules. Start a test to download it to this device; downloaded tests work offline.</p>
      {error && <div className="mt-4 rounded bg-bb-red-light px-3 py-2 text-bb-red">{error}</div>}
      {loading && <div className="mt-6 text-bb-gray-500">Loading…</div>}
      <div className="mt-8 grid grid-cols-4 gap-7">
        {tests.map((t) => {
          const p = progress[t.testId]
          return (
            <div key={t.testId} className="bb-card flex h-[235px] flex-col overflow-hidden">
              <div className="flex items-center justify-between bg-bb-blue-light px-6 py-6">
                <span className="text-[24px] font-medium">{t.title}</span>
                {t.cached && <button type="button" aria-label={`Remove ${t.title}`} className="text-bb-gray-600 hover:text-bb-red" onClick={() => remove(t.testId)}><Trash2 size={22} /></button>}
              </div>
              <div className="flex flex-1 flex-col justify-between px-6 py-5">
                <div className="text-[15px] text-bb-gray-600">{t.questionCount} questions · {Math.floor(t.durationMinutes / 60)}h {t.durationMinutes % 60}m{t.cached ? ' · on this device' : ''}</div>
                {p && <div className="h-2 overflow-hidden rounded-full bg-bb-gray-200"><div className="h-full bg-bb-blue transition-[width]" style={{ width: `${p.percent ?? 0}%` }} /></div>}
                <div className="flex items-center justify-end gap-3.5">
                  {t.cached ? (
                    <>
                      <button type="button" className="bb-link text-[14px]" onClick={() => setDialogTest(t)}>Options</button>
                      <button type="button" className="bb-link text-[14px] font-semibold text-bb-blue hover:text-bb-blue-dark" onClick={() => navigate(`/test-day?testId=${t.testId}`)}>Test Day</button>
                      <button type="button" className="bb-btn-outline !py-2.5 !px-5 !text-[16px]" disabled={busy} onClick={() => start(t)}>Start</button>
                    </>
                  ) : (
                    <button type="button" className="bb-btn-outline !py-3 !text-[18px]" disabled={!!p} onClick={() => download(t.testId)}><Download size={18} /> {p ? `${p.percent ?? 0}%` : 'Download'}</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <StartTestDialog open={!!dialogTest} onClose={() => setDialogTest(null)} testEntry={dialogTest} />
    </div>
  )
}
