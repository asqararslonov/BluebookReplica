import { useEffect, useState } from 'react'
import bridge from '../../lib/bridge.js'
import { useExamStore } from '../../store/exam-store.js'
import ExamHeader from './ExamHeader.jsx'
import Footer from './Footer.jsx'
import NavFlyout from './NavFlyout.jsx'
import Workspace from './Workspace.jsx'
import ReviewScreen from './ReviewScreen.jsx'
import BreakScreen from './BreakScreen.jsx'
import TransitionScreen from './TransitionScreen.jsx'
import StartScreen from './StartScreen.jsx'
import PreviewIntro from './PreviewIntro.jsx'
import Calculator from './Calculator.jsx'
import ReferenceSheet from './ReferenceSheet.jsx'
import AnnotationPanel from './AnnotationPanel.jsx'
import { ExamDialogs, UnscheduledBreakOverlay, LineReader } from './Dialogs.jsx'
import FinishFlow from './FinishFlow.jsx'
import MentorChat from './MentorChat.jsx'
import { useChatStore } from '../../store/chat-store.js'
import { resolveChatBase, newChatCode } from '../../lib/chat-client.js'

function useTimer() {
  const tick = useExamStore((s) => s.tick)
  useEffect(() => {
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [tick])
}

function useMentorChat() {
  const session = useExamStore((s) => s.session)
  const ensureChatCode = useExamStore((s) => s.ensureChatCode)
  const configure = useChatStore((s) => s.configure)
  const poll = useChatStore((s) => s.poll)
  const open = useChatStore((s) => s.open)
  const toggle = useChatStore((s) => s.toggle)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let alive = true
    bridge.store.get('settings').then(async (settings) => {
      if (!alive || !session) return
      const on = settings?.chat?.enabled !== false
      const base = on ? resolveChatBase(settings) : null
      // One stable code per student/device, shared by the dashboard chat and every test.
      let code = null
      if (base) {
        code = settings?.chatCode || session.chatCode || newChatCode()
        if (!settings?.chatCode) await bridge.store.set('settings', { ...(settings || {}), chatCode: code })
        ensureChatCode(() => code)
      }
      configure({ base, code, name: session.studentName })
      setEnabled(!!(base && code))
    })
    return () => { alive = false }
  }, [session?.id, session?.studentName, ensureChatCode, configure])

  useEffect(() => {
    if (!enabled) return
    poll()
    const id = setInterval(poll, open ? 2500 : 6000)
    return () => clearInterval(id)
  }, [enabled, open, poll])

  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      if (e.key !== 'j' && e.key !== 'J') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      const phase = useExamStore.getState().session?.phase
      if (!['module', 'break'].includes(phase)) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, toggle])

  return enabled
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      const st = useExamStore.getState()
      const session = st.session
      if (!session || session.phase !== 'module' || st.paused) return
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
      const mod = e.metaKey || e.ctrlKey
      if (e.key === 'Escape') {
        st.setNavOpen(false); st.setDirectionsOpen(false); st.setAnnotationPanel(null); st.setDialog(null)
        return
      }
      if (typing) return
      const section = st.currentSection()
      if (mod && e.key === 'ArrowRight') { e.preventDefault(); st.next() }
      else if (mod && e.key === 'ArrowLeft') { e.preventDefault(); st.back() }
      else if (mod && !e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); const q = st.currentQuestion(); if (q) st.toggleFlag(q.id) }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); st.setStrikeMode(!st.strikeMode) }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'c' && section?.calculator) { e.preventDefault(); st.setCalculatorOpen(!st.calculatorOpen) }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'e' && section?.referenceSheet) { e.preventDefault(); st.setReferenceOpen(!st.referenceOpen) }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 't') { e.preventDefault(); st.toggleTimer() }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'q') { e.preventDefault(); st.setNavOpen(!st.navOpen) }
      else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        const q = st.currentQuestion()
        if (q?.type === 'multiple_choice') { e.preventDefault(); const opt = q.options[Number(e.key) - 1]; if (opt) st.answer(q.id, opt.id) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function ExamShell() {
  useTimer()
  useShortcuts()
  const chatEnabled = useMentorChat()
  const phase = useExamStore((s) => s.session?.phase)
  const view = useExamStore((s) => s.session?.view)
  const calculatorOpen = useExamStore((s) => s.calculatorOpen)
  const referenceOpen = useExamStore((s) => s.referenceOpen)
  const annotationPanel = useExamStore((s) => s.annotationPanel)
  const unscheduledBreak = useExamStore((s) => s.unscheduledBreak)
  const lineReader = useExamStore((s) => s.lineReader)
  const mode = useExamStore((s) => s.session?.mode)

  // Prevent the context menu and accidental drag/drop inside the exam.
  useEffect(() => {
    const stop = (e) => e.preventDefault()
    document.addEventListener('contextmenu', stop)
    document.addEventListener('dragover', stop)
    document.addEventListener('drop', stop)
    return () => { document.removeEventListener('contextmenu', stop); document.removeEventListener('dragover', stop); document.removeEventListener('drop', stop) }
  }, [])

  if (phase === 'start') return mode === 'preview' ? <PreviewIntro /> : <StartScreen />
  if (phase === 'transition') return <TransitionScreen />
  if (phase === 'break') return (<><BreakScreen />{chatEnabled && <MentorChat />}</>)
  if (phase === 'done') return <FinishFlow />

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-bb-black">
      <ExamHeader />
      <main className="relative min-h-0 flex-1">
        {view === 'review' ? <ReviewScreen /> : <Workspace />}
        {annotationPanel && <AnnotationPanel />}
        {lineReader && <LineReader />}
      </main>
      <Footer />
      <NavFlyout />
      {chatEnabled && <MentorChat />}
      {calculatorOpen && <Calculator />}
      {referenceOpen && <ReferenceSheet />}
      <ExamDialogs />
      {unscheduledBreak && <UnscheduledBreakOverlay />}
    </div>
  )
}
