import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import bridge, { isElectron } from '../../lib/bridge.js'
import Modal from '../ui/Modal.jsx'
import { normalizeTest, getModule } from '../../lib/schema.js'
import { listPresets, createSession, initialModuleState } from '../../lib/session.js'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../../store/lobby-store.js'

/** Creates and launches a session. Returns the session id. */
export async function launchTest(rawTest, preset, { studentName, lockdown, mode = 'test' }) {
  const test = normalizeTest(rawTest)
  const session = createSession(test, preset, { studentName, lockdown, mode })
  if (mode === 'test-day') {
    session.status = 'in-progress'
    session.phase = 'module'
    session.startedAt = Date.now()
    const firstStage = session.stages[0]
    if (firstStage && firstStage.type === 'module') {
      const mod = getModule(test, firstStage.sectionId, 1, null)
      session.modules[firstStage.key] = initialModuleState(mod, null)
    }
  }
  await bridge.sessions.save(session)
  const result = await bridge.exam.start(session.id, { lockdown })
  if (result && result.ok === false) throw new Error(result.error || 'Unable to start the test')
  return session.id
}

/** Starts the full test (first preset) for a manifest entry without showing the dialog. Returns the session id. */
export async function startFullTest(testEntry, settings) {
  const raw = await bridge.tests.load(testEntry.testId)
  const presets = listPresets(normalizeTest(raw))
  const preset = presets[0]
  if (!preset) throw new Error('This test has no modules to start')
  return launchTest(raw, preset, { studentName: settings.studentName, lockdown: settings.lockdown })
}

export async function runDeviceChecks() {
  const checks = []
  const displays = await bridge.system.displays()
  checks.push({ id: 'displays', label: 'Single display', status: displays.count > 1 ? 'warn' : 'ok', detail: displays.count > 1 ? `${displays.count} displays connected — disconnect extra monitors on test day` : 'One display detected' })
  const w = window.screen.width
  const h = window.screen.height
  checks.push({ id: 'screen', label: 'Screen size', status: w >= 1024 && h >= 700 ? 'ok' : 'warn', detail: `${w} × ${h}` })
  checks.push({ id: 'network', label: 'Internet connection (for the Desmos calculator)', status: navigator.onLine ? 'ok' : 'warn', detail: navigator.onLine ? 'Online' : 'Offline — the calculator will not load' })
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery()
      const pct = Math.round(b.level * 100)
      checks.push({ id: 'battery', label: 'Battery', status: b.charging || pct >= 50 ? 'ok' : pct >= 20 ? 'warn' : 'fail', detail: `${pct}%${b.charging ? ', charging' : ''}` })
    }
  } catch { /* unsupported */ }
  checks.push({ id: 'fullscreen', label: 'Full-screen test window', status: isElectron ? 'ok' : 'warn', detail: isElectron ? 'Available' : 'Browser mode — uses the browser full-screen' })
  return checks
}

function StatusIcon({ status }) {
  if (status === 'ok') return <CheckCircle2 size={18} className="text-bb-green" />
  if (status === 'warn') return <AlertTriangle size={18} className="text-amber-500" />
  return <XCircle size={18} className="text-bb-red" />
}

