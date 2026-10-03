import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  HelpCircle,
  Home,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Check,
  Play,
} from 'lucide-react'
import bridge, { isElectron } from '../lib/bridge.js'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../store/lobby-store.js'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import { launchTest } from '../components/lobby/StartTestDialog.jsx'
import { LobbyChatPanel } from '../components/lobby/LobbyChat.jsx'

const TOTAL_STEPS = 10

function fmtDate(iso) {
  if (!iso) return 'Saturday, Oct 10, 2026'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Saturday, Oct 10, 2026'
  }
}

export default function TestDay() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Default to step 2 (Step 3 of 10: Room Code) unless step is explicitly provided
  const initialStep = searchParams.has('step')
    ? Math.min(TOTAL_STEPS - 1, Math.max(0, parseInt(searchParams.get('step') || '0', 10)))
    : searchParams.get('mode') === 'setup'
    ? 0
    : 2 // Default directly to Step 3 of 10 (Room Code) matching user's 1:1 request!

  const initialTestId = searchParams.get('testId')

  const { init, manifest, settings, saveSettings } = useLobbyStore()

  // Step 0: Confirm Your Personal Information (Step 1 of 10)
  // Step 1: SAT Testing Rules (Step 2 of 10)
  // Step 2: Room Code (Step 3 of 10) -> EXACT 1:1 MATCH TO USER SCREENSHOT
  // Step 3: Start Code (Step 4 of 10)
  // Step 4: Review Device Requirements (Step 5 of 10)
  // Step 5: Device Lock Check (Step 6 of 10)
  // Step 6: Your Admission Ticket (Step 7 of 10)
  // Step 7: Get Ready for Test Day - Video Overview (Step 8 of 10)
  // Step 8: Get Ready for the Digital SAT - Guide (Step 9 of 10)
  // Step 9: Final Launch Confirmation (Step 10 of 10)
  const [step, setStep] = useState(initialStep)

  // Step 0: Confirm Personal Info
  const [infoCorrect, setInfoCorrect] = useState('yes')

  // Step 1: SAT Testing Rules
  const [rulesAccepted, setRulesAccepted] = useState(true)

  // Step 2: Room Code (Letters only, 5 boxes) - Pre-filled with A B C D E matching screenshot 1:1
  const [roomBoxes, setRoomBoxes] = useState(['A', 'B', 'C', 'D', 'E'])
  const roomInputRefs = useRef([])

  // Step 3: Start Code (Numbers only, 6 digits) - Pre-filled with 6 2 9 4 1 8
  const [startBoxes, setStartBoxes] = useState(['6', '2', '9', '4', '1', '8'])
  const startInputRefs = useRef([])
  const [proctorCode, setProctorCode] = useState('629418')

  // Step 4: Device Requirements
  const [deviceUse, setDeviceUse] = useState('yes')

  // Step 5: Device Lock Check
  const [lockChecked, setLockChecked] = useState(false)
  const [checkingLock, setCheckingLock] = useState(false)

  // Step 6: Admission Ticket
  const [ticketPrinted, setTicketPrinted] = useState(false)

  // Modals & General
  const [testId, setTestId] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [exitModal, setExitModal] = useState(false)
  const [helpModal, setHelpModal] = useState(false)

  const downloaded = manifest.filter((t) => t.kind !== 'preview' && t.cached)
  const studentDisplayName = settings.studentName || FIXED_STUDENT_NAME || 'Askarjon Arslonov'
  const reg = settings.registration || {}

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

  const roomCodeString = roomBoxes.join('').toUpperCase()
  const startCodeString = startBoxes.join('')
  const isRoomCodeComplete = roomCodeString.length === 5
  const isStartCodeComplete = startCodeString.length === 6

  // ---------- Room Code Keyboard Handlers (Letters only) ----------
  const handleRoomCharChange = (index, val) => {
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

  // ---------- Start Code Keyboard Handlers (Numbers only) ----------
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

  // Device Lock Simulation
  const handleCheckDevice = async () => {
    setCheckingLock(true)
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
      setTimeout(() => {
        setLockChecked(true)
        setCheckingLock(false)
      }, 700)
    } catch {
      setLockChecked(true)
      setCheckingLock(false)
    }
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
        studentName: studentDisplayName,
        lockdown: true,
        mode: 'test-day',
      })
    } catch (e) {
      setError(e.message || String(e))
      setBusy(false)
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 0:
        return infoCorrect === 'yes'
      case 1:
        return rulesAccepted
      case 2:
        return isRoomCodeComplete
      case 3:
        return isStartCodeComplete && !busy
      case 4:
        return deviceUse === 'yes'
      case 5:
        return lockChecked
      default:
        return true
    }
  }

  const handleNext = () => {
    if (step === 3) {
      begin()
    } else if (step === TOTAL_STEPS - 1) {
      navigate('/')
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
    <div className="flex h-screen w-screen flex-col bg-[#fafafa] text-[#1e1e1e] select-none font-sans antialiased">
      {/* Top Protocol Header - Exactly 1:1 with photo */}
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

      {/* Main Content Area */}
      <main className="bb-scroll flex-1 overflow-y-auto flex flex-col items-center bg-[#fafafa] pt-16 sm:pt-20 px-6 pb-8">
        <div className="w-full max-w-[800px] text-center flex flex-col items-center">

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-[15px] font-medium text-red-700">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1 OF 10: Confirm Your Personal Information           */}
          {/* ========================================================= */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                Confirm Your Personal Information
              </h1>

              <div className="mt-8 w-full max-w-[1000px] rounded-2xl border border-[#d1d5db] bg-white p-9 sm:p-12 text-left shadow-none">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-[17px] font-bold text-black">First and Last Name</div>
                    <div className="mt-1.5 text-[17px] text-[#2c2c2c]">{studentDisplayName}</div>
                  </div>

                  <div>
                    <div className="text-[17px] font-bold text-black">Accommodations</div>
                    <ul className="mt-1.5 text-[15px] text-[#2c2c2c] list-disc pl-5 space-y-1">
                      <li>You don't have any approved digital testing accommodations.</li>
                    </ul>
                    <p className="mt-2.5 text-[14px] text-[#4b5563] leading-relaxed">
                      You may have approved accommodations that don't apply to digital testing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setHelpModal(true)}
                      className="mt-1.5 block text-[14px] text-[#255cd8] underline hover:text-blue-800 text-left"
                    >
                      Learn more about accommodations
                    </button>
                  </div>
                </div>

                <div className="my-7 border-t border-[#e5e7eb]" />

                <div className="text-center">
                  <div className="text-[16px] font-bold text-black mb-3">
                    Is this information correct?
                  </div>
                  <div className="flex justify-center gap-10">
                    <label className="flex items-center gap-2 cursor-pointer text-[16px] font-medium text-black">
                      <input
                        type="radio"
                        name="infoCorrect"
                        checked={infoCorrect === 'yes'}
                        onChange={() => setInfoCorrect('yes')}
                        className="w-4 h-4 accent-black text-black cursor-pointer"
                      />
                      <span>Yes</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[16px] font-medium text-black">
                      <input
                        type="radio"
                        name="infoCorrect"
                        checked={infoCorrect === 'no'}
                        onChange={() => setInfoCorrect('no')}
                        className="w-4 h-4 accent-black text-black cursor-pointer"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2 OF 10: SAT Testing Rules                           */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                SAT Testing Rules
              </h1>

              <div className="mt-7 w-full max-w-[1040px] rounded-2xl border border-[#d1d5db] bg-white p-8 sm:p-11 text-left shadow-none">
                <div className="bb-scroll h-[460px] sm:h-[490px] overflow-y-auto pr-5 space-y-5 text-[15.5px] sm:text-[16px] leading-[1.65] text-[#2c2c2c]">
                  <div>
                    <h2 className="font-bold text-[17px] text-black">Introduction</h2>
                    <p className="mt-1.5">
                      These Testing Rules ("Rules") are a legal contract between you and College Board.
                      They set forth important rules you must follow related to taking the SAT®,
                      referred to as a "Test" or "SAT" in these Rules. Please read them carefully.
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-[14.5px] text-[#78350f] leading-relaxed">
                    <span className="font-bold">IMPORTANT:</span> Any attempt to gain an unfair advantage
                    on the Test—including through cyber or digital methods, disabling test security features,
                    or using unauthorized smart devices—is strictly prohibited and will result in disciplinary
                    measures and consequences, including score cancellation and other sanctions.
                  </div>

                  <div>
                    <h2 className="font-bold text-[17px] text-black">Section 1. Taking the Test</h2>
                    <ul className="mt-2 list-disc pl-5 space-y-1.5">
                      <li>The SAT is a digital test. You will take the Test on an app called Bluebook™.</li>
                      <li>Your testing device must meet College Board requirements.</li>
                      <li>You must keep your device locked down in the Bluebook app throughout testing.</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="font-bold text-[17px] text-black">Section 16. Accessibility of These Rules</h2>
                    <p className="mt-1.5">
                      If you have difficulty accessing these Rules, please contact College Board customer service
                      at 866-630-9305 (+1-212-713-8000 internationally).
                    </p>
                  </div>
                </div>

                <div className="my-6 border-t border-[#e5e7eb]" />

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    className="w-5 h-5 accent-black text-black rounded cursor-pointer"
                  />
                  <span className="text-[16px] font-medium text-black">
                    I have read and I accept these rules.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3 OF 10: Room Code (EXACT 1:1 TO USER SCREENSHOT)    */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[42px] font-normal text-[#1e1e1e] tracking-tight leading-none">
                Room Code
              </h1>

              <p className="mt-5 text-[18px] sm:text-[19px] text-[#2c2c2c] font-normal">
                Enter your room code now to complete check-in.
              </p>

              <p className="mt-3 text-[18px] sm:text-[19px] text-[#2c2c2c] font-normal">
                The room code contains <span className="font-bold text-[#1e1e1e]">letters only</span>.
              </p>

              {/* Success Message Banner */}
              {isRoomCodeComplete ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-[15px] font-bold text-[#137333]">
                  <CheckCircle2 size={18} className="fill-[#137333] text-white shrink-0" />
                  <span>Success! Click the Next button to complete check-in.</span>
                </div>
              ) : (
                <div className="h-[26px] mt-5" aria-hidden="true" />
              )}

              {/* 5 Distinct Letter Boxes (A, B, C, D, E) */}
              <div
                className="mt-6 flex items-center justify-center gap-4"
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
                    className="w-[64px] h-[74px] rounded-2xl border-[1.5px] border-[#8a8a8a] bg-white text-center font-bold text-[32px] text-[#555555] uppercase outline-none focus:border-black focus:text-black transition-colors shadow-none"
                    aria-label={`Room code character ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4 OF 10: Start Code                                  */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[42px] font-normal text-[#1e1e1e] tracking-tight leading-none">
                Start Code
              </h1>

              <p className="mt-5 text-[18px] sm:text-[19px] text-[#2c2c2c] font-normal">
                Enter the start code provided by your proctor to begin testing.
              </p>

              <p className="mt-3 text-[18px] sm:text-[19px] text-[#2c2c2c] font-normal">
                The start code contains <span className="font-bold text-[#1e1e1e]">numbers only</span>.
              </p>

              {/* Success message when 6 digits entered */}
              {isStartCodeComplete ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-[15px] font-bold text-[#137333]">
                  <CheckCircle2 size={18} className="fill-[#137333] text-white shrink-0" />
                  <span>Success! Click the Start Test button to enter lockdown mode.</span>
                </div>
              ) : (
                <div className="h-[26px] mt-5" aria-hidden="true" />
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
                      className="w-[64px] h-[74px] rounded-2xl border-[1.5px] border-[#8a8a8a] bg-white text-center font-bold text-[32px] text-[#555555] outline-none focus:border-black focus:text-black transition-colors"
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
                      className="w-[64px] h-[74px] rounded-2xl border-[1.5px] border-[#8a8a8a] bg-white text-center font-bold text-[32px] text-[#555555] outline-none focus:border-black focus:text-black transition-colors"
                      aria-label={`Start code digit ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 5 OF 10: Review Device Requirements                  */}
          {/* ========================================================= */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                Review Device Requirements
              </h1>

              <div className="mt-7 w-full max-w-[1000px] rounded-2xl border border-[#d1d5db] bg-white p-9 sm:p-12 text-left shadow-none">
                <p className="text-[16px] text-[#2c2c2c] leading-relaxed">
                  You can run Bluebook on a Windows or Mac device, an iPad, or a school-managed Chromebook.
                </p>

                <div className="mt-5">
                  <div className="text-[16px] font-bold text-black">Your device:</div>
                  <ul className="mt-2 list-disc pl-5 space-y-2 text-[15px] text-[#2c2c2c]">
                    <li>Must stay on for roughly 3 hours.</li>
                    <li>Must be able to connect to Wi-Fi.</li>
                  </ul>
                </div>

                <div className="my-7 border-t border-[#e5e7eb]" />

                <div className="text-center">
                  <div className="text-[16px] font-bold text-black mb-3">
                    Is this the device you'll use on test day?
                  </div>
                  <div className="flex justify-center gap-10">
                    <label className="flex items-center gap-2 cursor-pointer text-[16px] font-medium text-black">
                      <input
                        type="radio"
                        name="deviceUse"
                        checked={deviceUse === 'yes'}
                        onChange={() => setDeviceUse('yes')}
                        className="w-4 h-4 accent-black text-black cursor-pointer"
                      />
                      <span>Yes</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[16px] font-medium text-black">
                      <input
                        type="radio"
                        name="deviceUse"
                        checked={deviceUse === 'no'}
                        onChange={() => setDeviceUse('no')}
                        className="w-4 h-4 accent-black text-black cursor-pointer"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 6 OF 10: Device Lock Check                           */}
          {/* ========================================================= */}
          {step === 5 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                Device Lock Check
              </h1>

              <div className="mt-8 w-full max-w-[920px] rounded-2xl border border-[#d1d5db] bg-white p-12 sm:p-16 text-center shadow-none">
                <p className="text-[16.5px] text-[#2c2c2c] mb-3 leading-relaxed">
                  On test day, Bluebook will go full-screen and you won't be able to access other apps or websites.
                </p>

                <p className="text-[16.5px] text-[#2c2c2c] mb-8 leading-relaxed">
                  Select <span className="font-bold">Check My Device</span> now to make sure this is working.
                </p>

                <button
                  type="button"
                  onClick={handleCheckDevice}
                  disabled={checkingLock}
                  className="rounded-full bg-[#255cd8] hover:bg-[#1d4bb8] text-white px-9 py-3 text-[16px] font-semibold transition-colors shadow-sm"
                >
                  {checkingLock ? 'Checking…' : 'Check My Device'}
                </button>

                {lockChecked && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-[16px] font-semibold text-[#137333]">
                    <CheckCircle2 size={19} className="fill-[#137333] text-white" />
                    <span>Device lock check successful!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 7 OF 10: Your Admission Ticket                       */}
          {/* ========================================================= */}
          {step === 6 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                Your Admission Ticket
              </h1>

              <div className="mt-7 w-full max-w-[1000px] rounded-2xl border-2 border-dashed border-[#8a8a8a] bg-white p-9 sm:p-12 text-left shadow-none">
                <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[24px] tracking-tight text-[#0077c8]">SAT<span className="text-[14px] align-super">®</span></span>
                    <span className="text-[17px] font-semibold text-gray-500">| Admission Ticket</span>
                  </div>
                  <span className="text-[13px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    Confirmed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[15px]">
                  <div>
                    <span className="text-gray-500 block text-[13px] font-medium">Student</span>
                    <span className="font-bold text-[#1e1e1e] text-[17px]">{studentDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[13px] font-medium">Registration Number</span>
                    <span className="font-mono font-semibold text-[#1e1e1e] text-[16px]">SAT-2026-98134</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[13px] font-medium">Date</span>
                    <span className="font-semibold text-[#1e1e1e] text-[16px]">{fmtDate(reg.date)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[13px] font-medium">Arrival Time</span>
                    <span className="font-semibold text-[#1e1e1e]">{reg.arrival || '7:45 a.m.'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 8 OF 10: Get Ready for Test Day (Video Overview)     */}
          {/* ========================================================= */}
          {step === 7 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                Get Ready for Test Day
              </h1>

              <div
                onClick={() => setStep(8)}
                className="group mt-8 w-full max-w-[960px] rounded-2xl border border-[#d1d5db] bg-white p-12 sm:p-16 text-center shadow-none cursor-pointer hover:border-[#255cd8] transition-all"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setStep(8)}
              >
                <div className="flex justify-center">
                  <div className="w-[340px] sm:w-[400px]">
                    <div className="relative h-[210px] sm:h-[230px] rounded-t-xl border-[4px] border-[#2b2b2b] bg-white flex flex-col items-center justify-center shadow-sm">
                      <div className="text-[40px] sm:text-[44px] font-bold tracking-tight text-[#0077c8] select-none">
                        SAT<span className="text-[18px] align-super">®</span>
                      </div>
                      <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0056b3] text-white shadow-md group-hover:scale-110 transition-transform">
                        <Play size={26} className="fill-white translate-x-0.5" />
                      </div>
                    </div>
                    <div className="relative h-[15px] rounded-b-lg bg-[#d1d5db] border-x border-b border-[#9ca3af] flex items-center justify-center">
                      <div className="h-[4px] w-14 rounded-b bg-[#9ca3af]" />
                    </div>
                  </div>
                </div>

                <h2 className="mt-8 text-[26px] sm:text-[28px] font-bold text-[#1e1e1e] group-hover:text-[#255cd8] transition-colors">
                  Get Ready for the Digital SAT
                </h2>
                <p className="mt-2 text-[15px] text-gray-500 font-normal">
                  Click to read what to expect on test day
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 9 OF 10: Get Ready for the Digital SAT (Guide)       */}
          {/* ========================================================= */}
          {step === 8 && (
            <div className="flex flex-col items-center text-center w-full">
              <div className="w-full max-w-[1040px] rounded-2xl border border-[#d1d5db] bg-white p-8 sm:p-11 text-left shadow-none">
                <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4 mb-5">
                  <h1 className="text-[28px] sm:text-[32px] font-normal text-[#1e1e1e] tracking-tight">
                    Get Ready for the Digital SAT
                  </h1>
                  <button
                    type="button"
                    onClick={() => setStep(7)}
                    className="text-[15px] text-[#255cd8] hover:underline font-medium"
                  >
                    ← Video Overview
                  </button>
                </div>

                <div className="bb-scroll h-[460px] sm:h-[490px] overflow-y-auto pr-5 space-y-5 text-[15.5px] sm:text-[16px] text-[#2c2c2c] leading-[1.65] font-normal">
                  <p>If you're taking the test on a weekend, here's how it'll work.</p>
                  <p>Before test day, head to the Practice and Prepare section of the Bluebook homepage and start practicing.</p>
                  <p>You can explore the tools and features of the app and try a few sample questions in the test preview or take a full-length practice test.</p>
                  <p>The week of the test, you'll complete a quick exam setup to check your device and get your admission ticket.</p>
                  <p>You'll need this admission ticket on test day. You can take a picture of it, print it, or email it to yourself.</p>
                  <p>Arrive on time on test day. Check your admission ticket for your arrival time and the address of your test center.</p>
                  <p>Be sure to bring your fully charged device. It'll need to stay on for roughly three hours, so we recommend you bring a power cord or portable charger.</p>
                  <p>The digital SAT has two sections—Reading and Writing, and Math. It should take you just over 2 hours to complete, not including breaks.</p>
                  <p>Each section of the test has two parts called modules, and each module is timed separately.</p>
                  <p>During the test, you'll have access to a set of tools.</p>
                  <p>On all math questions, you'll find a reference sheet and a calculator. You can also bring an approved calculator.</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 10 OF 10: Ready to Begin Exam                        */}
          {/* ========================================================= */}
          {step === 9 && (
            <div className="flex flex-col items-center text-center w-full">
              <div className="w-full max-w-[800px] rounded-2xl border border-[#d1d5db] bg-white p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-[#137333] mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h1 className="text-[36px] font-normal text-[#1e1e1e] tracking-tight">
                  You're Ready to Test!
                </h1>
                <p className="mt-4 text-[17px] text-gray-600">
                  Your device and room check-in are complete. Click Start Exam to enter lockdown mode and begin Section 1 Module 1.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={begin}
                    disabled={busy}
                    className="rounded-full bg-[#fedb00] hover:bg-[#e9c800] px-10 py-3.5 text-[17px] font-bold text-black shadow-sm transition-colors"
                  >
                    {busy ? 'Starting…' : 'Start Exam'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Bottom Protocol Footer - Exactly 1:1 with photo */}
      <footer className="h-[90px] shrink-0 border-t border-[#d1d5db] bg-white flex items-center justify-between px-8 sm:px-12">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border-[1.5px] border-[#222222] bg-white px-8 py-2.5 text-[15px] font-bold text-[#1e1e1e] hover:bg-gray-100 transition-colors"
        >
          Back
        </button>

        {/* Center: Step X of 10 + Progress Bar */}
        <div className="flex flex-col items-center">
          <span className="text-[15px] font-normal text-[#2c2c2c]">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <div className="mt-2 w-[440px] max-w-[85vw] h-[5px] rounded-full bg-[#e8edfb] overflow-hidden">
            <div
              className="h-full bg-[#255cd8] transition-all duration-300 rounded-full"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Next / Start Test Button */}
        {step === 3 ? (
          <button
            type="button"
            onClick={begin}
            disabled={!isStartCodeComplete || busy}
            className={`rounded-full px-8 py-2.5 text-[15px] font-bold text-black transition-all ${
              isStartCodeComplete && !busy
                ? 'bg-[#fedb00] hover:bg-[#e9c800] shadow-none cursor-pointer'
                : 'bg-[#fedb00]/40 text-black/40 cursor-not-allowed'
            }`}
          >
            {busy ? 'Starting…' : 'Start Test'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext()}
            className={`rounded-full px-8 py-2.5 text-[15px] font-bold text-black transition-all ${
              canGoNext()
                ? 'bg-[#fedb00] hover:bg-[#e9c800] shadow-none cursor-pointer'
                : 'bg-[#fedb00]/40 text-black/40 cursor-not-allowed'
            }`}
          >
            {step === TOTAL_STEPS - 1 ? 'Done' : 'Next'}
          </button>
        )}
      </footer>

      {/* Return to Home Modal */}
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-[20px] font-bold text-black">Return to Home?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              Are you sure you want to return to the home screen? Your progress will be saved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExitModal(false)}
                className="rounded-full border border-gray-300 px-5 py-2 text-[14px] font-medium text-gray-700 hover:border-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full bg-black px-5 py-2 text-[14px] font-bold text-white hover:bg-gray-800"
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
            <h2 className="text-[20px] font-bold text-black">Help & Instructions</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
              Your proctor writes the 5-letter room code on the whiteboard at the front of your testing room.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              If you don't see the code or need assistance, please raise your hand to speak with your proctor.
            </p>
            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={() => setHelpModal(false)}
                className="rounded-full bg-black px-5 py-2 text-[14px] font-bold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Chat Relay */}
      <LobbyChatPanel />
    </div>
  )
}
