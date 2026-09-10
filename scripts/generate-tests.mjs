// Assembles six full-length practice tests + a Test Preview into public/tests/.
// Deterministic per test (seeded), original content, self-checked answers.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STEMS, domainFor, SKILL_NAMES, vocabItems, readingItems, grammarFrames, transitionItems, synthesisItems } from '../content/rw-bank.mjs'
import { mathGenerators } from '../content/math-bank.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'tests')
const LETTERS = ['A', 'B', 'C', 'D']

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makeRng(seed) {
  const next = mulberry32(seed)
  const rng = {
    float: () => next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [c[i], c[j]] = [c[j], c[i]] } return c },
  }
  return rng
}

const TIER_WEIGHT = {
  mixed: { easy: 1, medium: 1.2, hard: 0.8 },
  easy: { easy: 1.6, medium: 1, hard: 0.25 },
  hard: { easy: 0.35, medium: 1, hard: 1.6 },
}

// Weighted sampling without replacement (per test) from a pool.
function drawItems(rng, pool, used, count, tier) {
  const weights = TIER_WEIGHT[tier]
  const out = []
  let available = pool.filter((it) => !used.has(it))
  for (let i = 0; i < count; i++) {
    if (available.length === 0) { available = pool.filter((it) => !out.includes(it)); }
    const total = available.reduce((a, it) => a + (weights[it.difficulty] || 1), 0)
    let r = rng.float() * total
    let chosen = available[available.length - 1]
    for (const it of available) { r -= weights[it.difficulty] || 1; if (r <= 0) { chosen = it; break } }
    out.push(chosen)
    used.add(chosen)
    available = available.filter((it) => it !== chosen)
  }
  return out
}

function finalizeMc(rng, { stem, options, ...rest }, id) {
  const correctText = options[0]
  const shuffled = rng.shuffle(options)
  const opts = shuffled.map((text, i) => ({ id: LETTERS[i], text }))
  const correctAnswer = opts.find((o) => o.text === correctText).id
  return { id, type: 'multiple_choice', stem, options: opts, correctAnswer, ...rest }
}

function rwQuestion(rng, item, kind, id) {
  const skill = kind === 'vocab' ? 'vocab' : kind === 'grammar' ? 'sec' : kind === 'transition' ? 'transition' : kind === 'synthesis' ? 'synthesis' : item.skill
  const base = { domain: domainFor(skill), skill: SKILL_NAMES[skill], difficulty: item.difficulty, explanation: item.explanation }
  if (kind === 'vocab') return finalizeMc(rng, { stem: STEMS.vocab, options: item.options, passage: item.passage, ...base }, id)
  if (kind === 'reading') return finalizeMc(rng, { stem: STEMS[item.skill], options: item.options, passage: item.passage, table: item.table || null, ...base }, id)
  if (kind === 'grammar') return finalizeMc(rng, { stem: STEMS.sec, options: item.options, passage: `${item.pre}[[blank]]${item.post}`, ...base, skill: `${SKILL_NAMES.sec} (${item.skill})` }, id)
  if (kind === 'transition') return finalizeMc(rng, { stem: STEMS.transition, options: item.options, passage: item.passage, ...base }, id)
  const notes = `While researching a topic, a student has taken the following notes:\n\n${item.notes.map((n) => `- ${n}`).join('\n')}`
  return finalizeMc(rng, { stem: STEMS.synthesis(item.goal), options: item.options, passage: notes, ...base }, id)
}

function buildRwModule(rng, used, tier, count, prefix) {
  const plan = count === 27
    ? { vocab: 5, cs: 4, ii: 8, grammar: 6, transition: 2, synthesis: 2 }
    : { vocab: 1, cs: 0, ii: 1, grammar: 1, transition: 0, synthesis: 0 }
  const cs = readingItems.filter((r) => ['purpose', 'function', 'cross-text'].includes(r.skill))
  const ii = readingItems.filter((r) => ['main-idea', 'inference', 'evidence', 'data'].includes(r.skill))
  const items = [
    ...drawItems(rng, vocabItems, used, plan.vocab, tier).map((it) => ['vocab', it]),
    ...drawItems(rng, cs, used, plan.cs, tier).map((it) => ['reading', it]),
    ...drawItems(rng, ii, used, plan.ii, tier).map((it) => ['reading', it]),
    ...drawItems(rng, grammarFrames, used, plan.grammar, tier).map((it) => ['grammar', it]),
    ...drawItems(rng, transitionItems, used, plan.transition, tier).map((it) => ['transition', it]),
    ...drawItems(rng, synthesisItems, used, plan.synthesis, tier).map((it) => ['synthesis', it]),
  ]
  return items.map(([kind, it], i) => rwQuestion(rng, it, kind, `${prefix}-q${i + 1}`))
}

