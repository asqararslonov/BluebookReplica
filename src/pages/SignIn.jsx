import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, Laptop, Ticket } from 'lucide-react'
import { useLobbyStore, FIXED_STUDENT_NAME } from '../store/lobby-store.js'
import { BluebookLogo, BUILD_STAMP } from '../components/lobby/Brand.jsx'
import Modal from '../components/ui/Modal.jsx'
import { runDeviceChecks } from '../components/lobby/StartTestDialog.jsx'

export function nameFromIdentifier(id) {
  const local = String(id || '').split('@')[0]
  const parts = local.split(/[._\-\d]+/).filter(Boolean)
  if (parts.length === 0) return 'Student Name'
  return parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(' ')
}

function Backdrop() {
  // Line-art scene along the bottom, like Bluebook's sign-in screen.
  const s = { fill: 'none', stroke: 'rgba(255,255,255,0.22)', strokeWidth: 3 }
  return (
    <svg className="pointer-events-none absolute bottom-0 left-0 w-full" viewBox="0 0 1920 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect x="60" y="110" width="220" height="150" rx="6" {...s} /><rect x="80" y="130" width="180" height="70" rx="4" {...s} />
      <text x="290" y="215" fill="rgba(255,255,255,0.22)" fontSize="42" fontStyle="italic" fontFamily="serif">x²</text>
      <rect x="360" y="40" width="300" height="220" rx="10" {...s} /><rect x="420" y="80" width="180" height="120" rx="6" {...s} /><rect x="440" y="180" width="140" height="30" rx="6" {...s} />
      <rect x="690" y="60" width="180" height="150" rx="8" {...s} /><line x1="720" y1="100" x2="840" y2="100" {...s} /><line x1="720" y1="140" x2="840" y2="140" {...s} /><line x1="720" y1="180" x2="840" y2="180" {...s} />
      <circle cx="760" cy="255" r="32" {...s} /><rect x="900" y="180" width="60" height="80" rx="6" {...s} />
      <path d="M1000 190 q60 -30 120 0 v70 q-60 -30 -120 0 z" {...s} /><path d="M1180 120 l40 100 l-60 0 z" {...s} />
      <rect x="1280" y="120" width="280" height="140" rx="4" {...s} /><rect x="1330" y="150" width="40" height="70" {...s} /><rect x="1400" y="150" width="40" height="70" {...s} /><rect x="1470" y="150" width="40" height="70" {...s} />
      <path d="M1270 120 l150 -60 l150 60" {...s} /><circle cx="1680" cy="220" r="40" {...s} /><rect x="1740" y="140" width="120" height="120" rx="6" {...s} /><path d="M1740 140 l60 -50 l60 50" {...s} />
    </svg>
  )
}

