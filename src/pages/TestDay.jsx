import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  HelpCircle,
  Home,
  CheckCircle2,
  Check,
  RefreshCw,
  Volume2,
  Radio,
  AlertTriangle,
  Sparkles,
  Lock,
} from 'lucide-react'
import bridge from '../lib/bridge.js'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../store/lobby-store.js'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import { launchTest, runDeviceChecks } from '../components/lobby/StartTestDialog.jsx'

const TOTAL_STEPS = 10
const REQUIRED_PLEDGE = 'I agree to the testing rules'

export default function TestDay() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTestId = searchParams.get('testId')

  const { init, manifest, settings } = useLobbyStore()

  // 0-indexed:
  // 0: Step 1 of 10 (Check-In Overview)
  // 1: Step 2 of 10 (Confirm Your Information)
  // 2: Step 3 of 10 (Room Code) -> EXACT MATCH TO USER'S SCREENSHOT
  // 3: Step 4 of 10 (Testing Rules)
  // 4: Step 5 of 10 (Security Pledge)
  // 5: Step 6 of 10 (Clear Your Desk)
  // 6: Step 7 of 10 (Device Check)
  // 7: Step 8 of 10 (You're Checked In)
  // 8: Step 9 of 10 (Waiting for Proctor)
  // 9: Step 10 of 10 (Start Code)
  const [step, setStep] = useState(2) // Default directly to Step 3 of 10 (Room Code) as requested!

  // Step 2 (Step 3 of 10): Room Code
  const [roomBoxes, setRoomBoxes] = useState(['', '', '', '', ''])
  const roomInputRefs = useRef([])
  const defaultRoomCode = 'ABCDE'

  // Step 1: Form & Confirmation
  const [testId, setTestId] = useState('')
  const [infoConfirmed, setInfoConfirmed] = useState(true)

  // Step 3 (Step 4 of 10): Testing Rules
  const [rulesAgreed, setRulesAgreed] = useState(false)

  // Step 4 (Step 5 of 10): Security Pledge
  const [pledgeText, setPledgeText] = useState('')

  // Step 5 (Step 6 of 10): Clear Desk Checklist
  const [deskChecks, setDeskChecks] = useState({
    permitted: false,
    electronicsOff: false,
    appsClosed: false,
  })

  // Step 6 (Step 7 of 10): Device Check
  const [checks, setChecks] = useState(null)
  const [deviceChecking, setDeviceChecking] = useState(false)

  // Step 8 (Step 9 of 10): Proctor Announcement
  const [proctorState, setProctorState] = useState('waiting') // 'waiting' | 'script' | 'announced'
  const [proctorCode, setProctorCode] = useState(null)

  // Step 9 (Step 10 of 10): Start Code
  const [startBoxes, setStartBoxes] = useState(['', '', '', '', '', ''])
  const startInputRefs = useRef([])

  // Modals & General
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [exitModal, setExitModal] = useState(false)
  const [helpModal, setHelpModal] = useState(false)

  const downloaded = manifest.filter((t) => t.kind !== 'preview' && t.cached)

  useEffect(() => {
    init()
  }, [init])

  // Select default test
  useEffect(() => {
    if (testId) return
    if (initialTestId && downloaded.some((t) => t.testId === initialTestId)) {
      setTestId(initialTestId)
    } else if (downloaded.length > 0) {
      const regTest = downloaded.find((t) => t.testId === settings.registration?.setupTestId)
      setTestId(regTest ? regTest.testId : downloaded[0].testId)
    }
  }, [downloaded, testId, initialTestId, settings.registration])

  // Run diagnostics when on device check step
  useEffect(() => {
    if (step === 6 && !checks) {
      setDeviceChecking(true)
      runDeviceChecks().then((res) => {
        setChecks(res)
        setDeviceChecking(false)
      })
    }
  }, [step, checks])

  // Proctor simulation when on step 8
  useEffect(() => {
    if (step !== 8) return
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setProctorCode(code)
    setProctorState('attendance')

    const t1 = setTimeout(() => setProctorState('script'), 1200)
    const t2 = setTimeout(() => setProctorState('announced'), 3400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [step])

  // Auto focus input on relevant steps
  useEffect(() => {
    if (step === 2) {
      roomInputRefs.current[0]?.focus()
    } else if (step === 9) {
      startInputRefs.current[0]?.focus()
    }
  }, [step])

  const roomCodeString = roomBoxes.join('').toUpperCase()
  const startCodeString = startBoxes.join('')
  const isRoomCodeComplete = roomCodeString.length === 5
  const isStartCodeComplete = startCodeString.length === 6

  // ---------- Room Code Keyboard Handlers ----------
  const handleRoomCharChange = (index, val) => {
    // Only accept letters
    const clean = val.toUpperCase().replace(/[^A-Z]/g, '')
    const updated = [...roomBoxes]

    if (clean.length > 1) {
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
    } else if (e.key === 'Enter' && isRoomCodeComplete) {
      e.preventDefault()
      setStep(3)
    }
  }

  const handleRoomPaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
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

  // ---------- Start Code Keyboard Handlers ----------
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
    } else if (e.key === 'Enter' && isStartCodeComplete) {
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

  // ---------- Launch Test ----------
  const begin = async () => {
    if (startCodeString !== proctorCode) {
      setError('That start code does not match the code your proctor read.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const targetId = testId || downloaded[0]?.testId
      const raw = await bridge.tests.load(targetId)
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

  // Validation conditions per step
  const pledgeMatches = pledgeText.trim().toLowerCase() === REQUIRED_PLEDGE.toLowerCase()
  const allDeskChecked = deskChecks.permitted && deskChecks.electronicsOff && deskChecks.appsClosed

  const canGoNext = () => {
    switch (step) {
      case 0:
        return true
      case 1:
        return infoConfirmed && !!testId
      case 2:
        return isRoomCodeComplete
      case 3:
        return rulesAgreed
      case 4:
        return pledgeMatches
      case 5:
        return allDeskChecked
      case 6:
        return !deviceChecking && !!checks
      case 7:
        return true
      case 8:
        return proctorState === 'announced'
      case 9:
        return isStartCodeComplete && !busy
      default:
        return true
    }
  }

  const handleNext = () => {
    if (step === 9) {
      begin()
    } else {
      setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
    }
  }

  const handleBack = () => {
    if (step === 0) {
      setExitModal(true)
    } else {
      setStep((s) => Math.max(0, s - 1))
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-white text-[#1e1e1e] select-none font-sans antialiased">
      {/* Top Protocol Header */}
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#e5e7eb] px-8 sm:px-12 bg-white">
        <button
          type="button"
          onClick={() => setHelpModal(true)}
          className="flex items-center gap-2 text-[15px] font-medium text-[#2c2c2c] hover:text-black transition-colors"
        >
          <HelpCircle size={20} className="text-[#2c2c2c]" />
          <span>Help</span>
        </button>

        <button
          type="button"
          onClick={() => setExitModal(true)}
          className="flex items-center gap-2 text-[15px] font-medium text-[#2c2c2c] hover:text-black transition-colors"
        >
          <span>Return to Home</span>
          <Home size={20} className="text-[#2c2c2c]" />
        </button>
      </header>

      {/* Main Content Area - Centered exactly as in the user's design */}
      <main className="bb-scroll flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-[760px] text-center flex flex-col items-center justify-center">

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-[15px] font-medium text-red-700">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Overview */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Check-In
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Welcome, {FIXED_STUDENT_NAME.split(' ')[0]}. Complete check-in to prepare for your exam.
              </p>
              <div className="mt-8 w-full max-w-[560px] rounded-2xl border border-gray-200 bg-[#f9fafb] p-6 text-left text-[16px] space-y-3">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Student</span>
                  <span className="font-semibold text-black">{FIXED_STUDENT_NAME}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Assessment</span>
                  <span className="font-semibold text-black">Digital SAT</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Accommodations</span>
                  <span className="font-semibold text-black">None — Standard Timing</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Test Center</span>
                  <span className="font-semibold text-black">{settings.registration?.center?.name || 'Assigned Center'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Confirm Information */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Confirm Your Information
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Make sure your personal details and test form are correct.
              </p>
              <div className="mt-8 w-full max-w-[560px] rounded-2xl border border-gray-200 bg-[#f9fafb] p-6 text-left text-[16px] space-y-3">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Full Name</span>
                  <span className="font-bold text-black">{FIXED_STUDENT_NAME}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Exam</span>
                  <span className="font-semibold text-black">Digital SAT</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500">Form</span>
                  <div className="max-w-[280px]">
                    {downloaded.length === 0 ? (
                      <span className="text-red-600 text-[14px]">No test downloaded</span>
                    ) : (
                      <select
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[15px] font-medium text-black focus:outline-none focus:border-black"
                        value={testId}
                        onChange={(e) => setTestId(e.target.value)}
                      >
                        {downloaded.map((t) => (
                          <option key={t.testId} value={t.testId}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
              <label className="mt-6 flex cursor-pointer items-center gap-3 text-[16px] text-[#2c2c2c]">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 accent-black"
                  checked={infoConfirmed}
                  onChange={(e) => setInfoConfirmed(e.target.checked)}
                />
                <span>I confirm that my personal information is accurate.</span>
              </label>
            </div>
          )}

          {/* STEP 3 (Step 3 of 10): Room Code -> EXACT MATCH TO USER'S SCREENSHOT */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[40px] font-normal sm:font-medium text-[#1e1e1e] tracking-tight">
                Room Code
              </h1>

              <p className="mt-4 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                Enter your room code now to complete check-in.
              </p>

              <p className="mt-3 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                The room code contains <span className="font-bold">letters only</span>.
              </p>

              {/* Success Message (shown only when 5 letters are entered) */}
              {isRoomCodeComplete ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-[16px] font-semibold text-[#137333] transition-opacity duration-200">
                  <CheckCircle2 size={19} className="fill-[#137333] text-white" />
                  <span>Success! Click the Next button to complete check-in.</span>
                </div>
              ) : (
                <div className="h-[28px] mt-5" aria-hidden="true" />
              )}

              {/* 5 Distinct Letter Boxes */}
              <div
                className="mt-6 flex items-center justify-center gap-3.5 sm:gap-4"
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
                    className="w-[74px] h-[76px] sm:w-[82px] sm:h-[84px] rounded-2xl border-[1.5px] border-[#8a8a8a] bg-white text-center font-sans font-bold text-[34px] sm:text-[38px] text-[#6b7280] uppercase outline-none focus:border-black focus:text-black transition-colors"
                    aria-label={`Room code character ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Subtle helper chip to auto-fill sample code */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-gray-400">
                <span>Code on the board:</span>
                <button
                  type="button"
                  onClick={fillSimulatedRoomCode}
                  className="font-bold underline hover:text-black transition-colors"
                >
                  {defaultRoomCode} (Click to fill)
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Testing Rules */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Testing Rules
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Review the testing rules before continuing.
              </p>
              <div className="mt-8 max-h-[300px] w-full max-w-[620px] space-y-4 overflow-y-auto rounded-2xl border border-gray-200 bg-[#f9fafb] p-6 text-left text-[15px] leading-relaxed text-[#374151] bb-scroll">
                <p>
                  <b>1. Prohibited Devices:</b> All cell phones, smartwatches, wireless earbuds, and unauthorized electronics must be powered completely off and stored away.
                </p>
                <p>
                  <b>2. Sole Application:</b> Bluebook must be the only open application on your device. Attempting to switch apps or access external tools will invalidate your test.
                </p>
                <p>
                  <b>3. Scratch Paper:</b> You must write your full legal name on the top of each sheet of scratch paper. All sheets will be collected at the end of testing.
                </p>
                <p>
                  <b>4. Individual Timing:</b> Each module is timed separately. You cannot return to a module once time has expired.
                </p>
                <p>
                  <b>5. Confidentiality:</b> You agree not to copy, record, share, or discuss any test questions or answers.
                </p>
              </div>
              <label className="mt-6 flex cursor-pointer items-center gap-3 text-[16px] text-[#2c2c2c]">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 accent-black"
                  checked={rulesAgreed}
                  onChange={(e) => setRulesAgreed(e.target.checked)}
                />
                <span>I have read and agree to the Testing Rules.</span>
              </label>
            </div>
          )}

          {/* STEP 5: Security Pledge */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Security Pledge
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Type the following statement to verify your agreement:
              </p>
              <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-[16px] font-semibold text-black">
                "{REQUIRED_PLEDGE}"
              </div>
              <div className="mt-5 w-full max-w-[480px]">
                <input
                  type="text"
                  value={pledgeText}
                  onChange={(e) => setPledgeText(e.target.value)}
                  placeholder={REQUIRED_PLEDGE}
                  className="w-full rounded-xl border-[1.5px] border-gray-400 bg-white px-4 py-3 text-center text-[17px] text-black outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => setPledgeText(REQUIRED_PLEDGE)}
                  className="mt-3 text-[14px] font-semibold text-[#255cd8] underline hover:text-blue-800"
                >
                  Auto-fill statement
                </button>
              </div>
              {pledgeMatches && (
                <div className="mt-5 flex items-center justify-center gap-2 text-[16px] font-semibold text-[#137333]">
                  <CheckCircle2 size={19} className="fill-[#137333] text-white" />
                  <span>Statement verified. Click Next to continue.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Clear Your Desk */}
          {step === 5 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Clear Your Desk
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Before your proctor begins the instructions, prepare your desk.
              </p>
              <div className="mt-8 w-full max-w-[600px] space-y-3 text-left">
                {[
                  {
                    key: 'permitted',
                    text: 'Only permitted items (device, charger, mouse, pencil/pen, and provided scratch paper) are on your desk.',
                  },
                  {
                    key: 'electronicsOff',
                    text: 'All cell phones, smartwatches, and extra electronics are powered completely off and placed in your bag.',
                  },
                  {
                    key: 'appsClosed',
                    text: 'All other applications and background software on this device have been closed.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-200 bg-[#f9fafb] p-4 text-[16px] text-[#374151] hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-gray-300 accent-black shrink-0"
                      checked={deskChecks[item.key]}
                      onChange={(e) =>
                        setDeskChecks({ ...deskChecks, [item.key]: e.target.checked })
                      }
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDeskChecks({ permitted: true, electronicsOff: true, appsClosed: true })
                }
                className="mt-4 text-[14px] font-medium text-gray-500 underline hover:text-black"
              >
                Select all
              </button>
            </div>
          )}

          {/* STEP 7: Device Check */}
          {step === 6 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Device Check
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Bluebook is verifying your device meets test day requirements.
              </p>

              {deviceChecking || !checks ? (
                <div className="my-10 flex flex-col items-center gap-3">
                  <div className="bb-spinner" />
                  <p className="text-[15px] text-gray-500">Checking device diagnostics…</p>
                </div>
              ) : (
                <div className="mt-8 w-full max-w-[560px] divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white text-left">
                  {checks.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Check size={18} className="text-[#137333]" strokeWidth={3} />
                        <div>
                          <div className="text-[15px] font-bold text-black">{c.label}</div>
                          <div className="text-[13px] text-gray-500">{c.detail}</div>
                        </div>
                      </div>
                      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[12px] font-semibold text-[#137333]">
                        Passed
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2 text-[14px] text-gray-500">
                <button
                  type="button"
                  onClick={async () => {
                    setDeviceChecking(true)
                    setChecks(null)
                    setChecks(await runDeviceChecks())
                    setDeviceChecking(false)
                  }}
                  className="flex items-center gap-1 font-semibold underline hover:text-black"
                >
                  <RefreshCw size={14} /> Re-run diagnostics
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: You're Checked In */}
          {step === 7 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                You're Checked In
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Your check-in has been submitted to your proctor.
              </p>
              <div className="mt-8 w-full max-w-[520px] rounded-2xl border border-gray-200 bg-[#f9fafb] p-6 text-left text-[16px] space-y-3">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Room</span>
                  <span className="font-mono font-bold text-black">{roomCodeString || defaultRoomCode}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Student</span>
                  <span className="font-semibold text-black">{FIXED_STUDENT_NAME}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#137333]">
                    <CheckCircle2 size={16} className="fill-[#137333] text-white" />
                    Present in Test Day Toolkit
                  </span>
                </div>
              </div>
              <p className="mt-6 text-[16px] text-gray-500">
                Click Next to proceed to the proctor instruction screen.
              </p>
            </div>
          )}

          {/* STEP 9: Waiting for Proctor */}
          {step === 8 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[38px] font-semibold text-[#1e1e1e] tracking-tight">
                Waiting for Proctor
              </h1>
              <p className="mt-4 text-[19px] text-[#2c2c2c]">
                Stay on this screen. Your proctor will read the test instructions aloud.
              </p>

              <div className="mt-8 w-full max-w-[580px] rounded-2xl border border-gray-200 bg-[#f9fafb] p-6 text-left">
                {proctorState === 'attendance' && (
                  <div className="flex items-center gap-3 py-3 text-[16px] text-gray-600">
                    <div className="bb-spinner !h-5 !w-5" />
                    <span>Proctor is finalizing room attendance…</span>
                  </div>
                )}

                {proctorState === 'script' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[14px] font-bold text-[#255cd8]">
                      <Volume2 size={18} className="animate-pulse" />
                      <span>Proctor is reading instructions to the room:</span>
                    </div>
                    <blockquote className="border-l-4 border-[#255cd8] pl-3 text-[15px] italic text-gray-700">
                      "Welcome to the digital SAT. Ensure all bags are under your desk and cell phones are turned completely off. I will now announce the 6-digit start code..."
                    </blockquote>
                  </div>
                )}

                {proctorState === 'announced' && (
                  <div className="space-y-3">
                    <div className="text-[13px] font-bold uppercase tracking-wider text-gray-500">
                      Proctor announcement:
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white p-4 border border-gray-200">
                      <div>
                        <div className="text-[13px] text-gray-500">Start Code:</div>
                        <div className="font-mono text-[32px] font-bold tracking-[0.2em] text-black">
                          {proctorCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStartBoxes(proctorCode.split(''))
                          setStep(9)
                        }}
                        className="rounded-full bg-[#fedb00] px-5 py-2 text-[14px] font-bold text-black hover:bg-[#e9c800]"
                      >
                        Use Code →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {proctorState !== 'announced' && (
                <button
                  type="button"
                  onClick={() => setProctorState('announced')}
                  className="mt-4 text-[13px] text-gray-400 underline hover:text-black"
                >
                  Skip wait & reveal start code
                </button>
              )}
            </div>
          )}

          {/* STEP 10: Start Code (6 digits) */}
          {step === 9 && (
            <div className="flex flex-col items-center text-center">
              <h1 className="text-[40px] font-normal sm:font-medium text-[#1e1e1e] tracking-tight">
                Start Code
              </h1>

              <p className="mt-4 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                Enter your start code now to begin testing.
              </p>

              <p className="mt-3 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                The start code contains <span className="font-bold">numbers only</span>.
              </p>

              {/* Success Message when 6 digits entered */}
              {isStartCodeComplete ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-[16px] font-semibold text-[#137333]">
                  <CheckCircle2 size={19} className="fill-[#137333] text-white" />
                  <span>Success! Click the Start Test button to begin your exam.</span>
                </div>
              ) : (
                <div className="h-[28px] mt-5" aria-hidden="true" />
              )}

              {/* 6 Digit Input Boxes (3 + 3) */}
              <div
                className="mt-6 flex items-center justify-center gap-3 sm:gap-4"
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
                      className="w-[68px] h-[74px] sm:w-[76px] sm:h-[80px] rounded-2xl border-[1.5px] border-[#8a8a8a] bg-white text-center font-sans font-bold text-[34px] sm:text-[38px] text-[#6b7280] outline-none focus:border-black focus:text-black transition-colors"
                      aria-label={`Start code digit ${idx + 1}`}
                    />
                  ))}
                </div>

                <span className="text-[28px] font-normal text-[#8a8a8a] select-none">—</span>

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
                      className="w-[68px] h-[74px] sm:w-[76px] sm:h-[80px] rounded-2xl border-[1.5px] border-[#8a8a8a] bg-white text-center font-sans font-bold text-[34px] sm:text-[38px] text-[#6b7280] outline-none focus:border-black focus:text-black transition-colors"
                      aria-label={`Start code digit ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {proctorCode && (
                <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-gray-400">
                  <span>Announced code:</span>
                  <button
                    type="button"
                    onClick={fillAnnouncedStartCode}
                    className="font-bold underline hover:text-black transition-colors"
                  >
                    {proctorCode} (Click to fill)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Bottom Protocol Footer - Exact match to user's screenshot */}
      <footer className="h-[92px] shrink-0 border-t border-[#d1d5db] bg-white flex items-center justify-between px-8 sm:px-12">
        {/* Back Button (pill, white bg, thin black border) */}
        <button
          type="button"
          onClick={handleBack}
          disabled={busy}
          className="rounded-full border border-black bg-white px-8 py-2.5 text-[16px] font-semibold text-black hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          Back
        </button>

        {/* Center: Step X of 10 + Progress Bar */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[15px] font-normal text-[#2c2c2c]">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <div className="h-1.5 w-[280px] sm:w-[320px] overflow-hidden rounded-full bg-[#e8edfb]">
            <div
              className="h-full bg-[#255cd8] transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Next / Start Test Button (Yellow Pill) */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext() || busy}
          className="rounded-full bg-[#fedb00] px-10 py-3 text-[16px] font-bold text-black shadow-sm hover:bg-[#e9c800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="bb-spinner !h-4 !w-4 !border-2" />
              <span>Starting…</span>
            </span>
          ) : step === 9 ? (
            <span>Start Test</span>
          ) : (
            <span>Next</span>
          )}
        </button>
      </footer>

      {/* Return to Home Confirmation Modal */}
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-[20px] font-bold text-black">Return to Home?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              Are you sure you want to return to the home screen? You can check in again at any time.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-black bg-white px-5 py-2 text-[15px] font-semibold text-black hover:bg-gray-50"
                onClick={() => setExitModal(false)}
              >
                Stay Here
              </button>
              <button
                type="button"
                className="rounded-full bg-[#fedb00] px-5 py-2 text-[15px] font-bold text-black hover:bg-[#e9c800]"
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-[20px] font-bold text-black">Need Help?</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
              Your proctor writes the 5-letter room code on the whiteboard at the front of your testing room.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              If you don't see the code or need assistance, please raise your hand to speak with your proctor.
            </p>
            <div className="mt-6 text-right">
              <button
                type="button"
                className="rounded-full bg-[#fedb00] px-6 py-2 text-[15px] font-bold text-black hover:bg-[#e9c800]"
                onClick={() => setHelpModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
