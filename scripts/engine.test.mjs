import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeTest, getModule } from '../src/lib/schema.js'
import { rawScore, routeVariant, buildResults, isCorrect, routingThreshold } from '../src/lib/mst.js'
import { createSession, listPresets, initialModuleState } from '../src/lib/session.js'
import { lookupScaled, CURVES } from '../src/lib/scoring-tables.js'

const raw = JSON.parse(fs.readFileSync(new URL('../public/tests/sat-practice-01.json', import.meta.url)))
const test1 = normalizeTest(raw)

function answerAll(mod, correctCount) {
  const answers = {}
  mod.questions.forEach((q, i) => {
    const right = q.type === 'spr' ? (Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer) : q.correctAnswer
    const wrong = q.type === 'spr' ? '999' : q.options.find((o) => o.id !== q.correctAnswer).id
    answers[q.id] = i < correctCount ? right : wrong
  })
  return answers
}

test('generated test has the digital SAT structure', () => {
  assert.equal(test1.sections.length, 2)
  const rw = test1.sections[0], math = test1.sections[1]
  assert.deepEqual(rw.modules.map((m) => [m.moduleNumber, m.variant, m.questions.length, m.durationMinutes]), [[1, null, 27, 32], [2, 'easy', 27, 32], [2, 'hard', 27, 32]])
  assert.deepEqual(math.modules.map((m) => [m.moduleNumber, m.variant, m.questions.length, m.durationMinutes]), [[1, null, 22, 35], [2, 'easy', 22, 35], [2, 'hard', 22, 35]])
})

test('every generated answer is self-consistent', () => {
  for (const s of test1.sections) for (const m of s.modules) for (const q of m.questions) {
    const key = q.type === 'spr' ? (Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer) : q.correctAnswer
    assert.ok(isCorrect(q, key), `${q.id} should accept its own key`)
  }
})

test('module 1 raw score routes to the harder or easier module 2', () => {
  const rw = test1.sections[0]
  const m1 = getModule(test1, 'rw', 1, null)
  assert.equal(routingThreshold(rw, m1), 16)
  assert.equal(routeVariant(rw, m1, 16), 'hard')
  assert.equal(routeVariant(rw, m1, 15), 'easy')
  assert.equal(rawScore(m1, answerAll(m1, 20)), 20)
})

test('scaled scores are monotonic and bounded, and easy path caps below hard path', () => {
  for (const sec of ['rw', 'math']) for (const v of ['hard', 'easy']) {
    const t = CURVES[sec][v]
    for (let i = 1; i < t.length; i++) assert.ok(t[i] >= t[i - 1])
    assert.equal(t[0], 200)
  }
  assert.equal(lookupScaled('rw', 54, 54, 'hard'), 800)
  assert.equal(lookupScaled('math', 44, 44, 'hard'), 800)
  assert.ok(lookupScaled('rw', 54, 54, 'easy') < 700)
  assert.equal(lookupScaled('rw', 13, 13, 'hard'), 800) // scales to the curve domain
})

test('full session results produce composite 400–1600 with routing recorded', () => {
  const presets = listPresets(test1)
  const session = createSession(test1, presets[0], { studentName: 'Test', lockdown: false })
  assert.deepEqual(session.stages.map((s) => s.key), ['rw-m1', 'rw-m2', 'break-1', 'math-m1', 'math-m2'])
  const rwM1 = getModule(test1, 'rw', 1), rwM2 = getModule(test1, 'rw', 2, 'hard')
  const mM1 = getModule(test1, 'math', 1), mM2 = getModule(test1, 'math', 2, 'easy')
  session.modules['rw-m1'] = { ...initialModuleState(rwM1, null), answers: answerAll(rwM1, 27), submitted: true }
  session.modules['rw-m2'] = { ...initialModuleState(rwM2, 'hard'), answers: answerAll(rwM2, 27), submitted: true }
  session.modules['math-m1'] = { ...initialModuleState(mM1, null), answers: answerAll(mM1, 10), submitted: true }
  session.modules['math-m2'] = { ...initialModuleState(mM2, 'easy'), answers: answerAll(mM2, 10), submitted: true }
  const r = buildResults(test1, session)
  assert.equal(r.sections[0].scaled, 800)
  assert.equal(r.sections[0].routedVariant, 'hard')
  assert.equal(r.sections[1].routedVariant, 'easy')
  assert.ok(r.sections[1].scaled >= 200 && r.sections[1].scaled < 800)
  assert.equal(r.composite, r.sections[0].scaled + r.sections[1].scaled)
  assert.equal(r.compositeEstimated, false)
  assert.equal(r.totalQuestions, 98)
})

test('single-module preset yields estimated section score', () => {
  const preset = listPresets(test1).find((p) => p.id === 'module:math:1')
  const session = createSession(test1, preset, {})
  const m = getModule(test1, 'math', 1)
  session.modules['math-m1'] = { ...initialModuleState(m, null), answers: answerAll(m, 22), submitted: true }
  const r = buildResults(test1, session)
  assert.equal(r.composite, null)
  assert.equal(r.sections[0].estimated, true)
  assert.equal(r.sections[0].raw, 22)
})
