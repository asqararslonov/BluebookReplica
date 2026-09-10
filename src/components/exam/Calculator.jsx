import { useEffect, useRef, useState } from 'react'
import { useExamStore } from '../../store/exam-store.js'
import FloatingWindow from './FloatingWindow.jsx'

export const DESMOS_URL = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
let desmosPromise = null

export function loadDesmos() {
  if (window.Desmos) return Promise.resolve(window.Desmos)
  if (!desmosPromise) {
    desmosPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = DESMOS_URL
      script.async = true
      script.onload = () => (window.Desmos ? resolve(window.Desmos) : reject(new Error('Desmos did not initialize')))
      script.onerror = () => { desmosPromise = null; script.remove(); reject(new Error('Unable to load the Desmos calculator. Check your internet connection.')) }
      document.head.appendChild(script)
    })
  }
  return desmosPromise
}

export default function Calculator() {
  const setOpen = useExamStore((s) => s.setCalculatorOpen)
  const calcState = useExamStore((s) => s.currentModuleState()?.calcState)
  const saveCalcState = useExamStore((s) => s.saveCalcState)
  const hostRef = useRef(null)
  const calcRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let calc = null
    setStatus('loading')
    loadDesmos()
      .then((Desmos) => {
        if (cancelled || !hostRef.current) return
        calc = Desmos.GraphingCalculator(hostRef.current, {
          keypad: true,
          expressions: true,
          settingsMenu: false,
          zoomButtons: true,
          expressionsTopbar: true,
          border: false,
          images: false,
          folders: false,
          notes: false,
          links: false,
          qwertyKeyboard: true,
        })
        if (calcState) { try { calc.setState(calcState) } catch { /* ignore corrupted state */ } }
        calcRef.current = calc
        setStatus('ready')
      })
      .catch((err) => { if (!cancelled) { setError(err.message); setStatus('error') } })
    return () => {
      cancelled = true
      if (calc) {
        try { saveCalcState(calc.getState()) } catch { /* ignore */ }
        calc.destroy()
      }
      calcRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  useEffect(() => {
    if (!hostRef.current) return
    const ro = new ResizeObserver(() => calcRef.current?.resize())
    ro.observe(hostRef.current)
    return () => ro.disconnect()
  }, [])

  const initial = { x: Math.max(16, window.innerWidth - 540), y: 104, w: 500, h: Math.min(600, window.innerHeight - 200) }
  return (
    <FloatingWindow title="Calculator" initial={initial} minWidth={360} minHeight={320} expandedWidth={860} onClose={() => setOpen(false)}>
      <div ref={hostRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white"><div className="bb-spinner" /><p className="text-sm text-bb-gray-500">Loading Desmos…</p></div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
          <p className="text-sm text-bb-gray-500">{error}</p>
          <button type="button" className="bb-btn-outline !py-1.5 !text-[14px]" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      )}
    </FloatingWindow>
  )
}
