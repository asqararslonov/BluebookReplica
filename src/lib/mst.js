// Multistage adaptive testing engine: answer checking, module routing, scoring.
import { getModule, getSection, moduleVariants } from './schema.js'
import { lookupScaled } from './scoring-tables.js'

export function parseNumeric(value) {
  if (value === null || value === undefined) return null
  const s = String(value).trim().replace(/\s+/g, '')
  if (!s) return null
  const frac = /^(-?)(\d+)\/(\d+)$/.exec(s)
  if (frac) {
    const d = Number(frac[3])
    if (d === 0) return null
    return (frac[1] ? -1 : 1) * (Number(frac[2]) / d)
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  return Number(s)
}

function sprMatches(user, correct) {
  if (correct && typeof correct === 'object' && !Array.isArray(correct)) {
    const n = parseNumeric(user)
    if (n === null) return false
    if ('min' in correct && n < Number(correct.min) - 1e-9) return false
    if ('max' in correct && n > Number(correct.max) + 1e-9) return false
    return true
  }
  const u = parseNumeric(user)
  const c = parseNumeric(correct)
  if (u === null || c === null) return String(user).trim() === String(correct).trim()
  if (Math.abs(u - c) < 1e-9) return true
  // Bluebook rule: a decimal that doesn't fit may be truncated or rounded at the
  // fourth digit, i.e. the student must use the full 5 characters (6 with a sign).
  const body = String(user).trim().replace(/^-/, '')
  if (body.length >= 5 && body.includes('.')) {
    const scale = Math.pow(10, body.split('.')[1].length)
    const truncated = Math.trunc(c * scale) / scale
    const rounded = Math.round(c * scale) / scale
    return Math.abs(u - truncated) < 1e-9 || Math.abs(u - rounded) < 1e-9
  }
  return false
}

export function isCorrect(question, answer) {
  if (answer === undefined || answer === null || answer === '') return false
  if (question.type === 'spr') {
    const accepted = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
    return accepted.some((c) => sprMatches(answer, c))
  }
  return String(answer).toUpperCase() === String(question.correctAnswer).toUpperCase()
}

export function rawScore(module, answers = {}) {
  let correct = 0
  for (const q of module.questions) if (isCorrect(q, answers[q.id])) correct++
  return correct
}

export function routingThreshold(section, module1) {
  if (section.routingThreshold != null) return Number(section.routingThreshold)
  return Math.ceil(module1.questions.length * 0.6)
}

export function routeVariant(section, module1, raw) {
  const variants = moduleVariants(section, 2)
  if (variants.length === 0) return null
  const threshold = routingThreshold(section, module1)
  if (raw >= threshold) return variants.includes('hard') ? 'hard' : variants[0]
  return variants.includes('easy') ? 'easy' : variants[0]
}

export function questionOutcome(question, answer) {
  if (answer === undefined || answer === null || answer === '') return 'omitted'
  return isCorrect(question, answer) ? 'correct' : 'incorrect'
}

/** Computes the score report for a (possibly partial) session. */
export function buildResults(test, session) {
  const sections = []
  const moduleStages = session.stages.filter((s) => s.type === 'module')
  const bySection = new Map()
  for (const stage of moduleStages) {
    if (!bySection.has(stage.sectionId)) bySection.set(stage.sectionId, [])
    bySection.get(stage.sectionId).push(stage)
  }

  let composite = 0
  let compositeComplete = true
  const domains = {}

  for (const [sectionId, stages] of bySection) {
    const section = getSection(test, sectionId)
    const modules = []
    let raw = 0
    let total = 0
    let routedVariant = null
    for (const stage of stages) {
      const state = session.modules[stage.key]
      const variant = state?.variant || stage.variant
      const mod = getModule(test, sectionId, stage.moduleNumber, variant === 'auto' ? null : variant)
      if (!mod) continue
      const answers = state?.answers || {}
      const questions = mod.questions.map((q, i) => {
        const outcome = questionOutcome(q, answers[q.id])
        const d = q.domain || 'General'
        domains[d] = domains[d] || { domain: d, sectionId, correct: 0, total: 0 }
        domains[d].total++
        if (outcome === 'correct') domains[d].correct++
        return { number: i + 1, id: q.id, outcome, answer: answers[q.id] ?? null, correctAnswer: q.correctAnswer, flagged: !!state?.flagged?.[q.id], domain: d, difficulty: q.difficulty }
      })
      const correct = questions.filter((q) => q.outcome === 'correct').length
      raw += correct
      total += mod.questions.length
      if (stage.moduleNumber === 2) routedVariant = mod.variant
      modules.push({ key: stage.key, moduleNumber: stage.moduleNumber, variant: mod.variant, correct, total: mod.questions.length, questions, timeUsedSeconds: state ? mod.durationMinutes * 60 - (state.timeRemaining ?? 0) : null })
    }
    const fullSection = stages.length === section.modules.filter((m, i, arr) => arr.findIndex((x) => x.moduleNumber === m.moduleNumber) === i).length
    const variantForCurve = routedVariant || (stages.length === 1 && stages[0].moduleNumber === 2 ? (session.modules[stages[0].key]?.variant || stages[0].variant) : 'hard')
    const scaled = lookupScaled(sectionId, raw, total, variantForCurve === 'easy' ? 'easy' : 'hard', section.scoring)
    sections.push({ sectionId, name: section.name, raw, total, percent: total ? Math.round((raw / total) * 100) : 0, routedVariant, scaled, estimated: !fullSection, modules })
    composite += scaled
    if (!fullSection) compositeComplete = false
  }

  const includesBoth = ['rw', 'math'].every((id) => sections.some((s) => s.sectionId === id))
  return {
    computedAt: Date.now(),
    sections,
    composite: includesBoth ? composite : null,
    compositeEstimated: !compositeComplete,
    domains: Object.values(domains).map((d) => ({ ...d, percent: d.total ? Math.round((d.correct / d.total) * 100) : 0 })),
    totalCorrect: sections.reduce((a, s) => a + s.raw, 0),
    totalQuestions: sections.reduce((a, s) => a + s.total, 0),
  }
}
