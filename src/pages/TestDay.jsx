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
  ArrowRight,
} from 'lucide-react'
import bridge, { isElectron } from '../lib/bridge.js'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../store/lobby-store.js'
import { normalizeTest } from '../lib/schema.js'
import { listPresets } from '../lib/session.js'
import { launchTest } from '../components/lobby/StartTestDialog.jsx'

const TOTAL_STEPS = 6

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
  const initialMode = searchParams.get('mode') === 'checkin' ? 'checkin' : 'setup'
  const initialStep = Math.min(5, Math.max(0, parseInt(searchParams.get('step') || '0', 10)))
  const initialTestId = searchParams.get('testId')

  const { init, manifest, settings, saveSettings } = useLobbyStore()

  // Mode: 'setup' (Steps 1–6) or 'checkin' (Room Code & Start Code)
  const [mode, setMode] = useState(initialMode)

  // ==========================================
  // EXAM SETUP FLOW (Steps 1 to 6)
  // Step 0: Confirm Your Personal Information (1 of 6) - ALWAYS FIRST
  // Step 1: SAT Testing Rules (2 of 6)
  // Step 2: Review Device Requirements (3 of 6)
  // Step 3: Device Lock Check (4 of 6)
  // Step 4: Your Admission Ticket (5 of 6)
  // Step 5: Get Ready for Test Day (6 of 6) - with video preview & full guide
  // ==========================================
  const [step, setStep] = useState(initialStep)

  // Step 1: Confirm Personal Information
  const [infoCorrect, setInfoCorrect] = useState(null) // 'yes' | 'no'

  // Step 2: SAT Testing Rules
  const [rulesAccepted, setRulesAccepted] = useState(false)

  // Step 3: Review Device Requirements
  const [deviceUse, setDeviceUse] = useState(null) // 'yes' | 'no'

  // Step 4: Device Lock Check
  const [lockChecked, setLockChecked] = useState(false)
  const [checkingLock, setCheckingLock] = useState(false)

  // Step 5: Your Admission Ticket
  const [ticketPrinted, setTicketPrinted] = useState(false)

  // Step 6: Get Ready for Test Day
  // 'video': laptop illustration with SAT® and Play button (media_1790971838997.jpg)
  // 'guide': full verbatim guide text (media_1790971817860.jpg)
  const [step6SubView, setStep6SubView] = useState('video')
  const [setupFinishedModal, setSetupFinishedModal] = useState(false)

  // ==========================================
  // TEST DAY CHECK-IN FLOW (Room & Start Code)
  // checkinStep 0: Room Code (letters only, 5 boxes)
  // checkinStep 1: Start Code (numbers only, 6 boxes)
  // ==========================================
  const [checkinStep, setCheckinStep] = useState(0)

  // Room Code (Letters only, 5 boxes)
  const [roomBoxes, setRoomBoxes] = useState(['', '', '', '', ''])
  const roomInputRefs = useRef([])
  const defaultRoomCode = 'ABCDE'

  // Start Code (Numbers only, 6 boxes grouped 3+3)
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

  // Auto-focus inputs on checkin steps
  useEffect(() => {
    if (mode === 'checkin') {
      if (checkinStep === 0) {
        roomInputRefs.current[0]?.focus()
      } else if (checkinStep === 1) {
        startInputRefs.current[0]?.focus()
      }
    }
  }, [mode, checkinStep])

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
      setCheckinStep(1)
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

  // Finish Exam Setup
  const handleFinishSetup = async () => {
    try {
      await saveSettings({
        registration: {
          ...settings.registration,
          setupComplete: true,
        },
      })
    } catch {
      // ignore
    }
    setSetupFinishedModal(true)
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

  // Can the user proceed in Setup Mode?
  const canGoNextSetup = () => {
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
        return true
      case 5:
        return true
      default:
        return true
    }
  }

  const handleNextSetup = () => {
    if (step === 5) {
      handleFinishSetup()
    } else {
      setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
    }
  }

  const handleBackSetup = () => {
    if (step === 5 && step6SubView === 'guide') {
      setStep6SubView('video')
      return
    }
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

        {/* Mode Switcher Shortcut */}
        <div className="flex items-center gap-6">
          {mode === 'setup' ? (
            <button
              type="button"
              onClick={() => {
                setMode('checkin')
                setCheckinStep(0)
              }}
              className="text-[13px] font-medium text-[#255cd8] hover:underline"
            >
              Test Day Check-In (Room Code) →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('setup')
                setStep(0)
              }}
              className="text-[13px] font-medium text-[#255cd8] hover:underline"
            >
              ← Exam Setup (6 Steps)
            </button>
          )}

          <button
            type="button"
            onClick={() => setExitModal(true)}
            className="flex items-center gap-2 text-[15px] font-medium text-[#2c2c2c] hover:text-black transition-colors"
          >
            <span>Return to Home</span>
            <Home size={20} className="text-[#2c2c2c]" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="bb-scroll flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 sm:px-12 py-6">
        <div className="w-full max-w-[1120px] text-center flex flex-col items-center justify-center">

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-[15px] font-medium text-red-700">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* ================== EXAM SETUP FLOW ====================== */}
          {/* ========================================================= */}

          {mode === 'setup' && (
            <>
              {/* STEP 1 OF 6: Confirm Your Personal Information (Photo 1) */}
              {step === 0 && (
                <div className="flex flex-col items-center text-center w-full">
                  <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                    Confirm Your Personal Information
                  </h1>

                  <div className="mt-8 w-full max-w-[1000px] rounded-2xl border border-[#d1d5db] bg-white p-9 sm:p-12 text-left shadow-none">
                    <div className="grid grid-cols-2 gap-8">
                      {/* Left Column: First and Last Name */}
                      <div>
                        <div className="text-[17px] font-bold text-black">First and Last Name</div>
                        <div className="mt-1.5 text-[17px] text-[#2c2c2c]">{studentDisplayName}</div>
                      </div>

                      {/* Right Column: Accommodations */}
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
                            className="w-4 h-4 accent-black text-black cursor-pointer"
                          />
                          <span>Yes</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-black">
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

                      {infoCorrect === 'no' && (
                        <div className="mt-4 text-[13px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                          If your personal information is incorrect, please raise your hand to speak with your proctor.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 OF 6: SAT Testing Rules (Photos 2 & 3) */}
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
                          If you register for a Test on behalf of another (for example, if you are a parent
                          or legal guardian of the test taker), these Rules govern both you and the test taker
                          (collectively, "you").
                        </p>
                      </div>

                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-[14.5px] text-[#78350f] leading-relaxed">
                        <span className="font-bold">IMPORTANT:</span> Any attempt to gain an unfair advantage
                        on the Test—including through cyber or digital methods, disabling test security features,
                        or using unauthorized smart devices—is strictly prohibited and will result in disciplinary
                        measures and consequences, including score cancellation and other sanctions. College Board
                        uses advanced methods to detect and investigate this behavior.
                      </div>

                      <p className="text-[14px] text-[#4b5563]">
                        <span className="font-bold">NOTE:</span> See Section 10 for how disagreements between you
                        and College Board will be handled.
                      </p>

                      <div>
                        <h2 className="font-bold text-[17px] text-black">Section 1. Taking the Test</h2>
                        <ul className="mt-2 list-disc pl-5 space-y-1.5">
                          <li>The SAT is a digital test. You will take the Test on an app called Bluebook™.</li>
                          <li>Your testing device must meet College Board requirements. A list of approved devices can be found at bluebook.collegeboard.org.</li>
                          <li>You must keep your device locked down in the Bluebook app throughout testing.</li>
                          <li>You may not exit the app or attempt to access other applications or the internet during the exam.</li>
                        </ul>
                      </div>

                      <div>
                        <h2 className="font-bold text-[17px] text-black">Section 10. Sanctioned Persons & Legal Compliance</h2>
                        <p className="mt-1.5 text-[14.5px]">
                          College Board complies with U.S. economic sanctions, laws, and regulations and is prohibited
                          from providing testing services to, or accepting registrations from, persons residing in
                          certain areas or designated by the U.S. government as Specially Designated Nationals and Blocked
                          Persons (collectively, "Sanctioned Persons"), unless specifically licensed or otherwise authorized
                          by the U.S. government.
                        </p>
                      </div>

                      <div>
                        <h2 className="font-bold text-[17px] text-black">Section 16. Accessibility of These Rules</h2>
                        <p className="mt-1.5">
                          If you have difficulty accessing these Rules, including our policies and requirements,
                          please contact College Board customer service at 866-630-9305 (+1-212-713-8000 internationally)
                          or satsuite.collegeboard.org/contact-us in advance of registering for or taking the Test.
                          We will be happy to provide these Rules in an alternative format or assist you in some other
                          manner as reasonably necessary to enable you to access these Rules.
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

              {/* STEP 3 OF 6: Review Device Requirements (Photo 4) */}
              {step === 2 && (
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
                        <li>
                          Must stay on for roughly 3 hours. We recommend you bring a power cord or portable charger,
                          but we can't guarantee you'll have access to an outlet.
                        </li>
                        <li>Must be able to connect to Wi-Fi.</li>
                      </ul>
                    </div>

                    <div className="mt-5 space-y-1.5 text-[14px] text-[#4b5563]">
                      <div>Windows devices must have at least 1 GB of free space available.</div>
                      <div>Mac devices must have at least 1 GB of free space available.</div>
                      <div>iPads must have at least 250 MB of free space available.</div>
                      <div>School-managed Chromebooks must have at least 1 GB of free space available.</div>
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

                      {deviceUse === 'no' && (
                        <div className="mt-4 text-[14px] text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                          Please complete setup on the specific device you plan to bring to your test center.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 OF 6: Device Lock Check (Photo 5) */}
              {step === 3 && (
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

              {/* STEP 5 OF 6: Your Admission Ticket */}
              {step === 4 && (
                <div className="flex flex-col items-center text-center w-full">
                  <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                    Your Admission Ticket
                  </h1>
                  <p className="mt-2 text-[16px] text-[#4b5563]">
                    You'll need this ticket on test day. Print it or take a picture of it on your phone.
                  </p>

                  <div className="mt-7 w-full max-w-[1000px] rounded-2xl border-2 border-dashed border-[#8a8a8a] bg-white p-9 sm:p-12 text-left shadow-none">
                    {/* Top Ticket Bar */}
                    <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4 mb-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[24px] tracking-tight text-[#0077c8]">SAT<span className="text-[14px] align-super">®</span></span>
                        <span className="text-[17px] font-semibold text-gray-500">| Admission Ticket</span>
                      </div>
                      <span className="text-[13px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-3 py-1 rounded-full">
                        Confirmed
                      </span>
                    </div>

                    {/* Ticket Details Grid */}
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
                        <span className="font-semibold text-[#1e1e1e] text-[16px]">{reg.arrival || '7:45 a.m.'} (Doors close {reg.doorsClose || '8:00 a.m.'})</span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[13px] font-medium">Test Center</span>
                        <span className="font-semibold text-[#1e1e1e] text-[16px]">{reg.center?.name || 'New Uzbekistan University'}</span>
                        <div className="text-[14px] text-gray-600 font-normal mt-0.5">
                          {(reg.center?.lines || ['MOVAROUNNAHR 1 STREET', 'MIRZO ULUGBEK DISTRICT', 'TASHKENT CITY, UZ']).join(', ')}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[13px] font-medium">Accommodations</span>
                        <span className="text-gray-700 text-[14px]">
                          {reg.accommodations || 'You have no approved digital testing accommodations.'}
                        </span>
                      </div>
                    </div>

                    {/* Barcode Simulation */}
                    <div className="mt-6 pt-5 border-t border-[#e5e7eb] flex flex-col items-center">
                      <div className="flex h-12 items-end gap-[3px]" aria-hidden="true">
                        {Array.from({ length: 64 }).map((_, i) => (
                          <span
                            key={i}
                            className="bg-black"
                            style={{
                              width: (i * 7) % 4 + 1,
                              height: `${70 + ((i * 13) % 30)}%`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-1.5 font-mono text-[12px] tracking-[0.25em] text-gray-500">
                        *1142658539-SAT-2026*
                      </div>
                    </div>
                  </div>

                  {/* Ticket Actions */}
                  <div className="mt-6 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        window.print()
                        setTicketPrinted(true)
                      }}
                      className="flex items-center gap-2 rounded-full border border-black bg-white px-6 py-2.5 text-[15px] font-medium text-black hover:bg-gray-50 transition-colors"
                    >
                      <Printer size={17} />
                      <span>Print Ticket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTicketPrinted(true)}
                      className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2.5 text-[15px] font-medium text-gray-700 hover:border-black transition-colors"
                    >
                      <Check size={17} className={ticketPrinted ? 'text-green-600' : 'text-gray-400'} />
                      <span>{ticketPrinted ? 'Ticket Saved' : 'Save as PDF'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 6 OF 6: Get Ready for Test Day (Photos 6 & 7)        */}
              {/* ========================================================= */}
              {step === 5 && (
                <div className="flex flex-col items-center text-center w-full">
                  {/* View A: Video / Laptop Illustration View (media_1790971838997.jpg) */}
                  {step6SubView === 'video' ? (
                    <div className="flex flex-col items-center text-center w-full">
                      <h1 className="text-[36px] sm:text-[40px] font-normal text-[#1e1e1e] tracking-tight">
                        Get Ready for Test Day
                      </h1>

                      <div
                        onClick={() => setStep6SubView('guide')}
                        className="group mt-8 w-full max-w-[960px] rounded-2xl border border-[#d1d5db] bg-white p-12 sm:p-16 text-center shadow-none cursor-pointer hover:border-[#255cd8] transition-all"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setStep6SubView('guide')}
                      >
                        {/* Authentic Bluebook Laptop Illustration */}
                        <div className="flex justify-center">
                          <div className="w-[340px] sm:w-[400px]">
                            {/* Laptop Screen Frame */}
                            <div className="relative h-[210px] sm:h-[230px] rounded-t-xl border-[4px] border-[#2b2b2b] bg-white flex flex-col items-center justify-center shadow-sm">
                              {/* Bluebook SAT® Logo on Screen */}
                              <div className="text-[40px] sm:text-[44px] font-bold tracking-tight text-[#0077c8] select-none">
                                SAT<span className="text-[18px] align-super">®</span>
                              </div>

                              {/* Circular Blue Play Button */}
                              <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0056b3] text-white shadow-md group-hover:scale-110 transition-transform">
                                <Play size={26} className="fill-white translate-x-0.5" />
                              </div>
                            </div>

                            {/* Laptop Base deck */}
                            <div className="relative h-[15px] rounded-b-lg bg-[#d1d5db] border-x border-b border-[#9ca3af] flex items-center justify-center">
                              {/* Trackpad notch */}
                              <div className="h-[4px] w-14 rounded-b bg-[#9ca3af]" />
                            </div>
                          </div>
                        </div>

                        {/* Title Under Laptop */}
                        <h2 className="mt-8 text-[26px] sm:text-[28px] font-bold text-[#1e1e1e] group-hover:text-[#255cd8] transition-colors">
                          Get Ready for the Digital SAT
                        </h2>
                        <p className="mt-2 text-[15px] text-gray-500 font-normal">
                          Click to watch overview or read what to expect on test day
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* View B: Full Verbatim Guide View (media_1790971817860.jpg) */
                    <div className="flex flex-col items-center text-center w-full">
                      <div className="w-full max-w-[1040px] rounded-2xl border border-[#d1d5db] bg-white p-8 sm:p-11 text-left shadow-none">
                        {/* Top bar with back to overview toggle */}
                        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4 mb-5">
                          <h1 className="text-[28px] sm:text-[32px] font-normal text-[#1e1e1e] tracking-tight">
                            Get Ready for the Digital SAT
                          </h1>
                          <button
                            type="button"
                            onClick={() => setStep6SubView('video')}
                            className="text-[15px] text-[#255cd8] hover:underline font-medium"
                          >
                            ← Video Overview
                          </button>
                        </div>

                        {/* Scrollable exact verbatim text container */}
                        <div className="bb-scroll h-[460px] sm:h-[490px] overflow-y-auto pr-5 space-y-5 text-[15.5px] sm:text-[16px] text-[#2c2c2c] leading-[1.65] font-normal">
                          <p>
                            If you're taking the test on a weekend, here's how it'll work.
                          </p>

                          <p>
                            Before test day, head to the Practice and Prepare section of the Bluebook homepage and start practicing.
                          </p>

                          <p>
                            You can explore the tools and features of the app and try a few sample questions in the test preview or take a full-length practice test.
                          </p>

                          <p>
                            The week of the test, you'll complete a quick exam setup to check your device and get your admission ticket.
                          </p>

                          <p>
                            You'll need this admission ticket on test day. You can take a picture of it, print it, or email it to yourself.
                          </p>

                          <p>
                            Arrive on time on test day. Check your admission ticket for your arrival time and the address of your test center.
                          </p>

                          <p>
                            Be sure to bring your fully charged device. It'll need to stay on for roughly three hours, so we recommend you bring a power cord or portable charger. You'll also need your admission ticket, a valid photo ID, and a pencil or pen. Scratch paper will be provided.
                          </p>

                          <p>
                            The digital SAT has two sections—Reading and Writing, and Math. It should take you just over 2 hours to complete, not including breaks.
                          </p>

                          <p>
                            Each section of the test has two parts called modules, and each module is timed separately. You can move back and forth between questions in a module and review your answers until time expires. There will be a break between sections.
                          </p>

                          <p>
                            During the test, you'll have access to a set of tools.
                          </p>

                          <p>
                            On all math questions, you'll find a reference sheet and a calculator. You can also bring an approved calculator.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* ================ TEST DAY CHECK-IN FLOW ================= */}
          {/* ========================================================= */}

          {mode === 'checkin' && (
            <>
              {/* CHECK-IN STEP 1: Room Code (5 letters) */}
              {checkinStep === 0 && (
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

                  {/* Success message when 5 letters entered */}
                  {isRoomCodeComplete ? (
                    <div className="mt-5 flex items-center justify-center gap-2 text-[16px] font-semibold text-[#137333]">
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

                  {/* Click-to-fill helper */}
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

              {/* CHECK-IN STEP 2: Start Code (6 digits) */}
              {checkinStep === 1 && (
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
            </>
          )}

        </div>
      </main>

      {/* Bottom Protocol Footer */}
      <footer className="h-[92px] shrink-0 border-t border-[#d1d5db] bg-white flex items-center justify-between px-8 sm:px-12">
        {mode === 'setup' ? (
          <>
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBackSetup}
              className="rounded-full border border-black bg-white px-7 py-2.5 text-[15px] font-bold text-black hover:bg-gray-100 transition-colors"
            >
              Back
            </button>

            {/* Center: Step X of 6 + Progress Bar */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[15px] font-normal text-[#2c2c2c]">
                Step {step + 1} of {TOTAL_STEPS}
              </span>
              <div className="w-[280px] sm:w-[360px] h-[5px] rounded-full bg-[#e8edfb] overflow-hidden">
                <div
                  className="h-full bg-[#255cd8] transition-all duration-300 rounded-full"
                  style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>

            {/* Next / Done Button (vibrant yellow pill #fedb00) */}
            <button
              type="button"
              onClick={handleNextSetup}
              disabled={!canGoNextSetup()}
              className={`rounded-full px-8 py-2.5 text-[15px] font-bold text-black transition-all ${
                canGoNextSetup()
                  ? 'bg-[#fedb00] hover:bg-[#e9c800] shadow-sm cursor-pointer'
                  : 'bg-[#fedb00]/40 text-black/40 cursor-not-allowed'
              }`}
            >
              {step === 5 ? 'Done' : 'Next'}
            </button>
          </>
        ) : (
          <>
            {/* Check-In Mode Footer */}
            <button
              type="button"
              onClick={() => {
                if (checkinStep === 0) {
                  setExitModal(true)
                } else {
                  setCheckinStep(0)
                }
              }}
              className="rounded-full border border-black bg-white px-7 py-2.5 text-[15px] font-bold text-black hover:bg-gray-100 transition-colors"
            >
              Back
            </button>

            {/* Center Indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[15px] font-normal text-[#2c2c2c]">
                Check-In: Step {checkinStep + 1} of 2
              </span>
              <div className="w-[280px] sm:w-[360px] h-[5px] rounded-full bg-[#e8edfb] overflow-hidden">
                <div
                  className="h-full bg-[#255cd8] transition-all duration-300 rounded-full"
                  style={{ width: checkinStep === 0 ? '50%' : '100%' }}
                />
              </div>
            </div>

            {/* Next / Start Test Button */}
            {checkinStep === 0 ? (
              <button
                type="button"
                onClick={() => setCheckinStep(1)}
                disabled={!isRoomCodeComplete}
                className={`rounded-full px-8 py-2.5 text-[15px] font-bold text-black transition-all ${
                  isRoomCodeComplete
                    ? 'bg-[#fedb00] hover:bg-[#e9c800] shadow-sm cursor-pointer'
                    : 'bg-[#fedb00]/40 text-black/40 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={begin}
                disabled={!isStartCodeComplete || busy}
                className={`rounded-full px-8 py-2.5 text-[15px] font-bold text-black transition-all ${
                  isStartCodeComplete && !busy
                    ? 'bg-[#fedb00] hover:bg-[#e9c800] shadow-sm cursor-pointer'
                    : 'bg-[#fedb00]/40 text-black/40 cursor-not-allowed'
                }`}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="bb-spinner !h-4 !w-4 !border-2" />
                    <span>Starting…</span>
                  </span>
                ) : (
                  <span>Start Test</span>
                )}
              </button>
            )}
          </>
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

      {/* Setup Finished Modal */}
      {setupFinishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-[#137333] mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-[22px] font-bold text-black">Exam Setup Is Complete!</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
              Your device is verified and your exam is stored on this device. Arrive at your test center at {reg.arrival || '7:45 a.m.'} on test day.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full rounded-full bg-[#fedb00] hover:bg-[#e9c800] py-3 text-[15px] font-bold text-black shadow-sm transition-colors"
              >
                Return to Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupFinishedModal(false)
                  setMode('checkin')
                  setCheckinStep(0)
                }}
                className="w-full rounded-full border border-gray-300 hover:border-black py-2.5 text-[14px] font-medium text-gray-700 transition-colors"
              >
                Proceed to Test Day Check-In (Room Code)
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
                onClick={() => setHelpModal(false)}
                className="rounded-full bg-black px-5 py-2 text-[14px] font-bold text-white hover:bg-gray-800"
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