const DIFF_RANK = { easy: 0, medium: 1, hard: 2 }
function buildMathModule(rng, tier, count, prefix) {
  const quotas = count === 22 ? { 'Algebra': 8, 'Advanced Math': 7, 'Problem-Solving and Data Analysis': 4, 'Geometry and Trigonometry': 3 } : { 'Algebra': 1, 'Advanced Math': 1, 'Problem-Solving and Data Analysis': 1, 'Geometry and Trigonometry': 0 }
  const tierPref = tier === 'easy' ? ['easy', 'medium'] : tier === 'hard' ? ['medium', 'hard'] : ['easy', 'medium', 'hard']
  const picks = []
  for (const [domain, n] of Object.entries(quotas)) {
    const gens = mathGenerators.filter((g) => g.domain === domain)
    const usedIds = new Map()
    for (let i = 0; i < n; i++) {
      const eligible = gens.filter((g) => g.tiers.some((t) => tierPref.includes(t)))
      const least = Math.min(...eligible.map((g) => usedIds.get(g.id) || 0))
      const pool = eligible.filter((g) => (usedIds.get(g.id) || 0) === least)
      const g = rng.pick(pool)
      usedIds.set(g.id, (usedIds.get(g.id) || 0) + 1)
      const gt = rng.pick(g.tiers.filter((t) => tierPref.includes(t)))
      picks.push({ g, gt })
    }
  }
  // Decide SPR slots (~25%) among generators supporting it.
  const sprTarget = Math.round(count * 0.25)
  const sprCandidates = rng.shuffle(picks.map((p, i) => i).filter((i) => picks[i].g.formats.includes('spr')))
  const sprSet = new Set(sprCandidates.slice(0, sprTarget))
  const questions = picks.map((p, i) => {
    const format = sprSet.has(i) ? 'spr' : 'mc'
    const q = p.g.generate(rng, p.gt, format)
    return { ...q, domain: p.g.domain, skill: p.g.skill, difficulty: p.gt }
  })
  // Order by difficulty (as the real test does), keeping SPRs mixed in.
  questions.sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty])
  return questions.map((q, i) => {
    const id = `${prefix}-q${i + 1}`
    if (q.type === 'spr') return { id, ...q }
    return finalizeMc(rng, q, id)
  })
}

function validate(test) {
  const ids = new Set()
  for (const s of test.sections) for (const m of s.modules) for (const q of m.questions) {
    if (ids.has(q.id)) throw new Error(`Duplicate id ${q.id}`)
    ids.add(q.id)
    if (!q.stem) throw new Error(`Missing stem ${q.id}`)
    if (q.type === 'multiple_choice') {
      if (q.options.length !== 4) throw new Error(`${q.id} has ${q.options.length} options`)
      if (new Set(q.options.map((o) => o.text)).size !== 4) throw new Error(`${q.id} has duplicate options: ${q.options.map((o) => o.text).join(' | ')}`)
      if (!q.options.some((o) => o.id === q.correctAnswer)) throw new Error(`${q.id} correct answer not in options`)
    } else if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '') throw new Error(`${q.id} missing SPR answer`)
  }
  return test
}