export default function SignIn() {
  const navigate = useNavigate()
  const { settings, saveSettings, init, loading } = useLobbyStore()
  const [step, setStep] = useState('choice')
  const [ident, setIdent] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [checks, setChecks] = useState(null)

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!loading && settings.signedIn) navigate('/', { replace: true }) }, [loading, settings.signedIn, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await new Promise((r) => setTimeout(r, 900))
    // Student name is always fixed to Jasurbek Tojiquziyev regardless of login
    await saveSettings({ signedIn: true, email: ident, studentName: FIXED_STUDENT_NAME })
    setBusy(false)
    navigate('/', { replace: true })
  }

  const ready = ident.trim().length > 3 && password.length > 0

  return (
    <div className="relative flex h-full flex-col items-center overflow-hidden bg-bb-blue">
      <Backdrop />
      <button type="button" onClick={async () => { setDeviceOpen(true); setChecks(null); setChecks(await runDeviceChecks()) }} className="absolute right-7 top-14 inline-flex items-center gap-2 rounded-full border-[3px] border-white/40 bg-[#b9c3ec] px-7 py-3 text-[18px] font-bold text-bb-black hover:bg-[#c8d0f0]">
        <Laptop size={20} /> Test Your Device
      </button>
      <div className="mt-[120px]"><BluebookLogo color="#fff" size={51} /></div>

      <div className="mt-11 w-[570px] rounded-2xl bg-white px-10 py-9 shadow-xl">
        {step === 'choice' && (
          <>
            <h1 className="text-center text-[36px] font-bold">Sign In</h1>
            <button type="button" onClick={() => setStep('ticket')} className="bb-btn-yellow mt-11 w-full !py-4 !text-[19px]"><Ticket size={20} /> Use a sign-in ticket from your school</button>
            <div className="my-8 flex items-center gap-4 text-[18px] text-bb-gray-500"><span className="h-px flex-1 bg-bb-gray-200" />OR<span className="h-px flex-1 bg-bb-gray-200" /></div>
            <button type="button" onClick={() => setStep('account')} className="bb-btn-outline w-full !py-4 !text-[19px] !font-bold">Sign in with a College Board student account</button>
            <div className="mt-11 flex flex-col items-center gap-5 text-[20px]">
              <button type="button" className="bb-link !font-normal" onClick={() => setStep('ticket')}>I'm an educator</button>
              <button type="button" className="bb-link !font-normal" onClick={() => setDeviceOpen(true)}>Need help signing in?</button>
            </div>
          </>
        )}
        {step !== 'choice' && (
          <form onSubmit={submit}>
            <button type="button" onClick={() => { setStep('choice'); setPassword('') }} className="inline-flex items-center gap-3 text-[20px] font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-bb-gray-300"><ChevronLeft size={18} /></span> Back
            </button>
            <h1 className="mt-9 text-center text-[36px] font-bold leading-tight">{step === 'account' ? 'Sign In with a Student Account' : 'Sign In with a Ticket'}</h1>
            <label className="mt-12 block">
              <span className="mb-2 block text-[20px] font-bold">{step === 'account' ? 'Email Address' : 'Username'}</span>
              <input className="bb-input !py-4" value={ident} onChange={(e) => setIdent(e.target.value)} autoComplete="off" spellCheck={false} />
            </label>
            <label className="mt-6 block">
              <span className="mb-2 block text-[20px] font-bold">Password</span>
              <span className="relative block">
                <input className="bb-input !py-4 !pr-12" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
                <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-bb-gray-600">{show ? <Eye size={22} /> : <EyeOff size={22} />}</button>
              </span>
            </label>
            {step === 'account' && <button type="button" className="bb-link mt-2 !font-normal text-[18px]" onClick={() => setDeviceOpen(true)}>Forgot password?</button>}
            <button type="submit" disabled={!ready || busy} className={`mt-14 w-full rounded-full py-4 text-[20px] font-bold ${ready ? 'bg-bb-yellow text-bb-black hover:bg-bb-yellow-dark' : 'bg-bb-gray-200 text-bb-gray-500'}`}>{busy ? 'Signing in…' : 'Submit'}</button>
            <div className="mt-11 text-center text-[20px]"><button type="button" className="bb-link !font-normal" onClick={() => setDeviceOpen(true)}>Need help signing in?</button></div>
          </form>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-2 right-3 bg-white/90 px-2 py-1 text-[13px] text-bb-gray-600">{BUILD_STAMP}</div>

      <Modal open={deviceOpen} onClose={() => setDeviceOpen(false)} title="Test Your Device">
        <p className="mb-4 text-[16px] text-bb-gray-500">This app signs you in locally: any email or username works, and nothing is sent to a server. Your name is taken from what you type.</p>
        {!checks ? <div className="text-bb-gray-500">Checking your device…</div> : (
          <ul className="divide-y divide-bb-gray-200">
            {checks.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-[15px]"><span className="font-medium">{c.label}</span><span className={c.status === 'ok' ? 'text-bb-green' : c.status === 'warn' ? 'text-amber-600' : 'text-bb-red'}>{c.detail}</span></li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
