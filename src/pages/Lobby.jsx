import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Check, PlayCircle, Ticket, Trash2, Clock3, CheckCircle } from 'lucide-react'
import bridge from '../lib/bridge.js'
import bigFuturePhoto from '../assets/bigfuture-graduates.jpg'
import { useLobbyStore, tzLabel } from '../store/lobby-store.js'
import { launchTest, runDeviceChecks, startFullTest } from '../components/lobby/StartTestDialog.jsx'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import Modal from '../components/ui/Modal.jsx'
import { SegToggle, Dots } from '../components/lobby/Brand.jsx'
import { PreviewIcon, FullLengthIcon } from '../components/lobby/PracticeIcons.jsx'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Lobby() {
  const navigate = useNavigate()
  const { manifest, sessions, settings, saveSettings, deleteSession, remove, loading, download, progress } = useLobbyStore()
  const reg = settings.registration
  const [testsTab, setTestsTab] = useState('Active')
  const [practiceTab, setPracticeTab] = useState('Active')
  const [modal, setModal] = useState(null) // overview | checklist | ticket | setup | dontsee | learn
  const [setupState, setSetupState] = useState(null)
  const [busy, setBusy] = useState(false)

  const preview = manifest.find((t) => t.kind === 'preview')
  const practiceTests = manifest.filter((t) => t.kind !== 'preview')
  const inProgress = sessions.filter((s) => (s.status === 'in-progress' || s.status === 'ready') && s.mode !== 'preview')
  const completed = sessions.filter((s) => (s.status === 'completed' || s.status === 'aborted') && s.mode !== 'preview')
  const startable = practiceTests.filter((t) => t.cached && !inProgress.some((s) => s.testId === t.testId))
  const tz = useMemo(() => tzLabel(), [])
  const setupProgress = progress[reg.setupTestId || practiceTests[0]?.testId]

  const startPreview = async () => {
    if (!preview) return
    setBusy(true)
    try {
      const raw = await bridge.tests.load(preview.testId)
      await launchTest(raw, listPresets(normalizeTest(raw))[0], { studentName: settings.studentName, lockdown: settings.lockdown, mode: 'preview' })
    } finally { setBusy(false) }
  }

  const startFull = async (t) => {
    setBusy(true)
    try { await startFullTest(t, settings) } finally { setBusy(false) }
  }

  const runSetup = async () => {
    setModal('setup')
    setSetupState({ step: 1, checks: null })
    const checks = await runDeviceChecks()
    setSetupState({ step: 2, checks })
    const form = practiceTests[0]
    if (form && !form.cached) await download(form.testId)
    await new Promise((r) => setTimeout(r, 800))
    setSetupState({ step: 3, checks })
    await saveSettings({ registration: { ...reg, setupComplete: true, setupTestId: form?.testId || null } })
  }

  return (
    <>
      <div className="bg-bb-blue-light">
        <div className="mx-auto max-w-[1180px] px-6 pb-9">
          <h1 className="text-[52px] font-light leading-tight text-bb-heading">Welcome, {settings.studentName.split(' ')[0]}. Good luck on test day!</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 pt-10">
        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6"><h2 className="text-[40px] font-bold">Your Tests</h2><SegToggle value={testsTab} onChange={setTestsTab} /></div>
            <button type="button" className="bb-link text-[20px]" onClick={() => setModal('dontsee')}>Don't see your test here?</button>
          </div>

          {testsTab === 'Active' ? (
            <div className="bb-card mt-6 w-[570px] px-8 pb-8 pt-7">
              <h3 className="text-[24px] font-medium">{reg.test}</h3>
              <div className="mt-5 grid grid-cols-[1fr_auto] gap-6">
                <div className="text-[17px] leading-[1.5]">
                  <div><b>Date:</b> {fmtDate(reg.date)}</div>
                  <div><b>Arrival Time:</b> {reg.arrival} {tz}</div>
                  <div><b>Doors Close:</b> {reg.doorsClose} {tz}</div>
                  <div className="mt-4 font-bold">{reg.center.name}</div>
                  {reg.center.lines.map((l) => <div key={l}>{l}</div>)}
                  <div className="mt-4 font-bold">Testing Accommodations:</div>
                  <div>{reg.accommodations || 'You have no approved accommodations for this test.'}</div>
                </div>
                <div className="space-y-4 pr-2 text-[17px]">
                  {reg.setupComplete && <button type="button" className="flex items-center gap-2 bb-link" onClick={() => setModal('ticket')}><Ticket size={20} className="text-bb-blue" /> Admission Ticket</button>}
                  <button type="button" className="flex items-center gap-2 bb-link" onClick={() => setModal('overview')}><PlayCircle size={20} className="text-bb-blue" /> Exam Overview</button>
                  <button type="button" className="flex items-center gap-2 bb-link" onClick={() => setModal('checklist')}><Check size={20} className="text-bb-blue" /> Test Day Checklist</button>
                </div>
              </div>
              <div className="mt-5 border-t border-bb-gray-200 pt-5">
                {reg.setupComplete ? (
                  <div>
                    <div className="flex items-center gap-2 text-[17px] font-bold text-bb-green"><CheckCircle2 size={20} /> Exam setup is complete.</div>
                    <div className="mt-2 pl-7 text-[17px]">Arrive at your test center at {reg.arrival} {tz} to check in.</div>
                    <button type="button" className="bb-link mt-4 pl-7 text-[15px]" onClick={() => navigate('/test-day')}>It's test day — enter your room code</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[17px] font-bold text-bb-green"><CheckCircle2 size={20} /> It's time to set up your exam.</div>
                    <button type="button" className="bb-btn-yellow !px-8 !py-3.5 !text-[17px]" onClick={runSetup}>Start Exam Setup</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[18px] text-bb-gray-500">You don't have any past tests.</p>
          )}
        </section>

        <section className="mt-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6"><h2 className="text-[40px] font-bold">Practice and Prepare</h2><SegToggle value={practiceTab} onChange={setPracticeTab} /></div>
            <button type="button" className="bb-link text-[20px]" onClick={() => setModal('learn')}>Learn more about practice</button>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-7">
            {practiceTab === 'Active' && (
              <>
                <button type="button" disabled={busy || !preview} onClick={startPreview} className="bb-card flex h-[235px] flex-col items-center justify-center gap-4 px-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
                  <PreviewIcon /><span className="text-center text-[26px] font-medium leading-tight">Test<br />Preview</span>
                </button>
                <button type="button" onClick={() => navigate('/practice')} className="bb-card flex h-[235px] flex-col items-center justify-center gap-4 px-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
                  <FullLengthIcon /><span className="text-center text-[26px] font-medium leading-tight">Full-Length<br />Practice</span>
                </button>
                {inProgress.map((s) => (
                  <div key={s.id} className="bb-card flex h-[235px] flex-col overflow-hidden">
                    <div className="flex items-center justify-between bg-bb-blue-light px-6 py-6"><span className="text-[24px] font-medium">{s.testTitle}</span><button type="button" aria-label="Delete attempt" className="text-bb-gray-600 hover:text-bb-red" onClick={() => deleteSession(s.id)}><Trash2 size={22} /></button></div>
                    <div className="flex flex-1 flex-col justify-between px-6 py-5">
                      <div className="flex items-center gap-2 text-[18px]"><Clock3 size={20} /> In Progress</div>
                      <div className="text-right"><button type="button" className="bb-btn-outline !py-3 !text-[18px]" onClick={() => bridge.exam.start(s.id, { lockdown: s.lockdown })}>Resume</button></div>
                    </div>
                  </div>
                ))}
                {startable.map((t) => (
                  <div key={t.testId} className="bb-card flex h-[235px] flex-col overflow-hidden">
                    <div className="flex items-center justify-between bg-bb-blue-light px-6 py-6"><span className="text-[24px] font-medium">{t.title}</span><button type="button" aria-label={`Remove ${t.title}`} className="text-bb-gray-600 hover:text-bb-red" onClick={() => remove(t.testId)}><Trash2 size={22} /></button></div>
                    <div className="flex flex-1 items-end justify-end px-6 py-5"><button type="button" className="bb-btn-outline !py-3 !text-[18px]" disabled={busy} onClick={() => startFull(t)}>Start</button></div>
                  </div>
                ))}
              </>
            )}
            {practiceTab === 'Past' && completed.length === 0 && <p className="col-span-4 text-[18px] text-bb-gray-500">No completed tests yet.</p>}
            {practiceTab === 'Past' && completed.map((s) => (
              <div key={s.id} className="bb-card flex h-[235px] flex-col overflow-hidden">
                <div className="flex items-center justify-between bg-bb-blue-light px-6 py-6"><span className="text-[24px] font-medium">{s.testTitle}</span><button type="button" aria-label="Delete attempt" className="text-bb-gray-600 hover:text-bb-red" onClick={() => deleteSession(s.id)}><Trash2 size={22} /></button></div>
                <div className="flex flex-1 flex-col justify-between px-6 py-5">
                  <div className="flex items-center gap-2 text-[18px]"><CheckCircle size={20} className="text-bb-green" /> {s.status === 'aborted' ? 'Exited' : 'Completed'}</div>
                  <div className="text-right"><button type="button" className="bb-btn-outline !py-3 !text-[18px]" onClick={() => navigate(`/results/${s.id}`)}>View Score</button></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-[40px] font-bold">Explore BigFuture</h2>
          <div className="bb-card mt-6 flex overflow-hidden rounded-2xl bg-white">
            <div className="min-h-[300px] w-[34%] shrink-0">
              <img src={bigFuturePhoto} alt="Two graduates in caps and gowns" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-center px-10 py-12">
              <h3 className="text-[26px] font-medium">Plan for Life After High School</h3>
              <p className="mt-4 text-[20px] leading-relaxed">Whether you're interested in a four-year university, community college, or career training, BigFuture has what you need to start planning your future, your way.</p>
              <div className="mt-8"><button type="button" className="bb-btn-outline !text-[18px]" onClick={() => bridge.system.openExternal('https://bigfuture.collegeboard.org')}>Go to BigFuture</button></div>
            </div>
          </div>
        </section>
      </div>

      <Modal open={modal === 'overview'} onClose={() => setModal(null)} title="Exam Overview" width={640}>
        <div className="space-y-3 text-[16px] leading-relaxed">
          <p>The digital SAT has two sections: <b>Reading and Writing</b> and <b>Math</b>. Each section has two modules; how you do on the first module decides whether the second module is harder or easier.</p>
          <ul className="list-disc space-y-1 pl-5"><li>Reading and Writing: 2 modules × 27 questions, 32 minutes each</li><li>10-minute break</li><li>Math: 2 modules × 22 questions, 35 minutes each, calculator allowed throughout</li></ul>
          <p>Total testing time is about 2 hours and 14 minutes. Scores range from 400 to 1600.</p>
        </div>
      </Modal>
      <Modal open={modal === 'checklist'} onClose={() => setModal(null)} title="Test Day Checklist" width={640}>
        <ul className="space-y-3 text-[16px]">
          {['Bring this device, fully charged, with Bluebook installed and your exam set up.', 'Bring your admission ticket and an acceptable photo ID.', 'Arrive by your arrival time; doors close 15 minutes later.', 'Bring an approved calculator if you prefer one (Bluebook has a built-in Desmos calculator).', 'Leave phones, smartwatches, notes, and other devices in your bag.'].map((t) => <li key={t} className="flex gap-3"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-bb-green" />{t}</li>)}
        </ul>
      </Modal>
      <Modal open={modal === 'ticket'} onClose={() => setModal(null)} title="Admission Ticket" width={640}>
        <div className="rounded-xl border-2 border-dashed border-bb-gray-400 p-6">
          <div className="text-[28px] font-bold">{reg.test}</div>
          <div className="mt-3 grid grid-cols-2 gap-y-2 text-[16px]">
            <div className="text-bb-gray-500">Student</div><div className="font-bold">{settings.studentName}</div>
            <div className="text-bb-gray-500">Date</div><div className="font-bold">{fmtDate(reg.date)}</div>
            <div className="text-bb-gray-500">Arrival time</div><div className="font-bold">{reg.arrival} {tz}</div>
            <div className="text-bb-gray-500">Test center</div><div className="font-bold">{reg.center.name}<br /><span className="font-normal">{reg.center.lines.join(', ')}</span></div>
          </div>
          <div className="mt-6 flex h-14 items-end gap-[3px]" aria-hidden="true">{Array.from({ length: 48 }).map((_, i) => <span key={i} className="bg-bb-black" style={{ width: (i * 7) % 3 + 1, height: '100%' }} />)}</div>
        </div>
      </Modal>
      <Modal open={modal === 'dontsee'} onClose={() => setModal(null)} title="Don't see your test here?" width={560}>
        <p className="text-[16px] leading-relaxed">Registered tests appear here once your registration is confirmed. You can change the date and test center from your profile menu.</p>
      </Modal>
      <Modal open={modal === 'learn'} onClose={() => setModal(null)} title="Practice and Prepare" width={560}>
        <p className="text-[16px] leading-relaxed">Take the <b>Test Preview</b> to try the tools, or a <b>Full-Length Practice</b> test that runs exactly like the digital SAT: adaptive modules, a timed break, and a score report afterward. Your tests are saved on this device so you can resume them later.</p>
      </Modal>
      <Modal open={modal === 'setup'} onClose={() => setupState?.step === 3 && setModal(null)} closable={setupState?.step === 3} title="Exam Setup" width={560}>
        <ul className="space-y-4 text-[17px]">
          {[['Checking your device', 1], ['Downloading your exam', 2], ['Confirming your information', 3]].map(([label, n]) => (
            <li key={label} className="flex items-center gap-3">
              {setupState && setupState.step > n ? <CheckCircle2 size={22} className="text-bb-green" /> : setupState && setupState.step === n ? <span className="scale-[0.4] -m-5"><Dots /></span> : <span className="h-[22px] w-[22px] rounded-full border border-bb-gray-300" />}
              <span>{label}{n === 2 && setupState?.step === 2 && setupProgress ? ` (${setupProgress.percent ?? 0}%)` : ''}</span>
            </li>
          ))}
        </ul>
        {setupState?.step === 3 && (
          <div className="mt-6 rounded-lg bg-bb-green-light p-4 text-[16px]"><b className="text-bb-green">Exam setup is complete.</b> Your exam is stored on this device. Arrive at your test center at {reg.arrival} {tz} to check in.</div>
        )}
        {setupState?.step === 3 && <div className="mt-6 text-right"><button type="button" className="bb-btn-yellow !py-2.5" onClick={() => setModal(null)}>Done</button></div>}
      </Modal>
    </>
  )
}