function buildTest(n) {
  const rng = makeRng(1000 + n * 7919)
  const used = new Set()
  const rwDir = null
  const test = {
    testId: `sat-practice-0${n}`,
    title: `SAT Practice ${n}`,
    description: `Full-length adaptive practice test: two Reading and Writing modules (27 questions, 32 minutes each) and two Math modules (22 questions, 35 minutes each) with a 10-minute break.`,
    version: 1,
    breakMinutes: 10,
    sections: [
      {
        id: 'rw', name: 'Reading and Writing', shortName: 'Reading and Writing', routingThreshold: 16,
        modules: [
          { moduleNumber: 1, durationMinutes: 32, questions: buildRwModule(rng, used, 'mixed', 27, `t${n}-rw-m1`) },
          { moduleNumber: 2, variant: 'easy', durationMinutes: 32, questions: buildRwModule(rng, used, 'easy', 27, `t${n}-rw-m2e`) },
          { moduleNumber: 2, variant: 'hard', durationMinutes: 32, questions: buildRwModule(rng, used, 'hard', 27, `t${n}-rw-m2h`) },
        ],
      },
      {
        id: 'math', name: 'Math', shortName: 'Math', routingThreshold: 13, calculator: true, referenceSheet: true,
        modules: [
          { moduleNumber: 1, durationMinutes: 35, questions: buildMathModule(rng, 'mixed', 22, `t${n}-math-m1`) },
          { moduleNumber: 2, variant: 'easy', durationMinutes: 35, questions: buildMathModule(rng, 'easy', 22, `t${n}-math-m2e`) },
          { moduleNumber: 2, variant: 'hard', durationMinutes: 35, questions: buildMathModule(rng, 'hard', 22, `t${n}-math-m2h`) },
        ],
      },
    ],
  }
  return validate(test)
}

function buildPreview() {
  const rng = makeRng(42)
  const used = new Set()
  return validate({
    testId: 'test-preview',
    title: 'Test Preview',
    description: 'A short, unscored walkthrough of the testing tools: a few Reading and Writing questions and a few Math questions.',
    version: 1,
    preview: true,
    breakMinutes: 1,
    sections: [
      { id: 'rw', name: 'Reading and Writing', shortName: 'Reading and Writing', modules: [{ moduleNumber: 1, durationMinutes: 6, questions: buildRwModule(rng, used, 'mixed', 3, 'pv-rw-m1') }] },
      { id: 'math', name: 'Math', shortName: 'Math', calculator: true, referenceSheet: true, modules: [{ moduleNumber: 1, durationMinutes: 6, questions: buildMathModule(rng, 'mixed', 3, 'pv-math-m1') }] },
    ],
  })
}

fs.mkdirSync(OUT, { recursive: true })
const manifest = { generatedAt: new Date().toISOString(), tests: [] }
const summarize = (test) => {
  const modules = test.sections.flatMap((s) => s.modules)
  const uniqueByNumber = test.sections.flatMap((s) => [...new Set(s.modules.map((m) => m.moduleNumber))].map((n) => s.modules.find((m) => m.moduleNumber === n)))
  return {
    questionCount: uniqueByNumber.reduce((a, m) => a + m.questions.length, 0),
    durationMinutes: uniqueByNumber.reduce((a, m) => a + m.durationMinutes, 0) + (test.sections.length > 1 ? test.breakMinutes : 0),
    totalItems: modules.reduce((a, m) => a + m.questions.length, 0),
  }
}
for (let n = 1; n <= 6; n++) {
  const test = buildTest(n)
  const file = `${test.testId}.json`
  const json = JSON.stringify(test)
  fs.writeFileSync(path.join(OUT, file), json)
  const s = summarize(test)
  manifest.tests.push({ testId: test.testId, title: test.title, file, description: test.description, kind: 'practice', number: n, questionCount: s.questionCount, durationMinutes: s.durationMinutes, sizeBytes: Buffer.byteLength(json) })
  console.log(`${test.testId}: ${s.totalItems} items (${s.questionCount} per attempt), ${Buffer.byteLength(json)} bytes`)
}
const preview = buildPreview()
const pjson = JSON.stringify(preview)
fs.writeFileSync(path.join(OUT, 'test-preview.json'), pjson)
const ps = summarize(preview)
manifest.tests.push({ testId: 'test-preview', title: 'Test Preview', file: 'test-preview.json', description: preview.description, kind: 'preview', alwaysAvailable: true, questionCount: ps.questionCount, durationMinutes: ps.durationMinutes, sizeBytes: Buffer.byteLength(pjson) })
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`manifest: ${manifest.tests.length} entries written to ${OUT}`)
