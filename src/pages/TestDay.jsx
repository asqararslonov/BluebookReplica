import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, KeyRound, UserCheck, Radio } from 'lucide-react'
import bridge from '../lib/bridge.js'
import { useLobbyStore } from '../store/lobby-store.js'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import { launchTest, runDeviceChecks } from '../components/lobby/StartTestDialog.jsx'

const STEPS = ['Room code', 'Confirm', 'Check in', 'Start code']

export default function TestDay() {
  const navigate = useNavigate()
  const { manifest, settings } = useLobbyStore()
  const [step, setStep] = useState(0)
  const [roomCode, setRoomCode] = useState('')
  const [startCode, setStartCode] = useState('')
  const [proctorCode, setProctorCode] = useState(null)
  const [testId, setTestId] = useState('')
  const [checks, setChecks] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const downloaded = manifest.filter((t) => t.kind !== 'preview' && t.cached)

  useEffect(() => { if (!testId && downloaded[0]) setTestId(downloaded.find((t) => t.testId === settings.registration?.setupTestId)?.testId || downloaded[0].testId) }, [downloaded, testId, settings.registration])
  useEffect(() => {
    if (step !== 2) return
    runDeviceChecks().then(setChecks)
    const t = setTimeout(() => setProctorCode(String(Math.floor(100000 + Math.random() * 900000))), 2500)
    return () => clearTimeout(t)
  }, [step])

  const begin = async () => {
    if (startCode !== proctorCode) { setError('That start code does not match the code your proctor read.'); return }
    setBusy(true); setError(null)
    try {
      const raw = await bridge.tests.load(testId)
      const presets = listPresets(normalizeTest(raw))
      await launchTest(raw, presets[0], { studentName: settings.studentName, lockdown: true, mode: 'test-day' })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-[760px] px-8 py-10">
      <ol className="mb-8 flex items-center gap-2 text-[13px]">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${i <= step ? 'bg-bb-blue text-white' : 'bg-bb-gray-200 text-bb-gray-500'}`}>{i < step ? <CheckCircle2 size={14} /> : i + 1}</span>
            <span className={i === step ? 'font-semibold' : 'text-bb-gray-500'}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-bb-gray-300" />}
          </li>
        ))}
      </ol>

      {error && <div className="mb-4 rounded bg-bb-red-light px-3 py-2 text-[14px] text-bb-red">{error}</div>}

      {step === 0 && (
        <div className="bb-card p-8">
          <KeyRound size={36} className="text-bb-blue" />
          <h1 className="mt-3 text-[26px] font-bold">Enter the room code</h1>
          <p className="mt-1 text-[15px] text-bb-gray-500">Your proctor writes the room code on the board on test day. Any 6-character code works in this simulation.</p>
          <input className="bb-input mt-5 w-64 text-center font-mono text-[22px] uppercase tracking-[0.3em]" value={roomCode} maxLength={6} onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC123" aria-label="Room code" />
          <div className="mt-6"><button type="button" className="bb-btn-primary" disabled={roomCode.length !== 6} onClick={() => setStep(1)}>Next</button></div>
        </div>
      )}

      {step === 1 && (
        <div className="bb-card p-8">
          <UserCheck size={36} className="text-bb-blue" />
          <h1 className="mt-3 text-[26px] font-bold">Confirm your information</h1>
          <dl className="mt-5 grid grid-cols-[160px_1fr] gap-y-3 text-[15px]">
            <dt className="text-bb-gray-500">Name</dt><dd className="font-semibold">{settings.studentName}</dd>
            <dt className="text-bb-gray-500">Test</dt><dd className="font-semibold">SAT</dd>
            <dt className="text-bb-gray-500">Room</dt><dd className="font-mono font-semibold">{roomCode}</dd>
            <dt className="text-bb-gray-500">Test form</dt>
            <dd>
              {downloaded.length === 0 ? (
                <span className="text-bb-red">No test is downloaded to this device. <button type="button" className="bb-link" onClick={() => navigate('/practice')}>Download one first.</button></span>
              ) : (
                <select className="bb-input" value={testId} onChange={(e) => setTestId(e.target.value)}>{downloaded.map((t) => <option key={t.testId} value={t.testId}>{t.title}</option>)}</select>
              )}
            </dd>
          </dl>
          <div className="mt-6 flex gap-3"><button type="button" className="bb-btn-outline" onClick={() => setStep(0)}>Back</button><button type="button" className="bb-btn-primary" disabled={!testId} onClick={() => setStep(2)}>Check In</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="bb-card p-8">
          <Radio size={36} className="text-bb-blue" />
          <h1 className="mt-3 text-[26px] font-bold">You're checked in</h1>
          <p className="mt-1 text-[15px] text-bb-gray-500">Wait for your proctor to read the start code aloud. Meanwhile, Bluebook checks your device.</p>
          <ul className="mt-4 divide-y divide-bb-gray-200 rounded-md border border-bb-gray-200">
            {(checks || []).map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 text-[14px]"><span className="font-semibold">{c.label}</span><span className={c.status === 'ok' ? 'text-bb-green' : c.status === 'warn' ? 'text-amber-600' : 'text-bb-red'}>{c.detail}</span></li>
            ))}
            {!checks && <li className="px-3 py-2 text-[14px] text-bb-gray-500">Checking…</li>}
          </ul>
          <div className="mt-6 rounded-md bg-bb-navy p-5 text-white">
            <div className="text-[12px] uppercase tracking-wide text-white/70">Proctor announcement</div>
            {proctorCode ? <div className="mt-1 text-[15px]">"Please enter the start code: <b className="font-mono text-[20px] tracking-[0.25em]">{proctorCode}</b>"</div> : <div className="mt-1 flex items-center gap-2 text-[15px] text-white/80"><div className="bb-spinner !h-4 !w-4 !border-2 !border-white/30 !border-t-white" /> Waiting for the proctor…</div>}
          </div>
          <div className="mt-6 flex gap-3"><button type="button" className="bb-btn-outline" onClick={() => setStep(1)}>Back</button><button type="button" className="bb-btn-primary" disabled={!proctorCode} onClick={() => setStep(3)}>Enter Start Code</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="bb-card p-8">
          <KeyRound size={36} className="text-bb-blue" />
          <h1 className="mt-3 text-[26px] font-bold">Enter the start code</h1>
          <p className="mt-1 text-[15px] text-bb-gray-500">The test opens in lockdown mode as soon as the code is accepted. Your timer begins on the first module.</p>
          <input className="bb-input mt-5 w-64 text-center font-mono text-[22px] tracking-[0.3em]" value={startCode} maxLength={6} inputMode="numeric" onChange={(e) => setStartCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" aria-label="Start code" />
          <div className="mt-6 flex gap-3"><button type="button" className="bb-btn-outline" onClick={() => setStep(2)}>Back</button><button type="button" className="bb-btn-primary" disabled={startCode.length !== 6 || busy} onClick={begin}>{busy ? 'Starting…' : 'Start Test'}</button></div>
        </div>
      )}
    </div>
  )
}