export default function StartTestDialog({ open, onClose, testEntry, defaultPresetId = null }) {
  const navigate = useNavigate()
  const settings = useLobbyStore((s) => s.settings)
  const [raw, setRaw] = useState(null)
  const [presets, setPresets] = useState([])
  const [presetId, setPresetId] = useState(defaultPresetId)
  const [lockdown, setLockdown] = useState(settings.lockdown)
  const [step, setStep] = useState(1)
  const [checks, setChecks] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !testEntry) return
    setStep(1); setError(null); setChecks(null); setLockdown(settings.lockdown)
    bridge.tests.load(testEntry.testId).then((r) => {
      setRaw(r)
      const p = listPresets(normalizeTest(r))
      setPresets(p)
      setPresetId(defaultPresetId && p.some((x) => x.id === defaultPresetId) ? defaultPresetId : p[0]?.id)
    }).catch((e) => setError(e.message))
  }, [open, testEntry, defaultPresetId, settings.lockdown])

  const check = async () => { setChecks(null); setStep(2); setChecks(await runDeviceChecks()) }

  const start = async () => {
    setBusy(true); setError(null)
    try {
      const preset = presets.find((p) => p.id === presetId)
      await launchTest(raw, preset, { studentName: FIXED_STUDENT_NAME, lockdown })
      onClose?.()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const blocked = checks?.some((c) => c.status === 'fail')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Test Options"
      width={620}
      footer={step === 1 ? (
        <><button type="button" className="bb-btn-outline" onClick={onClose}>Cancel</button><button type="button" className="bb-btn-primary" disabled={!raw || !presetId} onClick={check}>Continue</button></>
      ) : (
        <><button type="button" className="bb-btn-outline" onClick={() => setStep(1)}>Back</button><button type="button" className="bb-btn-primary" disabled={!checks || blocked || busy} onClick={start}>{busy ? 'Starting…' : 'Start Test'}</button></>
      )}
    >
      {error && <div className="mb-4 rounded bg-bb-red-light px-3 py-2 text-[14px] text-bb-red">{error}</div>}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-[14px] font-semibold">What do you want to take?</div>
            {!raw && !error && <div className="flex items-center gap-2 text-[14px] text-bb-gray-500"><div className="bb-spinner !h-5 !w-5 !border-2" /> Loading test…</div>}
            <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
              {presets.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 ${presetId === p.id ? 'border-bb-blue bg-bb-blue-light' : 'border-bb-gray-200 hover:bg-bb-gray-50'}`}>
                  <input type="radio" name="preset" className="mt-1" checked={presetId === p.id} onChange={() => setPresetId(p.id)} />
                  <span><span className="block text-[14px] font-semibold">{p.label}</span><span className="block text-[13px] text-bb-gray-500">{p.detail}</span></span>
                </label>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold">Student name</span>
            <input className="bb-input" value={FIXED_STUDENT_NAME} readOnly />
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={lockdown} onChange={(e) => setLockdown(e.target.checked)} />
            <span className="text-[14px]"><b>Full-screen test window</b> — the test opens in its own full-screen window.</span>
          </label>
          <div className="rounded-xl border border-bb-blue/25 bg-bb-blue-light/40 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-bold text-bb-navy">Simulate Official Test Day?</div>
              <div className="text-[12px] text-bb-gray-600">Enter proctor room & start codes, agree to testing rules, and check in.</div>
            </div>
            <button type="button" className="bb-btn-yellow shrink-0 !py-2 !px-4 !text-[13px] font-bold shadow-sm" onClick={() => { onClose?.(); navigate(`/test-day?testId=${testEntry.testId}`) }}>Test Day Mode →</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[14px] font-semibold">Device check</div>
            <button type="button" className="flex items-center gap-1 text-[13px] text-bb-blue hover:underline" onClick={async () => { setChecks(null); setChecks(await runDeviceChecks()) }}><RefreshCw size={14} /> Re-run</button>
          </div>
          {!checks ? <div className="flex items-center gap-2 text-[14px] text-bb-gray-500"><div className="bb-spinner !h-5 !w-5 !border-2" /> Checking your device…</div> : (
            <ul className="divide-y divide-bb-gray-200 rounded-md border border-bb-gray-200">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <StatusIcon status={c.status} />
                  <div className="flex-1"><div className="text-[14px] font-semibold">{c.label}</div><div className="text-[13px] text-bb-gray-500">{c.detail}</div></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[13px] text-bb-gray-500">Warnings won't stop the test from starting. On test day, Bluebook requires a single display and a charged device.</p>
        </div>
      )}
    </Modal>
  )
}
