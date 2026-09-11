import { create } from 'zustand'
import bridge from '../lib/bridge.js'
import { normalizeTest, getModule, getSection } from '../lib/schema.js'
import { rawScore, routeVariant, buildResults } from '../lib/mst.js'
import { initialModuleState } from '../lib/session.js'
import { uid } from '../lib/format.js'

export const TRANSITION_MS = 3500
const FIVE_MINUTES = 5 * 60

let persistTimer = null
let transitionTimer = null

export const useExamStore = create((set, get) => {
  const patchSession = (fn) => set((state) => ({ session: fn(state.session) }))
  const patchModule = (key, fn) =>
    patchSession((s) => ({ ...s, modules: { ...s.modules, [key]: fn(s.modules[key]) } }))
  const schedulePersist = () => {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(() => get().persistNow(), 600)
  }

  return {
    status: 'loading',
    error: null,
    test: null,
    session: null,
    lockdownInfo: null,
    // transient UI state
    paused: false,
    pauseReason: null,
    strikeMode: false,
    navOpen: false,
    directionsOpen: false,
    calculatorOpen: false,
    referenceOpen: false,
    annotationPanel: null,
    activeAnnotationId: null,
    dialog: null,
    zoom: 1,
    lineReader: false,
    unscheduledBreak: false,
    transitionReason: null,

    // ---------- lifecycle ----------
    async load(sessionId) {
      set({ status: 'loading', error: null })
      try {
        const session = await bridge.sessions.get(sessionId)
        if (!session) throw new Error('Session not found')
        const raw = await bridge.tests.load(session.testId)
        const test = normalizeTest(raw)
        set({ test, session, status: 'ready', paused: false, pauseReason: null, strikeMode: false, navOpen: false, calculatorOpen: false, referenceOpen: false, annotationPanel: null, dialog: null, transitionReason: null })
        if (session.phase === 'transition') get().advanceStage()
      } catch (err) {
        set({ status: 'error', error: err.message || String(err) })
      }
    },

    async persistNow() {
      clearTimeout(persistTimer)
      const { session } = get()
      if (!session) return
      try { await bridge.sessions.save(session) } catch (err) { console.error('[exam] persist failed', err) }
    },

    // ---------- selectors ----------
    currentStage() {
      const { session } = get()
      return session ? session.stages[session.stageIndex] : null
    },
    currentSection() {
      const stage = get().currentStage()
      return stage?.type === 'module' ? getSection(get().test, stage.sectionId) : null
    },
    currentModuleState() {
      const stage = get().currentStage()
      return stage?.type === 'module' ? get().session.modules[stage.key] || null : null
    },
    currentModule() {
      const stage = get().currentStage()
      if (!stage || stage.type !== 'module') return null
      const ms = get().session.modules[stage.key]
      return getModule(get().test, stage.sectionId, stage.moduleNumber, ms?.variant || (stage.variant === 'auto' ? null : stage.variant))
    },
    currentQuestion() {
      const mod = get().currentModule()
      const ms = get().currentModuleState()
      if (!mod || !ms) return null
      return mod.questions[ms.currentIndex] || null
    },

    // ---------- stage machine ----------
    beginTest() {
      patchSession((s) => ({ ...s, status: 'in-progress', startedAt: s.startedAt || Date.now() }))
      get().enterStage(0)
    },

    enterStage(index) {
      const { session, test } = get()
      const stage = session.stages[index]
      if (!stage) return get().finishTest()
      if (stage.type === 'break') {
        patchSession((s) => ({ ...s, stageIndex: index, phase: 'break', breakState: { timeRemaining: stage.durationMinutes * 60, paused: false, startedAt: Date.now() } }))
        set({ transitionReason: null })
        return get().persistNow()
      }
      let variant = stage.variant
      if (variant === 'auto') {
        const section = getSection(test, stage.sectionId)
        const m1Key = `${stage.sectionId}-m1`
        const m1State = session.modules[m1Key]
        const m1 = getModule(test, stage.sectionId, 1, m1State?.variant)
        const raw = m1State?.rawScore ?? (m1 ? rawScore(m1, m1State?.answers || {}) : 0)
        variant = routeVariant(section, m1, raw)
      }
      const mod = getModule(test, stage.sectionId, stage.moduleNumber, variant)
      const existing = session.modules[stage.key]
      patchSession((s) => ({
        ...s,
        stageIndex: index,
        phase: 'module',
        view: 'question',
        modules: { ...s.modules, [stage.key]: existing || initialModuleState(mod, variant) },
      }))
      set({ strikeMode: false, navOpen: false, calculatorOpen: false, referenceOpen: false, annotationPanel: null, activeAnnotationId: null, transitionReason: null })
      return get().persistNow()
    },

    submitModule(reason = 'manual') {
      const { session } = get()
      const stage = session.stages[session.stageIndex]
      if (!stage || stage.type !== 'module') return
      const ms = session.modules[stage.key]
      if (!ms || ms.submitted) return
      const mod = get().currentModule()
      const raw = rawScore(mod, ms.answers)
      patchModule(stage.key, (m) => ({ ...m, submitted: true, submittedAt: Date.now(), rawScore: raw }))
      patchSession((s) => ({ ...s, phase: 'transition' }))
      set({ transitionReason: reason, navOpen: false, calculatorOpen: false, referenceOpen: false, annotationPanel: null, dialog: null, strikeMode: false })
      get().persistNow()
      clearTimeout(transitionTimer)
      transitionTimer = setTimeout(() => get().advanceStage(), TRANSITION_MS)
    },

    advanceStage() {
      clearTimeout(transitionTimer)
      const { session } = get()
      if (!session) return
      const next = session.stageIndex + 1
      if (next >= session.stages.length) return get().finishTest()
      return get().enterStage(next)
    },

    async finishTest() {
      const { session, test } = get()
      if (!session || session.phase === 'done') return
      const results = buildResults(test, session)
      patchSession((s) => ({ ...s, phase: 'done', status: 'completed', completedAt: Date.now(), results }))
      await get().persistNow()
    },

    async abortTest() {
      const { session, test } = get()
      if (!session) return
      const results = buildResults(test, session)
      patchSession((s) => ({ ...s, phase: 'done', status: 'aborted', completedAt: Date.now(), results }))
      set({ dialog: null })
      await get().persistNow()
    },

    // ---------- timer ----------
    tick() {
      const { session, paused } = get()
      if (!session || paused) return
      if (session.phase === 'module') {
        if (get().test?.preview || session.mode === 'preview') return // the Test Preview is untimed
        const stage = session.stages[session.stageIndex]
        const ms = session.modules[stage.key]
        if (!ms || ms.submitted) return
        const t = ms.timeRemaining - 1
        if (t <= 0) {
          patchModule(stage.key, (m) => ({ ...m, timeRemaining: 0 }))
          return get().submitModule('time')
        }
        patchModule(stage.key, (m) => {
          const reachedFive = t <= FIVE_MINUTES && !m.fiveMinuteAlerted
          return { ...m, timeRemaining: t, timerHidden: reachedFive ? false : m.timerHidden, fiveMinuteAlerted: m.fiveMinuteAlerted || t <= FIVE_MINUTES }
        })
        if (t % 10 === 0) schedulePersist()
      } else if (session.phase === 'break') {
        const b = session.breakState
        if (!b || b.paused) return
        const t = Math.max(0, b.timeRemaining - 1)
        // Test day: the clock runs to 0:00 and the student presses Resume Testing Now.
        if (t <= 0 && session.mode !== 'test-day') return get().endBreak()
        if (t === 0 && b.timeRemaining === 0) return
        patchSession((s) => ({ ...s, breakState: { ...s.breakState, timeRemaining: t } }))
        if (t % 10 === 0) schedulePersist()
      }
    },

    toggleTimer() {
      const stage = get().currentStage()
      if (!stage || stage.type !== 'module') return
      patchModule(stage.key, (m) => ({ ...m, timerHidden: !m.timerHidden }))
      schedulePersist()
    },

    // ---------- break ----------
    pauseBreak() { patchSession((s) => ({ ...s, breakState: { ...s.breakState, paused: true } })); schedulePersist() },
    resumeBreak() { patchSession((s) => ({ ...s, breakState: { ...s.breakState, paused: false } })); schedulePersist() },
    endBreak() { get().advanceStage() },

    // ---------- navigation ----------
    goTo(index) {
      const stage = get().currentStage()
      const mod = get().currentModule()
      if (!stage || !mod) return
      const i = Math.max(0, Math.min(mod.questions.length - 1, index))
      patchModule(stage.key, (m) => ({ ...m, currentIndex: i }))
      patchSession((s) => ({ ...s, view: 'question' }))
      set({ navOpen: false, annotationPanel: null, activeAnnotationId: null })
      schedulePersist()
    },
    next() {
      const { session } = get()
      const stage = get().currentStage()
      const mod = get().currentModule()
      const ms = get().currentModuleState()
      if (!mod || !ms) return
      if (session.view === 'review') return get().submitModule('manual')
      if (ms.currentIndex >= mod.questions.length - 1) return get().openReview()
      get().goTo(ms.currentIndex + 1)
    },
    back() {
      const { session } = get()
      const ms = get().currentModuleState()
      if (!ms) return
      if (session.view === 'review') {
        patchSession((s) => ({ ...s, view: 'question' }))
        return
      }
      if (ms.currentIndex > 0) get().goTo(ms.currentIndex - 1)
    },
    openReview() {
      patchSession((s) => ({ ...s, view: 'review' }))
      set({ navOpen: false, annotationPanel: null })
      schedulePersist()
    },

    // ---------- answering ----------
    answer(qid, value) {
      const stage = get().currentStage()
      if (!stage) return
      patchModule(stage.key, (m) => {
        const answers = { ...m.answers }
        if (value === null || value === undefined || value === '') delete answers[qid]
        else answers[qid] = value
        return { ...m, answers }
      })
      schedulePersist()
    },
    toggleFlag(qid) {
      const stage = get().currentStage()
      if (!stage) return
      patchModule(stage.key, (m) => ({ ...m, flagged: { ...m.flagged, [qid]: !m.flagged[qid] } }))
      schedulePersist()
    },
    toggleEliminate(qid, optionId) {
      const stage = get().currentStage()
      if (!stage) return
      patchModule(stage.key, (m) => {
        const list = new Set(m.eliminated[qid] || [])
        if (list.has(optionId)) list.delete(optionId)
        else list.add(optionId)
        const answers = { ...m.answers }
        if (list.has(optionId) && answers[qid] === optionId) delete answers[qid]
        return { ...m, eliminated: { ...m.eliminated, [qid]: [...list] }, answers }
      })
      schedulePersist()
    },

    // ---------- annotations ----------
    addAnnotation(qid, ann) {
      const stage = get().currentStage()
      if (!stage) return null
      const full = { id: uid('ann'), color: 'yellow', note: '', createdAt: Date.now(), ...ann }
      patchModule(stage.key, (m) => ({ ...m, annotations: { ...m.annotations, [qid]: [...(m.annotations[qid] || []), full] } }))
      schedulePersist()
      return full
    },
    updateAnnotation(qid, id, patch) {
      const stage = get().currentStage()
      if (!stage) return
      patchModule(stage.key, (m) => ({ ...m, annotations: { ...m.annotations, [qid]: (m.annotations[qid] || []).map((a) => (a.id === id ? { ...a, ...patch } : a)) } }))
      schedulePersist()
    },
    removeAnnotation(qid, id) {
      const stage = get().currentStage()
      if (!stage) return
      patchModule(stage.key, (m) => ({ ...m, annotations: { ...m.annotations, [qid]: (m.annotations[qid] || []).filter((a) => a.id !== id) } }))
      set({ activeAnnotationId: null, annotationPanel: null })
      schedulePersist()
    },
    saveCalcState(state) {
      const stage = get().currentStage()
      if (!stage) return
      patchModule(stage.key, (m) => ({ ...m, calcState: state }))
      schedulePersist()
    },

    ensureChatCode(generate) {
      const { session } = get()
      if (!session) return null
      const code = generate()
      if (session.chatCode === code) return code
      patchSession((s) => ({ ...s, chatCode: code }))
      get().persistNow()
      return code
    },

    setFeedback(feedback) {
      patchSession((s) => ({ ...s, feedback }))
      get().persistNow()
    },

    // ---------- integrity ----------
    logIntegrity(evt) {
      const { session } = get()
      if (!session) return
      patchSession((s) => ({ ...s, integrityLog: [...(s.integrityLog || []).slice(-199), evt] }))
      const active = ['module', 'break'].includes(session.phase)
      if (!active) return
      if (evt.type === 'blur' || evt.type === 'fullscreen-exit') get().setPaused(evt.type)
      if (evt.type === 'display' && evt.count > 1) get().setPaused('display')
      schedulePersist()
    },
    setPaused(reason) {
      set({ paused: true, pauseReason: reason, navOpen: false, calculatorOpen: get().calculatorOpen, dialog: null })
    },
    resume() { set({ paused: false, pauseReason: null }) },

    // ---------- UI toggles ----------
    setStrikeMode(v) { set({ strikeMode: v }) },
    setNavOpen(v) { set({ navOpen: v }) },
    setDirectionsOpen(v) { set({ directionsOpen: v }) },
    setCalculatorOpen(v) { set({ calculatorOpen: v }) },
    setReferenceOpen(v) { set({ referenceOpen: v }) },
    setAnnotationPanel(v) { set({ annotationPanel: v }) },
    setActiveAnnotation(id) { set({ activeAnnotationId: id }) },
    setDialog(v) { set({ dialog: v }) },
    setZoom(z) { set({ zoom: Math.max(0.8, Math.min(1.6, z)) }) },
    setLineReader(v) { set({ lineReader: v }) },
    setUnscheduledBreak(v) { set({ unscheduledBreak: v, dialog: null }) },
    setLockdownInfo(v) { set({ lockdownInfo: v }) },
  }
})
