// Raw -> scaled conversion curves approximating College Board practice-test
// scoring guides. Each section has an "upper" curve (routed to the harder
// Module 2) and a "lower" curve (routed to the easier Module 2). Values are
// anchored at published-looking points and interpolated; a test JSON may
// override them via section.scoring = { hard: [...], easy: [...] }.

function buildCurve(anchors, maxRaw) {
  const table = []
  for (let raw = 0; raw <= maxRaw; raw++) {
    let lo = anchors[0]
    let hi = anchors[anchors.length - 1]
    for (let i = 0; i < anchors.length - 1; i++) {
      if (raw >= anchors[i][0] && raw <= anchors[i + 1][0]) { lo = anchors[i]; hi = anchors[i + 1]; break }
    }
    const t = hi[0] === lo[0] ? 0 : (raw - lo[0]) / (hi[0] - lo[0])
    const score = lo[1] + t * (hi[1] - lo[1])
    table.push(Math.max(200, Math.min(800, Math.round(score / 10) * 10)))
  }
  return table
}

export const RW_MAX_RAW = 54
export const MATH_MAX_RAW = 44

export const CURVES = {
  rw: {
    hard: buildCurve([[0, 200], [10, 300], [20, 400], [27, 470], [33, 540], [38, 600], [43, 660], [47, 710], [50, 750], [52, 780], [54, 800]], RW_MAX_RAW),
    easy: buildCurve([[0, 200], [10, 290], [20, 370], [27, 430], [33, 490], [38, 540], [43, 580], [47, 610], [50, 630], [54, 650]], RW_MAX_RAW),
  },
  math: {
    hard: buildCurve([[0, 200], [8, 300], [15, 400], [20, 470], [26, 540], [31, 600], [35, 660], [38, 710], [40, 740], [42, 770], [44, 800]], MATH_MAX_RAW),
    easy: buildCurve([[0, 200], [8, 290], [15, 370], [20, 430], [26, 490], [31, 540], [35, 580], [38, 610], [40, 630], [44, 650]], MATH_MAX_RAW),
  },
}

export function lookupScaled(sectionId, raw, maxRaw, variant, override) {
  const curves = override || CURVES[sectionId] || CURVES.rw
  const table = curves[variant === 'easy' ? 'easy' : 'hard'] || curves.hard
  const canonicalMax = table.length - 1
  // Scale raw into the curve's domain when the test uses a different question count.
  const scaledRaw = maxRaw === canonicalMax ? raw : Math.round((raw / Math.max(1, maxRaw)) * canonicalMax)
  return table[Math.max(0, Math.min(canonicalMax, scaledRaw))]
}
