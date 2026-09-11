// Builds exam sessions (stage plans) from a test + preset.
import { getModule, moduleVariants } from './schema.js'
import { uid } from './format.js'

export function listPresets(test) {
  const presets = []
  const hasBoth = test.sections.length > 1
  if (hasBoth) {
    presets.push({ id: 'full', label: 'SAT', detail: 'Reading and Writing + Math, with a 10-minute break', kind: 'full' })
  }
  for (const s of test.sections) {
    if (hasBoth) presets.push({ id: `section:${s.id}`, label: `${s.name} only`, detail: 'Both modules, adaptive routing', kind: 'section', sectionId: s.id })
    const numbers = [...new Set(s.modules.map((m) => m.moduleNumber))].sort()
    for (const n of numbers) {
      const variants = moduleVariants(s, n)
      if (variants.length === 0) {
        const mod = getModule(test, s.id, n, null)
        presets.push({ id: `module:${s.id}:${n}`, label: `${s.shortName} — Module ${n}`, detail: `${mod.questions.length} questions, ${mod.durationMinutes} minutes`, kind: 'module', sectionId: s.id, moduleNumber: n, variant: null })
      } else {
        for (const v of variants) {
          const mod = getModule(test, s.id, n, v)
          presets.push({ id: `module:${s.id}:${n}:${v}`, label: `${s.shortName} — Module ${n} (${v === 'hard' ? 'Harder' : 'Easier'})`, detail: `${mod.questions.length} questions, ${mod.durationMinutes} minutes`, kind: 'module', sectionId: s.id, moduleNumber: n, variant: v })
        }
      }
    }
  }
  return presets
}

function sectionStages(section) {
  const numbers = [...new Set(section.modules.map((m) => m.moduleNumber))].sort()
  return numbers.map((n) => ({
    type: 'module',
    key: `${section.id}-m${n}`,
    sectionId: section.id,
    sectionName: section.name,
    moduleNumber: n,
    variant: n === 1 || moduleVariants(section, n).length === 0 ? null : 'auto',
  }))
}

export function buildStages(test, preset) {
  const stages = []
  if (preset.kind === 'full') {
    test.sections.forEach((s, i) => {
      if (i > 0) stages.push({ type: 'break', key: `break-${i}`, durationMinutes: test.breakMinutes })
      stages.push(...sectionStages(s))
    })
  } else if (preset.kind === 'section') {
    stages.push(...sectionStages(test.sections.find((s) => s.id === preset.sectionId)))
  } else {
    const section = test.sections.find((s) => s.id === preset.sectionId)
    stages.push({ type: 'module', key: `${section.id}-m${preset.moduleNumber}`, sectionId: section.id, sectionName: section.name, moduleNumber: preset.moduleNumber, variant: preset.variant || null })
  }
  return stages
}

export function createSession(test, preset, { studentName = 'Jasurbek Tojiquziyev', lockdown = true, mode = 'test' } = {}) {
  return {
    id: uid('sess'),
    testId: test.testId,
    testTitle: test.title,
    preset: preset.id,
    presetLabel: preset.label,
    studentName,
    lockdown,
    mode,
    status: 'ready',
    phase: 'start',
    view: 'question',
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    stages: buildStages(test, preset),
    stageIndex: 0,
    modules: {},
    breakState: null,
    results: null,
    integrityLog: [],
  }
}

export function initialModuleState(mod, variant) {
  return {
    variant: variant || mod.variant || null,
    timeRemaining: mod.durationMinutes * 60,
    timerHidden: false,
    currentIndex: 0,
    answers: {},
    flagged: {},
    eliminated: {},
    annotations: {},
    submitted: false,
    startedAt: Date.now(),
    submittedAt: null,
    rawScore: null,
    calcState: null,
  }
}
