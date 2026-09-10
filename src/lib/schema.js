// Normalizes test JSON to the internal shape and provides lookups.

export const OPTION_IDS = ['A', 'B', 'C', 'D']

export function normalizeQuestion(q, sectionId, moduleNumber, variant, index) {
  const id = q.id || `${sectionId}-m${moduleNumber}${variant ? `-${variant}` : ''}-q${index + 1}`
  const type = q.type === 'spr' || q.type === 'student_produced_response' ? 'spr' : 'multiple_choice'
  return {
    id,
    type,
    passage: q.passage || null,
    stimulusImage: q.stimulusImage || null,
    stimulusSvg: q.stimulusSvg || null,
    figureCaption: q.figureCaption || null,
    imageAlt: q.imageAlt || null,
    table: q.table || null,
    stem: q.stem || '',
    options: type === 'multiple_choice' ? (q.options || []).map((o, i) => ({ id: o.id || OPTION_IDS[i], text: o.text ?? '' })) : [],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || '',
    domain: q.domain || null,
    skill: q.skill || null,
    difficulty: q.difficulty || 'medium',
    sectionId,
    moduleNumber,
    variant: variant || null,
  }
}

export function normalizeTest(raw) {
  const sections = (raw.sections || []).map((s) => {
    const id = s.id || (/(math)/i.test(s.name) ? 'math' : 'rw')
    const modules = (s.modules || []).map((m) => {
      const variant = m.variant ? String(m.variant).toLowerCase() : null
      return {
        moduleNumber: Number(m.moduleNumber || 1),
        variant,
        durationMinutes: Number(m.durationMinutes || (id === 'math' ? 35 : 32)),
        directions: m.directions || s.directions || null,
        questions: (m.questions || []).map((q, i) => normalizeQuestion(q, id, Number(m.moduleNumber || 1), variant, i)),
      }
    })
    return {
      id,
      name: s.name || (id === 'math' ? 'Math' : 'Reading and Writing'),
      shortName: s.shortName || (id === 'math' ? 'Math' : 'Reading and Writing'),
      routingThreshold: s.routingThreshold ?? null,
      calculator: s.calculator ?? id === 'math',
      referenceSheet: s.referenceSheet ?? id === 'math',
      annotate: s.annotate ?? id !== 'math',
      layout: s.layout || (id === 'math' ? 'single' : 'split'),
      directions: s.directions || defaultDirections(id),
      scoring: s.scoring || null,
      modules,
    }
  })
  return {
    testId: raw.testId,
    title: raw.title || raw.testId,
    description: raw.description || '',
    version: raw.version || 1,
    preview: !!raw.preview,
    breakMinutes: raw.breakMinutes ?? 10,
    sections,
  }
}

export function defaultDirections(sectionId) {
  if (sectionId === 'math') {
    return `The questions in this section address a number of important math skills.

Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test.

Unless otherwise indicated:

- All variables and expressions represent real numbers.
- Figures provided are drawn to scale.
- All figures lie in a plane.
- The domain of a given function is the set of all real numbers x for which f(x) is a real number.

For **multiple-choice questions**, solve each problem and choose the correct answer from the choices provided. Each multiple-choice question has a single correct answer.

For **student-produced response questions**, solve each problem and enter your answer as described below.

- If you find **more than one correct answer**, enter only one answer.
- You can enter up to 5 characters for a **positive** answer and up to 6 characters (including the negative sign) for a **negative** answer.
- If your answer is a **fraction** that doesn't fit in the provided space, enter the decimal equivalent.
- If your answer is a **decimal** that doesn't fit in the provided space, enter it by truncating or rounding at the fourth digit.
- If your answer is a **mixed number** (such as 3½), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).
- Don't enter **symbols** such as a percent sign, comma, or dollar sign.`
  }
  return `The questions in this section cover a range of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).

All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.`
}

export const SPR_DIRECTIONS = `**Student-produced response directions**

- If you find **more than one correct answer**, enter only one answer.
- You can enter up to 5 characters for a **positive** answer and up to 6 characters (including the negative sign) for a **negative** answer.
- If your answer is a **fraction** that doesn't fit in the provided space, enter the decimal equivalent.
- If your answer is a **decimal** that doesn't fit in the provided space, enter it by truncating or rounding at the fourth digit.
- If your answer is a **mixed number** (such as 3½), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).
- Don't enter **symbols** such as a percent sign, comma, or dollar sign.`

export function getSection(test, sectionId) {
  return test.sections.find((s) => s.id === sectionId) || null
}

export function getModule(test, sectionId, moduleNumber, variant) {
  const section = getSection(test, sectionId)
  if (!section) return null
  const candidates = section.modules.filter((m) => m.moduleNumber === moduleNumber)
  if (candidates.length === 0) return null
  if (variant) return candidates.find((m) => m.variant === variant) || candidates.find((m) => !m.variant) || candidates[0]
  return candidates.find((m) => !m.variant) || candidates.find((m) => m.variant === 'hard') || candidates[0]
}

export function moduleVariants(section, moduleNumber) {
  return section.modules.filter((m) => m.moduleNumber === moduleNumber).map((m) => m.variant).filter(Boolean)
}
