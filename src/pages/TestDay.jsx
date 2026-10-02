import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  HelpCircle,
  Home,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import bridge, { isElectron } from '../lib/bridge.js'
import { useLobbyStore } from '../store/lobby-store.js'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import { launchTest } from '../components/lobby/StartTestDialog.jsx'

const TOTAL_STEPS = 6

export default function TestDay() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTestId = searchParams.get('testId')

  const { init, manifest, settings } = useLobbyStore()

  // 0-indexed:
  // 0 -> Step 1 of 6: Confirm Your Personal Information
  // 1 -> Step 2 of 6: SAT Testing Rules
  // 2 -> Step 3 of 6: Review Device Requirements
  // 3 -> Step 4 of 6: Device Lock Check
  // 4 -> Step 5 of 6: Room Code (User's reference screenshot)
  // 5 -> Step 6 of 6: Start Code (Final Unlock & Launch)
  const [step, setStep] = useState(0) // The very first thing to appear!

  // Step 0 (Step 1 of 6): Confirm Personal Information
  const [infoCorrect, setInfoCorrect] = useState(null) // 'yes' | 'no'

  // Step 1 (Step 2 of 6): SAT Testing Rules
  const [rulesAccepted, setRulesAccepted] = useState(false)

  // Step 2 (Step 3 of 6): Review Device Requirements
  const [deviceUse, setDeviceUse] = useState(null) // 'yes' | 'no'

  // Step 3 (Step 4 of 6): Device Lock Check
  const [lockChecked, setLockChecked] = useState(false)
  const [checkingLock, setCheckingLock] = useState(false)

  // Step 4 (Step 5 of 6): Room Code (Letters only)
  const [roomBoxes, setRoomBoxes] = useState(['', '', '', '', ''])
  const roomInputRefs = useRef([])
  const defaultRoomCode = 'ABCDE'

  // Step 5 (Step 6 of 6): Start Code (Numbers only)
  const [startBoxes, setStartBoxes] = useState(['', '', '', '', '', ''])
  const startInputRefs = useRef([])
  const [proctorCode, setProctorCode] = useState('629418')

  // Modals & General
  const [testId, setTestId] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [exitModal, setExitModal] = useState(false)
  const [helpModal, setHelpModal] = useState(false)

  const downloaded = manifest.filter((t) => t.kind !== 'preview' && t.cached)
  const studentDisplayName = settings.studentName || 'Asqar Arslonov'

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

  // Auto-focus inputs on steps 4 and 5
  useEffect(() => {
    if (step === 4) {
      roomInputRefs.current[0]?.focus()
    } else if (step === 5) {
      startInputRefs.current[0]?.focus()
    }
  }, [step])

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
      setStep(5)
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

  const fillAnnouncedStartCode = () => {
    setStartBoxes(proctorCode.split(''))
    setError(null)
    startInputRefs.current[5]?.focus()
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

  // Can the user proceed to the next step?
  const canGoNext = () => {
    switch (step) {
      case 0:
        return infoCorrect === 'yes'
      case 1:
        return rulesAccepted
      case 2:
        return deviceUse === 'yes'
      case 3:
        return lockChecked
      case 4:
        return isRoomCodeComplete
      case 5:
        return isStartCodeComplete && !busy
      default:
        return true
    }
  }

  const handleNext = () => {
    if (step === 5) {
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

      {/* Main Content Area - Centered exactly as in the user's photos */}
      <main className="bb-scroll flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-6">
        <div className="w-full max-w-[760px] text-center flex flex-col items-center justify-center">

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-[15px] font-medium text-red-700">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1 OF 6: Confirm Your Personal Information (Photo 1) */}
          {/* ========================================================= */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[34px] font-normal text-[#1e1e1e] tracking-tight">
                Confirm Your Personal Information
              </h1>

              <div className="mt-8 w-full max-w-[580px] rounded-2xl border border-[#d1d5db] bg-white p-7 text-left shadow-none">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column: First and Last Name */}
                  <div>
                    <div className="text-[15px] font-bold text-black">First and Last Name</div>
                    <div className="mt-1 text-[15px] text-[#2c2c2c]">{studentDisplayName}</div>
                  </div>

                  {/* Right Column: Accommodations */}
                  <div>
                    <div className="text-[15px] font-bold text-black">Accommodations</div>
                    <ul className="mt-1 text-[14px] text-[#2c2c2c] list-disc pl-4 space-y-1">
                      <li>You don't have any approved digital testing accommodations.</li>
                    </ul>
                    <p className="mt-2 text-[13px] text-[#4b5563] leading-relaxed">
                      You may have approved accommodations that don't apply to digital testing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setHelpModal(true)}
                      className="mt-1 block text-[13px] text-[#255cd8] underline hover:text-blue-800 text-left"
                    >
                      Learn more about accommodations
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-6 border-t border-[#e5e7eb]" />

                {/* Radio selection */}
                <div className="text-center">
                  <div className="text-[15px] font-bold text-black mb-3">
                    Is this information correct?
                  </div>
                  <div className="flex justify-center gap-10">
                    <label className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-black">
                      <input
                        type="radio"
                        name="infoCorrect"
                        checked={infoCorrect === 'yes'}
                        onChange={() => setInfoCorrect('yes')}
                        className="w-5 h-5 accent-black cursor-pointer"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-black">
                      <input
                        type="radio"
                        name="infoCorrect"
                        checked={infoCorrect === 'no'}
                        onChange={() => setInfoCorrect('no')}
                        className="w-5 h-5 accent-black cursor-pointer"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2 OF 6: SAT Testing Rules (Photos 2 & 3)             */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[34px] font-normal text-[#1e1e1e] tracking-tight">
                SAT Testing Rules
              </h1>

              <div className="mt-8 w-full max-w-[620px] rounded-2xl border border-[#d1d5db] bg-white p-7 text-left shadow-none">
                <div className="max-h-[350px] overflow-y-auto pr-3 bb-scroll text-[14px] text-[#2c2c2c] leading-relaxed space-y-4">
                  <div>
                    <h2 className="font-bold text-black text-[15px] mb-2">Introduction</h2>
                    <p className="mb-3">
                      These Testing Rules ("Rules") are a legal contract between you and College Board. They set forth important rules you must follow related to taking the SAT®, referred to as a "Test" or "SAT" in these Rules. Please read them carefully. If you register for a Test on behalf of another (for example, if you are a parent or legal guardian of the test taker), these Rules govern both you and the test taker (collectively, "you").
                    </p>
                    <p className="mb-3">
                      <b>IMPORTANT:</b> Any attempt to gain an unfair advantage on the Test—including through cyber or digital methods, disabling test security features, or using unauthorized smart devices—is strictly prohibited and will result in disciplinary measures and consequences, including score cancellation and other sanctions. College Board uses advanced methods to detect and investigate this behavior.
                    </p>
                    <p>
                      <b>NOTE:</b> See Section 10 for how disagreements between you and College Board will be handled.
                    </p>
                  </div>

                  <div>
                    <h2 className="font-bold text-black text-[15px] mb-2">Section 1. Taking the Test</h2>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The SAT is a digital test. You will take the Test on an app called Bluebook™.</li>
                      <li>Your testing device must meet College Board requirements. A list of requirements can be found at bluebook.collegeboard.org.</li>
                      <li>You will not be permitted to leave the testing room until the Test is concluded for all test takers.</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="font-bold text-black text-[15px] mb-2">Section 16. Accessibility of These Rules</h2>
                    <p>
                      If you have difficulty accessing these Rules, including our policies and requirements, please contact College Board customer service at 866-630-9305 (+1-212-713-8000 internationally) or satsuite.collegeboard.org/contact-us in advance of registering for or taking the Test. We will be happy to provide these Rules in an alternative format or assist you in some other manner as reasonably necessary to enable you to access these Rules.
                    </p>
                  </div>
                </div>

                {/* Checkbox at bottom of card */}
                <div className="mt-5 border-t border-[#e5e7eb] pt-4">
                  <label className="flex items-center gap-3 cursor-pointer text-[14px] font-medium text-black">
                    <input
                      type="checkbox"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-400 accent-black cursor-pointer"
                    />
                    <span>I have read and I accept these rules.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3 OF 6: Review Device Requirements (Photo 4)         */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[34px] font-normal text-[#1e1e1e] tracking-tight">
                Review Device Requirements
              </h1>

              <div className="mt-8 w-full max-w-[620px] rounded-2xl border border-[#d1d5db] bg-white p-7 text-left text-[14px] text-[#2c2c2c] leading-relaxed shadow-none">
                <p className="mb-4">
                  You can run Bluebook on a Windows or Mac device, an iPad, or a school-managed Chromebook.
                </p>

                <p className="font-bold text-black mb-1">Your device:</p>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  <li>
                    Must stay on for roughly 3 hours. We recommend you bring a power cord or portable charger, but we can't guarantee you'll have access to an outlet.
                  </li>
                  <li>Must be able to connect to Wi-Fi.</li>
                </ul>

                <p className="mb-1">
                  <b>Windows devices</b> must have at least 1 GB of free space available.
                </p>
                <p className="mb-1">
                  <b>Mac devices</b> must have at least 1 GB of free space available.
                </p>
                <p className="mb-1">
                  <b>iPads</b> must have at least 250 MB of free space available.
                </p>
                <p className="mb-5">
                  <b>School-managed Chromebooks</b> must have at least 1 GB of free space available.
                </p>

                {/* Divider */}
                <div className="my-5 border-t border-[#e5e7eb]" />

                {/* Radio Question */}
                <div className="text-center">
                  <div className="text-[15px] font-bold text-black mb-3">
                    Is this the device you'll use on test day?
                  </div>
                  <div className="flex justify-center gap-10">
                    <label className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-black">
                      <input
                        type="radio"
                        name="deviceUse"
                        checked={deviceUse === 'yes'}
                        onChange={() => setDeviceUse('yes')}
                        className="w-5 h-5 accent-black cursor-pointer"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-black">
                      <input
                        type="radio"
                        name="deviceUse"
                        checked={deviceUse === 'no'}
                        onChange={() => setDeviceUse('no')}
                        className="w-5 h-5 accent-black cursor-pointer"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4 OF 6: Device Lock Check (Photo 5)                  */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[34px] font-normal text-[#1e1e1e] tracking-tight">
                Device Lock Check
              </h1>

              <div className="mt-8 w-full max-w-[560px] rounded-2xl border border-[#d1d5db] bg-white p-8 text-center shadow-none">
                <p className="text-[15px] text-[#2c2c2c] mb-2 leading-relaxed">
                  On test day, Bluebook will go full-screen and you won't be able to access other apps or websites.
                </p>

                <p className="text-[15px] text-[#2c2c2c] mb-6 leading-relaxed">
                  Select <span className="font-bold">Check My Device</span> now to make sure this is working.
                </p>

                <button
                  type="button"
                  onClick={handleCheckDevice}
                  disabled={checkingLock}
                  className="rounded-full bg-[#255cd8] hover:bg-[#1d4bb8] text-white px-8 py-2.5 text-[15px] font-semibold transition-colors shadow-sm"
                >
                  {checkingLock ? 'Checking…' : 'Check My Device'}
                </button>

                {lockChecked && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-[15px] font-semibold text-[#137333]">
                    <CheckCircle2 size={19} className="fill-[#137333] text-white" />
                    <span>Device lock check successful!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 5 OF 6: Room Code (User's First Reference Photo)     */}
          {/* ========================================================= */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[40px] font-normal sm:font-medium text-[#1e1e1e] tracking-tight">
                Room Code
              </h1>

              <p className="mt-4 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                Enter your room code now to complete check-in.
              </p>

              <p className="mt-3 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                The room code contains <span className="font-bold">letters only</span>.
              </p>

              {/* Success message (shown when 5 letters entered) */}
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

              {/* Subtle click-to-fill helper for test simulation */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-gray-400">
                <span>Code on board:</span>
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

          {/* ========================================================= */}
          {/* STEP 6 OF 6: Start Code (Final Unlock & Launch)           */}
          {/* ========================================================= */}
          {step === 5 && (
            <div className="flex flex-col items-center text-center w-full">
              <h1 className="text-[40px] font-normal sm:font-medium text-[#1e1e1e] tracking-tight">
                Start Code
              </h1>

              <p className="mt-4 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                Enter the start code provided by your proctor to begin testing.
              </p>

              <p className="mt-3 text-[19px] sm:text-[20px] text-[#2c2c2c]">
                The start code contains <span className="font-bold">numbers only</span>.
              </p>

              {/* Success message when 6 digits entered */}
              {isStartCodeComplete ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-[16px] font-semibold text-[#137333]">
                  <CheckCircle2 size={19} className="fill-[#137333] text-white" />
                  <span>Success! Click the Start Test button to enter lockdown mode.</span>
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

              {/* Proctor code fill helper */}
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
            </div>
          )}

        </div>
      </main>

      {/* Bottom Protocol Footer - Exact match to user's photos */}
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

        {/* Center: Step X of 6 + Progress Bar */}
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
          ) : step === 5 ? (
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
            <h2 className="text-[20px] font-bold text-black">Help & Instructions</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
              Follow the instructions on each screen to verify your information and configure your device for test day.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              If you have any questions or difficulties, raise your hand to speak with your proctor.
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
