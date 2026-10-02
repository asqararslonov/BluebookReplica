import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  KeyRound,
  UserCheck,
  Radio,
  ShieldCheck,
  Check,
  Wifi,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryCharging,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Lock,
  Monitor,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react'
import bridge, { isElectron } from '../lib/bridge.js'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../store/lobby-store.js'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import { launchTest, runDeviceChecks } from '../components/lobby/StartTestDialog.jsx'
import { BluebookLogo, Dots, BUILD_STAMP } from '../components/lobby/Brand.jsx'
import { useBattery } from '../components/exam/ExamHeader.jsx'

const STEPS = [
  'Room code',
  'Confirm info',
  'Testing rules',
  'Clear desk',
  'Device check',
  'Wait for proctor',
  'Start code',
]

const REQUIRED_PLEDGE = 'I agree to the testing rules'

export default function TestDay() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTestId = searchParams.get('testId')

  const { init, manifest, settings, loading } = useLobbyStore()
  const battery = useBattery()

  const [step, setStep] = useState(0)

  // Step 0: Room code (5 uppercase characters in real Bluebook)
  const [roomBoxes, setRoomBoxes] = useState(['', '', '', '', ''])
  const roomInputRefs = useRef([])
  const defaultRoomCode = 'SAT26'

  // Step 1: Form & Confirmation
  const [testId, setTestId] = useState('')
  const [infoConfirmed, setInfoConfirmed] = useState(true)

  // Step 2: Testing Rules & Security Pledge
  const [rulesAgreed, setRulesAgreed] = useState(false)
  const [pledgeText, setPledgeText] = useState('')

  // Step 3: Clear Desk Checklist
  const [deskChecks, setDeskChecks] = useState({
    permitted: false,
    electronicsOff: false,
    appsClosed: false,
  })

  // Step 4: Device Checks
  const [checks, setChecks] = useState(null)
  const [deviceChecking, setDeviceChecking] = useState(false)

  // Step 5: Proctor Announcement / Waiting
  const [proctorState, setProctorState] = useState('waiting') // 'waiting' | 'script' | 'announced'
  const [proctorCode, setProctorCode] = useState(null)

  // Step 6: Start Code (6 digits grouped 3 + 3)
  const [startBoxes, setStartBoxes] = useState(['', '', '', '', '', ''])
  const startInputRefs = useRef([])

  // Shared
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [exitModal, setExitModal] = useState(false)

  const downloaded = manifest.filter((t) => t.kind !== 'preview' && t.cached)

  useEffect(() => {
    init()
  }, [init])

  // Set default selected test
  useEffect(() => {
    if (testId) return
    if (initialTestId && downloaded.some((t) => t.testId === initialTestId)) {
      setTestId(initialTestId)
    } else if (downloaded.length > 0) {
      const regTest = downloaded.find((t) => t.testId === settings.registration?.setupTestId)
      setTestId(regTest ? regTest.testId : downloaded[0].testId)
    }
  }, [downloaded, testId, initialTestId, settings.registration])

  // Run device checks when entering step 4
  useEffect(() => {
    if (step === 4 && !checks) {
      setDeviceChecking(true)
      runDeviceChecks().then((res) => {
        setChecks(res)
        setDeviceChecking(false)
      })
    }
  }, [step, checks])

  // Proctor script simulation in step 5
  useEffect(() => {
    if (step !== 5) return
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000))
    setProctorCode(generatedCode)
    setProctorState('attendance')

    const t1 = setTimeout(() => {
      setProctorState('script')
    }, 1200)

    const t2 = setTimeout(() => {
      setProctorState('announced')
    }, 3200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [step])

  // Auto-focus the first box of the active code step
  useEffect(() => {
    if (step === 0) {
      roomInputRefs.current[0]?.focus()
    } else if (step === 6) {
      startInputRefs.current[0]?.focus()
    }
  }, [step])

  const roomCodeString = roomBoxes.join('').toUpperCase()
  const startCodeString = startBoxes.join('')

  // ---------- Room code keyboard navigation ----------
  const handleRoomCharChange = (index, val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const updated = [...roomBoxes]
    if (clean.length > 1) {
      // Handles pasting or rapid typing
      const chars = clean.slice(0, 5).split('')
      chars.forEach((c, i) => {
        if (index + i < 5) updated[index + i] = c
      })
      setRoomBoxes(updated)
      const nextIdx = Math.min(4, index + chars.length)
      roomInputRefs.current[nextIdx]?.focus()
      return
    }
    updated[index] = clean
    setRoomBoxes(updated)
    if (clean && index < 4) {
      roomInputRefs.current[index + 1]?.focus()
    }
  }

  const handleRoomKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!roomBoxes[index] && index > 0) {
        const updated = [...roomBoxes]
        updated[index - 1] = ''
        setRoomBoxes(updated)
        roomInputRefs.current[index - 1]?.focus()
      } else {
        const updated = [...roomBoxes]
        updated[index] = ''
        setRoomBoxes(updated)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      roomInputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 4) {
      e.preventDefault()
      roomInputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter' && roomCodeString.length === 5) {
      e.preventDefault()
      setStep(1)
    }
  }

  const handleRoomPaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    if (!text) return
    const updated = ['', '', '', '', '']
    text.split('').forEach((c, i) => {
      updated[i] = c
    })
    setRoomBoxes(updated)
    const nextIdx = Math.min(4, text.length)
    roomInputRefs.current[nextIdx]?.focus()
  }

  const fillSimulatedRoomCode = () => {
    setRoomBoxes(defaultRoomCode.split(''))
    roomInputRefs.current[4]?.focus()
  }

  // ---------- Start code keyboard navigation ----------
  const handleStartCharChange = (index, val) => {
    const clean = val.replace(/\D/g, '')
    const updated = [...startBoxes]
    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split('')
      digits.forEach((d, i) => {
        if (index + i < 6) updated[index + i] = d
      })
      setStartBoxes(updated)
      const nextIdx = Math.min(5, index + digits.length)
      startInputRefs.current[nextIdx]?.focus()
      return
    }
    updated[index] = clean
    setStartBoxes(updated)
    setError(null)
    if (clean && index < 5) {
      startInputRefs.current[index + 1]?.focus()
    }
  }

  const handleStartKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!startBoxes[index] && index > 0) {
        const updated = [...startBoxes]
        updated[index - 1] = ''
        setStartBoxes(updated)
        startInputRefs.current[index - 1]?.focus()
      } else {
        const updated = [...startBoxes]
        updated[index] = ''
        setStartBoxes(updated)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      startInputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      startInputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter' && startCodeString.length === 6) {
      e.preventDefault()
      begin()
    }
  }

  const handleStartPaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const updated = ['', '', '', '', '', '']
    text.split('').forEach((d, i) => {
      updated[i] = d
    })
    setStartBoxes(updated)
    setError(null)
    const nextIdx = Math.min(5, text.length)
    startInputRefs.current[nextIdx]?.focus()
  }

  const fillAnnouncedStartCode = () => {
    if (!proctorCode) return
    setStartBoxes(proctorCode.split(''))
    setError(null)
    startInputRefs.current[5]?.focus()
  }

  // ---------- Final test launch ----------
  const begin = async () => {
    if (startCodeString !== proctorCode) {
      setError('That start code does not match the code your proctor read.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const raw = await bridge.tests.load(testId)
      const presets = listPresets(normalizeTest(raw))
      await launchTest(raw, presets[0], {
        studentName: FIXED_STUDENT_NAME,
        lockdown: true,
        mode: 'test-day',
      })
    } catch (e) {
      setError(e.message || String(e))
      setBusy(false)
    }
  }

  const pledgeMatches = pledgeText.trim().toLowerCase() === REQUIRED_PLEDGE.toLowerCase()
  const allDeskChecked = deskChecks.permitted && deskChecks.electronicsOff && deskChecks.appsClosed

  const BatteryIcon = battery?.charging
    ? BatteryCharging
    : battery && battery.level <= 20
    ? BatteryLow
    : battery && battery.level <= 60
    ? BatteryMedium
    : BatteryFull

  const currentTestTitle =
    downloaded.find((t) => t.testId === testId)?.title || settings.registration?.test || 'Digital SAT'

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfd] text-bb-black select-none">
      {/* Bluebook Authentic Test Day Header */}
      <header className="bb-dashed-b sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between bg-white px-8 md:px-12 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <BluebookLogo size={28} />
          <span className="hidden h-6 w-px bg-bb-gray-300 sm:block" />
          <span className="hidden rounded-full bg-bb-blue-light px-3 py-1 font-sans text-[13px] font-bold tracking-wider text-bb-blue uppercase sm:inline-block">
            {currentTestTitle} · Test Day
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[14px] text-bb-gray-600">
            <Wifi size={17} className="text-bb-green" />
            <span className="hidden md:inline">Connected</span>
          </div>

          {battery && (
            <div
              className="flex items-center gap-1.5 text-[14px] font-medium text-bb-gray-600"
              aria-label={`Battery ${battery.level}%`}
            >
              <span>{battery.level}%</span>
              <BatteryIcon size={18} />
            </div>
          )}

          <div className="hidden text-[15px] font-semibold text-bb-black sm:block">
            {FIXED_STUDENT_NAME}
          </div>

          <button
            type="button"
            onClick={() => setExitModal(true)}
            className="flex items-center gap-1.5 text-[14px] font-medium text-bb-gray-500 hover:text-bb-red transition-colors"
          >
            <LogOut size={16} />
            <span>Return to Home</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="bb-scroll flex-1 overflow-y-auto px-4 py-8 md:py-10">
        <div className="mx-auto max-w-[820px]">
          {/* Authentic Bluebook Stepper */}
          <nav aria-label="Check-in progress" className="mb-8">
            <ol className="flex items-center justify-between gap-1 overflow-x-auto pb-2 text-[13px]">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                      i < step
                        ? 'bg-bb-green text-white'
                        : i === step
                        ? 'bg-bb-blue text-white shadow-sm ring-4 ring-bb-blue/20'
                        : 'bg-bb-gray-200 text-bb-gray-600'
                    }`}
                  >
                    {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={`font-sans ${
                      i === step
                        ? 'font-bold text-bb-black'
                        : i < step
                        ? 'font-medium text-bb-gray-700'
                        : 'text-bb-gray-400'
                    }`}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="mx-1 h-px w-5 bg-bb-gray-300 md:w-8" />
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-bb-red/30 bg-bb-red-light p-4 text-[15px] font-medium text-bb-red shadow-sm animate-shake">
              <AlertTriangle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 0: Enter the room code */}
          {step === 0 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-blue-light text-bb-blue">
                <KeyRound size={30} />
              </div>
              <h1 className="mt-5 text-[32px] font-bold tracking-tight text-bb-black">
                Enter the room code
              </h1>
              <p className="mt-2 text-[16px] leading-relaxed text-bb-gray-600">
                Look at the board at the front of your room. Your proctor has written a <b>5-letter room code</b> on the board.
              </p>

              {/* 5 Distinct Letter Boxes */}
              <div className="my-8 flex flex-col items-center">
                <div
                  className="flex items-center justify-center gap-3 sm:gap-4"
                  onPaste={handleRoomPaste}
                >
                  {roomBoxes.map((char, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (roomInputRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck="false"
                      value={char}
                      onChange={(e) => handleRoomCharChange(idx, e.target.value)}
                      onKeyDown={(e) => handleRoomKeyDown(idx, e)}
                      className={`h-20 w-16 sm:w-20 rounded-2xl border-2 text-center font-mono text-[36px] font-bold uppercase transition-all outline-none ${
                        char
                          ? 'border-bb-blue bg-bb-blue-light/30 text-bb-blue'
                          : 'border-bb-gray-300 bg-white hover:border-bb-gray-400 focus:border-bb-blue focus:ring-4 focus:ring-bb-blue/20'
                      }`}
                      aria-label={`Room code character ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[14px] text-bb-gray-500">
                  <span>Proctor board code:</span>
                  <button
                    type="button"
                    onClick={fillSimulatedRoomCode}
                    className="inline-flex items-center gap-1.5 rounded-full border border-bb-blue/40 bg-bb-blue-light px-3.5 py-1 font-mono text-[14px] font-bold text-bb-blue hover:bg-bb-blue hover:text-white transition-colors"
                  >
                    <Sparkles size={14} />
                    {defaultRoomCode} (Click to fill)
                  </button>
                </div>
              </div>

              <div className="mt-8 flex justify-end border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-primary !px-9 !py-3.5 !text-[17px] font-bold"
                  disabled={roomCodeString.length !== 5}
                  onClick={() => setStep(1)}
                >
                  <span>Next</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Confirm your information */}
          {step === 1 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-blue-light text-bb-blue">
                <UserCheck size={30} />
              </div>
              <h1 className="mt-5 text-[32px] font-bold tracking-tight text-bb-black">
                Confirm your information
              </h1>
              <p className="mt-2 text-[16px] text-bb-gray-600">
                Make sure your personal details, test form, and room match your test registration.
              </p>

              <div className="mt-6 rounded-2xl border border-bb-gray-200 bg-bb-gray-50/60 p-6">
                <dl className="grid grid-cols-[180px_1fr] gap-y-4 text-[16px]">
                  <dt className="text-bb-gray-500">Student Name</dt>
                  <dd className="font-bold text-bb-black">{FIXED_STUDENT_NAME}</dd>

                  <dt className="text-bb-gray-500">Assessment</dt>
                  <dd className="font-semibold text-bb-black">Digital SAT</dd>

                  <dt className="text-bb-gray-500">Assigned Room</dt>
                  <dd className="font-mono font-bold text-bb-blue tracking-wider">
                    {roomCodeString}
                  </dd>

                  <dt className="text-bb-gray-500">Accommodations</dt>
                  <dd className="font-semibold text-bb-black">None — Standard Timing</dd>

                  <dt className="text-bb-gray-500 self-center">Test Form</dt>
                  <dd>
                    {downloaded.length === 0 ? (
                      <div className="rounded-lg bg-bb-red-light p-3 text-[14px] text-bb-red">
                        No downloaded test found.{' '}
                        <button
                          type="button"
                          className="bb-link font-bold underline"
                          onClick={() => navigate('/practice')}
                        >
                          Download one in Practice.
                        </button>
                      </div>
                    ) : (
                      <select
                        className="bb-input !py-2.5 font-medium"
                        value={testId}
                        onChange={(e) => setTestId(e.target.value)}
                      >
                        {downloaded.map((t) => (
                          <option key={t.testId} value={t.testId}>
                            {t.title} ({t.questionCount} questions · {t.durationMinutes} min)
                          </option>
                        ))}
                      </select>
                    )}
                  </dd>
                </dl>
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-bb-gray-200 bg-white p-4 hover:bg-bb-gray-50">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-bb-blue"
                  checked={infoConfirmed}
                  onChange={(e) => setInfoConfirmed(e.target.checked)}
                />
                <span className="text-[15px] text-bb-gray-700">
                  I confirm that my name, test details, and room code are correct.
                </span>
              </label>

              <div className="mt-8 flex justify-between border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-outline !px-7 !py-3.5 !text-[16px]"
                  onClick={() => setStep(0)}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="bb-btn-primary !px-9 !py-3.5 !text-[17px] font-bold"
                  disabled={!testId || !infoConfirmed}
                  onClick={() => setStep(2)}
                >
                  <span>Continue</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Review testing rules & security pledge */}
          {step === 2 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-blue-light text-bb-blue">
                <ShieldCheck size={30} />
              </div>
              <h1 className="mt-5 text-[32px] font-bold tracking-tight text-bb-black">
                Review the testing rules
              </h1>
              <p className="mt-2 text-[16px] text-bb-gray-600">
                You must review and agree to the College Board Testing Rules before beginning your test.
              </p>

              {/* Testing Rules Card */}
              <div className="mt-6 max-h-[260px] space-y-4 overflow-y-auto rounded-2xl border border-bb-gray-200 bg-bb-gray-50/50 p-6 text-[15px] leading-relaxed text-bb-gray-700 bb-scroll">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bb-red-light text-bb-red font-bold text-[14px]">
                    ✕
                  </span>
                  <div>
                    <b className="text-bb-black">No Unauthorized Electronics:</b> Cell phones, smartwatches, fitness bands, wireless headphones, and cameras must be powered completely off and placed in your bag. They cannot be accessed at any point during testing or breaks.
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bb-blue-light text-bb-blue font-bold text-[14px]">
                    <Lock size={15} />
                  </span>
                  <div>
                    <b className="text-bb-black">Kiosk Lockdown Environment:</b> Bluebook must be the only application open on this computer. Accessing the web, AI tools, notes, or switching applications is strictly prohibited and results in score cancellation.
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-[14px]">
                    ✎
                  </span>
                  <div>
                    <b className="text-bb-black">Scratch Paper Rules:</b> Only test-center provided scratch paper may be used. You must print your full legal name at the top of each page. All scratch paper will be collected at the end of the exam.
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bb-green-light text-bb-green font-bold text-[14px]">
                    ✓
                  </span>
                  <div>
                    <b className="text-bb-black">Independent Testing & Integrity:</b> You agree that all answers submitted are your own and that you will not discuss, record, or share test content with anyone.
                  </div>
                </div>
              </div>

              {/* Security Pledge Section */}
              <div className="mt-6 rounded-2xl border border-bb-blue/30 bg-bb-blue-light/20 p-6">
                <div className="text-[13px] font-bold uppercase tracking-wider text-bb-blue">
                  Security Pledge Verification
                </div>
                <p className="mt-1 text-[15px] font-medium text-bb-black">
                  Type the following statement below to confirm your agreement:
                </p>
                <div className="mt-2 inline-block rounded-md bg-white px-3 py-1.5 font-mono text-[14px] font-bold text-bb-navy border border-bb-gray-300">
                  "{REQUIRED_PLEDGE}"
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={pledgeText}
                    onChange={(e) => setPledgeText(e.target.value)}
                    placeholder={REQUIRED_PLEDGE}
                    className="bb-input !py-2.5 !text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={() => setPledgeText(REQUIRED_PLEDGE)}
                    className="shrink-0 rounded-lg border border-bb-blue bg-white px-4 text-[13px] font-bold text-bb-blue hover:bg-bb-blue-light transition-colors"
                  >
                    Auto-Fill
                  </button>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-bb-blue"
                    checked={rulesAgreed}
                    onChange={(e) => setRulesAgreed(e.target.checked)}
                  />
                  <span className="text-[15px] font-medium text-bb-black">
                    I agree to the Testing Rules and pledge to follow all test security protocols.
                  </span>
                </label>
              </div>

              <div className="mt-8 flex justify-between border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-outline !px-7 !py-3.5 !text-[16px]"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="bb-btn-primary !px-9 !py-3.5 !text-[17px] font-bold"
                  disabled={!rulesAgreed || !pledgeMatches}
                  onClick={() => setStep(3)}
                >
                  <span>I Agree</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Clear your desk */}
          {step === 3 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-blue-light text-bb-blue">
                <Laptop size={30} />
              </div>
              <h1 className="mt-5 text-[32px] font-bold tracking-tight text-bb-black">
                Clear your desk
              </h1>
              <p className="mt-2 text-[16px] text-bb-gray-600">
                Before your proctor begins the instructions, prepare your testing desk.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    key: 'permitted',
                    title: 'Permitted items only',
                    desc: 'Only your testing device, mouse (if needed), pencil/pen, and provided scratch paper are on your desk.',
                  },
                  {
                    key: 'electronicsOff',
                    title: 'Prohibited devices powered off and stowed',
                    desc: 'All cell phones, smartwatches, AirPods/earbuds, and tablets are powered completely off and placed in your bag.',
                  },
                  {
                    key: 'appsClosed',
                    title: 'All other applications closed',
                    desc: 'All web browsers, chat applications, and background software on this device have been quit.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-all ${
                      deskChecks[item.key]
                        ? 'border-bb-blue bg-bb-blue-light/20 shadow-sm'
                        : 'border-bb-gray-200 bg-white hover:bg-bb-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-bb-blue"
                      checked={deskChecks[item.key]}
                      onChange={(e) =>
                        setDeskChecks({ ...deskChecks, [item.key]: e.target.checked })
                      }
                    />
                    <div>
                      <div className="text-[16px] font-bold text-bb-black">{item.title}</div>
                      <div className="mt-0.5 text-[14px] text-bb-gray-600">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 text-right">
                <button
                  type="button"
                  onClick={() =>
                    setDeskChecks({ permitted: true, electronicsOff: true, appsClosed: true })
                  }
                  className="bb-link text-[14px]"
                >
                  Select all
                </button>
              </div>

              <div className="mt-8 flex justify-between border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-outline !px-7 !py-3.5 !text-[16px]"
                  onClick={() => setStep(2)}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="bb-btn-primary !px-9 !py-3.5 !text-[17px] font-bold"
                  disabled={!allDeskChecked}
                  onClick={() => setStep(4)}
                >
                  <span>My Desk Is Clear</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Device check */}
          {step === 4 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-blue-light text-bb-blue">
                  <Monitor size={30} />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[14px] font-bold text-bb-blue hover:underline"
                  onClick={async () => {
                    setDeviceChecking(true)
                    setChecks(null)
                    const res = await runDeviceChecks()
                    setChecks(res)
                    setDeviceChecking(false)
                  }}
                >
                  <RefreshCw size={15} />
                  <span>Re-run Diagnostics</span>
                </button>
              </div>

              <h1 className="mt-5 text-[32px] font-bold tracking-tight text-bb-black">
                Device readiness check
              </h1>
              <p className="mt-2 text-[16px] text-bb-gray-600">
                Bluebook is verifying that your device meets digital SAT requirements.
              </p>

              {deviceChecking || !checks ? (
                <div className="my-12 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="bb-spinner" />
                  <p className="text-[15px] font-medium text-bb-gray-500">Checking your device…</p>
                </div>
              ) : (
                <div className="mt-6 divide-y divide-bb-gray-200 rounded-2xl border border-bb-gray-200 bg-white">
                  {checks.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 px-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
                            c.status === 'ok'
                              ? 'bg-bb-green'
                              : c.status === 'warn'
                              ? 'bg-amber-500'
                              : 'bg-bb-red'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <div>
                          <div className="text-[15px] font-bold text-bb-black">{c.label}</div>
                          <div className="text-[13px] text-bb-gray-500">{c.detail}</div>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-0.5 text-[12px] font-bold uppercase tracking-wider ${
                          c.status === 'ok'
                            ? 'bg-bb-green-light text-bb-green'
                            : c.status === 'warn'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-bb-red-light text-bb-red'
                        }`}
                      >
                        {c.status === 'ok' ? 'Passed' : c.status === 'warn' ? 'Notice' : 'Action Required'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-xl bg-bb-green-light p-4 text-[15px] font-medium text-bb-green flex items-center gap-3">
                <CheckCircle2 size={20} className="shrink-0" />
                <span>Your device is configured and ready for the exam.</span>
              </div>

              <div className="mt-8 flex justify-between border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-outline !px-7 !py-3.5 !text-[16px]"
                  onClick={() => setStep(3)}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="bb-btn-primary !px-9 !py-3.5 !text-[17px] font-bold"
                  disabled={deviceChecking || !checks}
                  onClick={() => setStep(5)}
                >
                  <span>Check In</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: You're checked in — Waiting for proctor */}
          {step === 5 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bb-green text-white">
                  <Check size={22} strokeWidth={3} />
                </span>
                <span className="rounded-full bg-bb-green-light px-3 py-1 text-[13px] font-bold uppercase tracking-wide text-bb-green">
                  Check-in Complete
                </span>
              </div>

              <h1 className="mt-4 text-[34px] font-bold tracking-tight text-bb-black">
                You're checked in!
              </h1>
              <p className="mt-2 text-[16px] text-bb-gray-600">
                Keep Bluebook open on this screen. Your proctor will read the official test script and provide your room's start code.
              </p>

              {/* Real-time Proctor Live State Card */}
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-bb-navy to-[#151f5c] p-7 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-white/70">
                    <Radio size={16} className="text-bb-yellow animate-pulse" />
                    <span>Test Day Toolkit · Room {roomCodeString}</span>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-0.5 text-[12px] font-semibold text-white/80">
                    Student: {FIXED_STUDENT_NAME} (Present)
                  </span>
                </div>

                <div className="mt-5 border-t border-white/15 pt-5">
                  {proctorState === 'attendance' && (
                    <div className="flex items-center gap-3 py-4 text-[16px] text-white/90">
                      <div className="bb-spinner !h-5 !w-5 !border-2 !border-white/30 !border-t-white" />
                      <span>Proctor is finalizing room attendance in Test Day Toolkit…</span>
                    </div>
                  )}

                  {proctorState === 'script' && (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center gap-2 text-[14px] font-bold text-bb-yellow">
                        <Volume2 size={18} className="animate-pulse" />
                        <span>Proctor is reading instructions to the room:</span>
                      </div>
                      <blockquote className="rounded-xl bg-black/25 p-4 text-[15px] italic text-white/90 border-l-4 border-bb-yellow">
                        "Welcome to the digital SAT. Ensure all bags are under your desk and cell phones are turned completely off. I will now read the 6-digit start code..."
                      </blockquote>
                    </div>
                  )}

                  {proctorState === 'announced' && (
                    <div className="space-y-4 py-1">
                      <div className="text-[13px] font-bold uppercase tracking-wider text-bb-yellow">
                        Start Code Announced:
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/20">
                        <div>
                          <div className="text-[13px] text-white/70">Proctor announced code:</div>
                          <div className="font-mono text-[36px] font-extrabold tracking-[0.25em] text-white">
                            {proctorCode}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStartBoxes(proctorCode.split(''))
                            setStep(6)
                          }}
                          className="bb-btn-yellow !px-6 !py-3 !text-[15px] font-bold shadow-md"
                        >
                          Use Code & Continue →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {proctorState !== 'announced' && (
                <div className="mt-4 text-right">
                  <button
                    type="button"
                    onClick={() => setProctorState('announced')}
                    className="bb-link text-[13px] text-bb-gray-500"
                  >
                    Skip wait & reveal start code
                  </button>
                </div>
              )}

              <div className="mt-8 flex justify-between border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-outline !px-7 !py-3.5 !text-[16px]"
                  onClick={() => setStep(4)}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="bb-btn-primary !px-9 !py-3.5 !text-[17px] font-bold"
                  disabled={proctorState !== 'announced'}
                  onClick={() => setStep(6)}
                >
                  <span>Enter Start Code</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Enter the start code & launch */}
          {step === 6 && (
            <div className="bb-card border border-bb-gray-200 p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-blue-light text-bb-blue">
                <KeyRound size={30} />
              </div>
              <h1 className="mt-5 text-[32px] font-bold tracking-tight text-bb-black">
                Enter the start code
              </h1>
              <p className="mt-2 text-[16px] text-bb-gray-600">
                Enter the <b>6-digit start code</b> read by your proctor to unlock your exam.
              </p>

              {/* 6 Digit Input Boxes (Grouped 3 + 3) */}
              <div className="my-8 flex flex-col items-center">
                <div
                  className="flex items-center justify-center gap-3 sm:gap-4"
                  onPaste={handleStartPaste}
                >
                  <div className="flex gap-2.5 sm:gap-3">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => (startInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={startBoxes[idx]}
                        onChange={(e) => handleStartCharChange(idx, e.target.value)}
                        onKeyDown={(e) => handleStartKeyDown(idx, e)}
                        className={`h-20 w-14 sm:w-18 rounded-2xl border-2 text-center font-mono text-[36px] font-bold transition-all outline-none ${
                          startBoxes[idx]
                            ? 'border-bb-blue bg-bb-blue-light/30 text-bb-blue'
                            : 'border-bb-gray-300 bg-white hover:border-bb-gray-400 focus:border-bb-blue focus:ring-4 focus:ring-bb-blue/20'
                        }`}
                        aria-label={`Start code digit ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <span className="text-[28px] font-bold text-bb-gray-300 select-none">—</span>

                  <div className="flex gap-2.5 sm:gap-3">
                    {[3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => (startInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={startBoxes[idx]}
                        onChange={(e) => handleStartCharChange(idx, e.target.value)}
                        onKeyDown={(e) => handleStartKeyDown(idx, e)}
                        className={`h-20 w-14 sm:w-18 rounded-2xl border-2 text-center font-mono text-[36px] font-bold transition-all outline-none ${
                          startBoxes[idx]
                            ? 'border-bb-blue bg-bb-blue-light/30 text-bb-blue'
                            : 'border-bb-gray-300 bg-white hover:border-bb-gray-400 focus:border-bb-blue focus:ring-4 focus:ring-bb-blue/20'
                        }`}
                        aria-label={`Start code digit ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {proctorCode && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[14px] text-bb-gray-500">
                    <span>Announced start code:</span>
                    <button
                      type="button"
                      onClick={fillAnnouncedStartCode}
                      className="inline-flex items-center gap-1.5 rounded-full border border-bb-blue/40 bg-bb-blue-light px-3.5 py-1 font-mono text-[14px] font-bold text-bb-blue hover:bg-bb-blue hover:text-white transition-colors"
                    >
                      <Sparkles size={14} />
                      {proctorCode} (Click to fill)
                    </button>
                  </div>
                )}
              </div>

              {/* Lockdown Notice */}
              <div className="rounded-xl border border-bb-gray-200 bg-bb-gray-50 p-4 text-[14px] leading-relaxed text-bb-gray-600">
                <p>
                  As soon as your start code is accepted, Bluebook will enter lockdown mode and your testing timer will begin immediately on <b>Section 1, Module 1: Reading and Writing</b>.
                </p>
              </div>

              <div className="mt-8 flex justify-between border-t border-bb-gray-200 pt-6">
                <button
                  type="button"
                  className="bb-btn-outline !px-7 !py-3.5 !text-[16px]"
                  disabled={busy}
                  onClick={() => setStep(5)}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="bb-btn-yellow !px-10 !py-3.5 !text-[18px] font-bold shadow-md hover:shadow-lg disabled:opacity-50"
                  disabled={startCodeString.length !== 6 || busy}
                  onClick={begin}
                >
                  {busy ? (
                    <div className="flex items-center gap-2">
                      <div className="bb-spinner !h-5 !w-5 !border-2" />
                      <span>Starting Lockdown Test…</span>
                    </div>
                  ) : (
                    <span>Start Test</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Stamp */}
      <footer className="pointer-events-none fixed bottom-2 right-4 text-[12px] text-bb-gray-400">
        {BUILD_STAMP}
      </footer>

      {/* Confirmation Modal to Exit */}
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-[20px] font-bold text-bb-black">Return to Home?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-bb-gray-600">
              Are you sure you want to exit check-in? You can return to test-day check-in at any time before starting.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="bb-btn-outline !py-2 !px-5 !text-[15px]"
                onClick={() => setExitModal(false)}
              >
                Stay Here
              </button>
              <button
                type="button"
                className="bb-btn-primary !py-2 !px-5 !text-[15px]"
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
