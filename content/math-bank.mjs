// Parameterized, self-checking Math generators. Every generator computes its
// own answer, so generated tests are always internally consistent.
// Options list the correct answer FIRST; the assembler shuffles them.

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export function fmt(n) {
  if (Number.isInteger(n)) return String(n)
  return String(Number(n.toFixed(4)))
}
export function frac(num, den) {
  if (den < 0) { num = -num; den = -den }
  const g = gcd(Math.abs(num), den) || 1
  num /= g; den /= g
  if (den === 1) return String(num)
  return `${num < 0 ? '-' : ''}\\frac{${Math.abs(num)}}{${den}}`
}
export function fracPlain(num, den) {
  if (den < 0) { num = -num; den = -den }
  const g = gcd(Math.abs(num), den) || 1
  num /= g; den /= g
  return den === 1 ? String(num) : `${num}/${den}`
}
const sgn = (n) => (n < 0 ? '-' : '+')
const term = (coef, v, first = false) => {
  if (coef === 0) return ''
  const a = Math.abs(coef)
  const body = a === 1 ? v : `${a}${v}`
  if (first) return coef < 0 ? `-${body}` : body
  return ` ${sgn(coef)} ${body}`
}
const constTerm = (c, first = false) => (c === 0 ? '' : first ? String(c) : ` ${sgn(c)} ${Math.abs(c)}`)
export function linear(a, b, v = 'x') { return `${term(a, v, true)}${constTerm(b)}` || '0' }
export function quad(a, b, c, v = 'x') { return `${term(a, `${v}^2`, true)}${term(b, v)}${constTerm(c)}` }

function uniqueOptions(correct, candidates, fallback) {
  const out = [String(correct)]
  for (const c of candidates) {
    const s = String(c)
    if (!out.includes(s)) out.push(s)
    if (out.length === 4) break
  }
  let k = 1
  while (out.length < 4) {
    const s = String(fallback(k++))
    if (!out.includes(s)) out.push(s)
  }
  return out
}
const money = (n) => `\\$${n.toFixed(2).replace(/\.00$/, '')}`

// ---------- SVG helpers ----------
const SVG = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${inner}</svg>`
const style = 'fill="none" stroke="#1e1e1e" stroke-width="2"'
const label = (x, y, t, extra = '') => `<text x="${x}" y="${y}" font-family="Noto Serif, serif" font-size="16" font-style="italic" fill="#1e1e1e" ${extra}>${t}</text>`
export function svgRightTriangle(a, b, c, opts = {}) {
  const A = opts.labelA || a, B = opts.labelB || b, C = opts.labelC || c
  return SVG(260, 200, `<polygon points="40,160 220,160 220,40" ${style}/><rect x="204" y="144" width="16" height="16" ${style}/>${label(120, 185, B)}${label(228, 105, A)}${label(105, 90, C)}${opts.angleLabel ? `<path d="M70 160 A30 30 0 0 0 66 145" ${style}/>${label(78, 152, opts.angleLabel, 'font-size="14"')}` : ''}`)
}
export function svgTriangleAngles(a, b) {
  return SVG(280, 190, `<polygon points="30,160 250,160 150,30" ${style}/>${label(46, 150, `${a}°`, 'font-style="normal" font-size="14"')}${label(206, 150, `${b}°`, 'font-style="normal" font-size="14"')}${label(140, 62, 'x°', 'font-size="14"')}`)
}
export function svgCircle(r) {
  return SVG(220, 220, `<circle cx="110" cy="110" r="80" ${style}/><circle cx="110" cy="110" r="3" fill="#1e1e1e"/><line x1="110" y1="110" x2="190" y2="110" ${style}/>${label(140, 102, r)}`)
}
export function svgBarChart(categories, values, title) {
  const w = 360, h = 240, left = 50, bottom = 200, top = 30
  const max = Math.max(...values) * 1.15
  const bw = (w - left - 20) / values.length
  let bars = ''
  values.forEach((v, i) => {
    const bh = ((bottom - top) * v) / max
    const x = left + i * bw + bw * 0.2
    bars += `<rect x="${x}" y="${bottom - bh}" width="${bw * 0.6}" height="${bh}" fill="#0077c8"/>`
    bars += `<text x="${x + bw * 0.3}" y="${bottom + 18}" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="13" fill="#1e1e1e">${categories[i]}</text>`
  })
  let grid = ''
  const step = Math.ceil(max / 5 / 5) * 5 || 5
  for (let g = 0; g <= max; g += step) {
    const y = bottom - ((bottom - top) * g) / max
    grid += `<line x1="${left}" y1="${y}" x2="${w - 20}" y2="${y}" stroke="#d0d0d0" stroke-width="1"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" font-family="Noto Sans, sans-serif" font-size="12" fill="#1e1e1e">${g}</text>`
  }
  return SVG(w, h, `<text x="${w / 2}" y="18" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="14" font-weight="bold" fill="#1e1e1e">${title}</text>${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#1e1e1e" stroke-width="1.5"/><line x1="${left}" y1="${bottom}" x2="${w - 20}" y2="${bottom}" stroke="#1e1e1e" stroke-width="1.5"/>${bars}`)
}

const ALG = 'Algebra', ADV = 'Advanced Math', PSDA = 'Problem-Solving and Data Analysis', GEO = 'Geometry and Trigonometry'
const nz = (rng, a, b) => { let v = 0; while (v === 0) v = rng.int(a, b); return v }

export const mathGenerators = [
  {
    id: 'linear-solve', domain: ALG, skill: 'Linear equations in one variable', tiers: ['easy', 'medium', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      if (tier === 'easy') {
        const x = rng.int(-8, 12), a = rng.int(2, 9), b = nz(rng, -15, 15), c = a * x + b
        const stem = `If $${linear(a, b)} = ${c}$, what is the value of $x$?`
        const explanation = `Subtract ${b} from both sides: $${a}x = ${c - b}$. Divide by ${a}: $x = ${x}$.`
        if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(x), explanation }
        return { stem, type: 'multiple_choice', options: uniqueOptions(x, [-x, c - b, x + a], (k) => x + k + 1), explanation }
      }
      const x = rng.int(-9, 9), a = rng.int(2, 7), b = nz(rng, -6, 6)
      let c = rng.int(-5, 8); if (c === a) c = a + 1
      const d = (a - c) * x + a * b
      const stem = `If $${a}(x ${sgn(b)} ${Math.abs(b)}) = ${linear(c, d)}$, what is the value of $x$?`
      const explanation = `Distribute: $${linear(a, a * b)} = ${linear(c, d)}$. Collect terms: $${a - c}x = ${d - a * b}$, so $x = ${x}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(x), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(x, [-x, x + b, x - b, x + 1], (k) => x + k + 2), explanation }
    },
  },
  {
    id: 'linear-system', domain: ALG, skill: 'Systems of two linear equations', tiers: ['medium', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const x = rng.int(-6, 8), y = rng.int(-6, 8)
      let a1, b1, a2, b2
      do { a1 = nz(rng, -5, 6); b1 = nz(rng, -5, 6); a2 = nz(rng, -5, 6); b2 = nz(rng, -5, 6) } while (a1 * b2 - a2 * b1 === 0 || (tier === 'medium' && a1 !== 1 && b2 !== 1))
      const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y
      const askSum = rng.chance(0.5)
      const ans = askSum ? x + y : x
      const stem = `$$\\begin{aligned} ${linear(a1, 0)}${term(b1, 'y')} &= ${c1} \\\\ ${linear(a2, 0)}${term(b2, 'y')} &= ${c2} \\end{aligned}$$\n\nThe solution to the given system of equations is $(x, y)$. What is the value of ${askSum ? '$x + y$' : '$x$'}?`
      const explanation = `Solving the system gives $x = ${x}$ and $y = ${y}$${askSum ? `, so $x + y = ${x + y}$` : ''}.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(ans), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(ans, [askSum ? x - y : y, -ans, askSum ? x : x + y], (k) => ans + k + 1), explanation }
    },
  },
  {
    id: 'slope-points', domain: ALG, skill: 'Linear functions', tiers: ['easy', 'medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const x1 = rng.int(-6, 6); let x2 = rng.int(-6, 6); if (x2 === x1) x2 += 2
      const y1 = rng.int(-8, 8)
      const num = tier === 'easy' ? nz(rng, -4, 4) * (x2 - x1) : nz(rng, -9, 9)
      const y2 = y1 + num
      const dy = y2 - y1, dx = x2 - x1
      const stem = `A line in the $xy$-plane passes through the points $(${x1}, ${y1})$ and $(${x2}, ${y2})$. What is the slope of the line?`
      const explanation = `Slope $= \\dfrac{${y2} - (${y1})}{${x2} - (${x1})} = \\dfrac{${dy}}{${dx}} = ${frac(dy, dx)}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: [fracPlain(dy, dx), fmt(dy / dx)], explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(`$${frac(dy, dx)}$`, [`$${frac(dx, dy || 1)}$`, `$${frac(-dy, dx)}$`, `$${frac(dy + dx, dx)}$`], (k) => `$${frac(dy + k, dx)}$`), explanation }
    },
  },
  {
    id: 'line-equation', domain: ALG, skill: 'Linear equations in two variables', tiers: ['easy', 'medium'], formats: ['mc'],
    generate(rng) {
      const m = nz(rng, -5, 5), b = nz(rng, -9, 9), x1 = rng.int(-4, 4), y1 = m * x1 + b
      const stem = `A line in the $xy$-plane has a slope of $${m}$ and passes through the point $(${x1}, ${y1})$. Which equation represents the line?`
      const eq = (mm, bb) => `$y = ${linear(mm, bb)}$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(eq(m, b), [eq(m, -b), eq(-m, b), eq(b, m)], (k) => eq(m, b + k)), explanation: `Using $y = mx + b$ with $m = ${m}$: $${y1} = ${m}(${x1}) + b$, so $b = ${b}$.` }
    },
  },
  {
    id: 'linear-model', domain: ALG, skill: 'Linear functions', tiers: ['easy', 'medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const fee = rng.int(2, 12) * 5, rate = rng.int(2, 9) * 5, months = rng.int(3, 12)
      const ctx = rng.pick([['gym', 'membership', 'month', 'm'], ['streaming service', 'subscription', 'month', 'm'], ['bike-share program', 'plan', 'week', 'w']])
      if (format === 'spr' || tier === 'medium') {
        const stem = `A ${ctx[0]} charges a one-time fee of ${money(fee)} plus ${money(rate)} per ${ctx[2]}. What is the total cost, in dollars, of a ${ctx[1]} that lasts ${months} ${ctx[2]}s?`
        const total = fee + rate * months
        const explanation = `Total $= ${fee} + ${rate}(${months}) = ${total}$ dollars.`
        if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(total), explanation }
        return { stem, type: 'multiple_choice', options: uniqueOptions(total, [fee * months + rate, rate * months, total + fee], (k) => total + 5 * k), explanation }
      }
      const v = ctx[3]
      const stem = `A ${ctx[0]} charges a one-time fee of ${money(fee)} plus ${money(rate)} per ${ctx[2]}. Which function $C$ gives the total cost, in dollars, of a ${ctx[1]} that lasts $${v}$ ${ctx[2]}s?`
      const f = (a, b) => `$C(${v}) = ${linear(a, b, v)}$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(f(rate, fee), [f(fee, rate), `$C(${v}) = ${fee + rate}${v}$`, f(rate, -fee)], (k) => f(rate + 5 * k, fee)), explanation: `The fixed fee is the constant term and the per-${ctx[2]} rate multiplies $${v}$: $C(${v}) = ${linear(rate, fee, v)}$.` }
    },
  },
  {
    id: 'inequality', domain: ALG, skill: 'Linear inequalities', tiers: ['medium', 'hard'], formats: ['mc'],
    generate(rng, tier) {
      const a = tier === 'hard' ? -rng.int(2, 6) : rng.int(2, 6), x0 = rng.int(-6, 6), b = nz(rng, -9, 9), c = a * x0 + b
      const gt = rng.chance(0.5)
      const stem = `Which of the following is the solution set of the inequality $${linear(a, b)} ${gt ? '>' : '<'} ${c}$?`
      const flips = a < 0
      const finalGt = gt !== flips
      const correct = `$x ${finalGt ? '>' : '<'} ${x0}$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(correct, [`$x ${finalGt ? '<' : '>'} ${x0}$`, `$x ${finalGt ? '>' : '<'} ${c - b}$`, `$x ${finalGt ? '<' : '>'} ${-x0}$`], (k) => `$x ${finalGt ? '>' : '<'} ${x0 + k}$`), explanation: `Subtract ${b}: $${a}x ${gt ? '>' : '<'} ${c - b}$. Divide by ${a}${flips ? ' and reverse the inequality sign' : ''}: $x ${finalGt ? '>' : '<'} ${x0}$.` }
    },
  },
  {
    id: 'perpendicular-slope', domain: ALG, skill: 'Linear equations in two variables', tiers: ['medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const p = nz(rng, -5, 5), q = rng.int(1, 5), b = nz(rng, -7, 7)
      const stem = `Line $\\ell$ is defined by $y = ${frac(p, q)}x ${sgn(b)} ${Math.abs(b)}$. Line $k$ is perpendicular to line $\\ell$ in the $xy$-plane. What is the slope of line $k$?`
      const explanation = `Perpendicular slopes are negative reciprocals: $-\\dfrac{1}{${frac(p, q)}} = ${frac(-q, p)}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: [fracPlain(-q, p), fmt(-q / p)], explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(`$${frac(-q, p)}$`, [`$${frac(q, p)}$`, `$${frac(-p, q)}$`, `$${frac(p, q)}$`], (k) => `$${frac(-q + k, p)}$`), explanation }
    },
  },
  {
    id: 'no-solution-system', domain: ALG, skill: 'Systems of two linear equations', tiers: ['hard'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const a = rng.int(2, 6), b = nz(rng, -6, 6), t = rng.int(2, 4), d = t * b, k = t * a, c = rng.int(-9, 9)
      let e = rng.int(-9, 9); if (e === t * c) e += 1
      const stem = `$$\\begin{aligned} ${linear(a, 0)}${term(b, 'y')} &= ${c} \\\\ k x${term(d, 'y')} &= ${e} \\end{aligned}$$\n\nIn the given system of equations, $k$ is a constant. If the system has no solution, what is the value of $k$?`
      const explanation = `The system has no solution when the lines are parallel: $\\dfrac{k}{${a}} = \\dfrac{${d}}{${b}} = ${t}$, so $k = ${k}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(k), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(k, [a, d, -k], (j) => k + j), explanation }
    },
  },
  {
    id: 'function-table', domain: ALG, skill: 'Linear functions', tiers: ['easy', 'medium'], formats: ['mc'],
    generate(rng) {
      const m = nz(rng, -4, 5), b = rng.int(-6, 9), xs = [0, 1, 2, 3].map((v) => v + rng.int(0, 2))
      const table = { caption: '', headers: ['$x$', '$f(x)$'], rows: [...new Set(xs)].map((x) => [String(x), String(m * x + b)]) }
      const f = (mm, bb) => `$f(x) = ${linear(mm, bb)}$`
      return { stem: 'The table gives selected values of the linear function $f$. Which equation defines $f$?', table, type: 'multiple_choice', options: uniqueOptions(f(m, b), [f(b, m), f(-m, b), f(m, -b)], (k) => f(m, b + k)), explanation: `Consecutive rows change by $${m}$ per unit of $x$, so the slope is $${m}$; substituting a row gives the intercept $${b}$.` }
    },
  },
  // ---------- Advanced Math ----------
  {
    id: 'quadratic-roots', domain: ADV, skill: 'Nonlinear equations in one variable', tiers: ['medium', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      let r1 = rng.int(-8, 8), r2 = rng.int(-8, 8); if (r1 === r2) r2 += 3
      const bq = -(r1 + r2), cq = r1 * r2
      const askSum = tier === 'hard' && rng.chance(0.5)
      const bigger = Math.max(r1, r2)
      const ans = askSum ? r1 + r2 : bigger
      const stem = `What is the ${askSum ? 'sum of the solutions' : 'greater solution'} to the equation $${quad(1, bq, cq)} = 0$?`
      const explanation = `Factor: $(x ${sgn(-r1)} ${Math.abs(r1)})(x ${sgn(-r2)} ${Math.abs(r2)}) = 0$, so $x = ${r1}$ or $x = ${r2}$.${askSum ? ` The sum is $${r1 + r2}$.` : ''}`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(ans), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(ans, [Math.min(r1, r2), -ans, cq, bq], (k) => ans + k + 1), explanation }
    },
  },
  {
    id: 'parabola-vertex', domain: ADV, skill: 'Nonlinear functions', tiers: ['medium', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const h = rng.int(-6, 6), k = rng.int(-9, 9), a = tier === 'hard' ? rng.int(2, 3) : 1
      const B = -2 * a * h, C = a * h * h + k
      const stem = `The function $f$ is defined by $f(x) = ${quad(a, B, C)}$. What is the minimum value of $f$?`
      const explanation = `Complete the square: $f(x) = ${a === 1 ? '' : a}(x ${sgn(-h)} ${Math.abs(h)})^2 ${sgn(k)} ${Math.abs(k)}$. The minimum value is $${k}$, at $x = ${h}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(k), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(k, [h, -k, C], (j) => k + j), explanation }
    },
  },
  {
    id: 'exponential-model', domain: ADV, skill: 'Nonlinear functions', tiers: ['easy', 'medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const p0 = rng.int(2, 9) * 100, r = rng.int(2, 9), grow = rng.chance(0.7)
      const factor = grow ? 1 + r / 100 : 1 - r / 100
      const ctx = rng.pick(['The population of a town', 'The number of subscribers to a newsletter', 'The value of an investment account'])
      if (format === 'spr') {
        const stem = `${ctx} is modeled by the function $P(t) = ${p0}(${factor.toFixed(2)})^t$, where $t$ is the number of years after 2020. By what percent does the quantity ${grow ? 'increase' : 'decrease'} each year?`
        return { stem, type: 'spr', correctAnswer: String(r), explanation: `The base $${factor.toFixed(2)} = 1 ${grow ? '+' : '-'} ${(r / 100).toFixed(2)}$, so the yearly ${grow ? 'increase' : 'decrease'} is $${r}\\%$.` }
      }
      const stem = `${ctx} was ${p0.toLocaleString()} in 2020 and ${grow ? 'increases' : 'decreases'} by $${r}\\%$ each year. Which function $P$ models the quantity $t$ years after 2020?`
      const f = (base, fac) => `$P(t) = ${base}(${fac})^t$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(f(p0, factor.toFixed(2)), [f(p0, (grow ? 1 - r / 100 : 1 + r / 100).toFixed(2)), f(p0, (r / 100).toFixed(2)), `$P(t) = ${p0} + ${r}t$`], (k) => f(p0, (factor + k / 100).toFixed(2))), explanation: `A $${r}\\%$ ${grow ? 'increase' : 'decrease'} per year multiplies by $${factor.toFixed(2)}$ each year.` }
    },
  },
  {
    id: 'polynomial-factor', domain: ADV, skill: 'Equivalent expressions', tiers: ['hard'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const k = nz(rng, -3, 3), a = nz(rng, -5, 5), b = nz(rng, -6, 6)
      const c = -(k ** 3 + a * k * k + b * k)
      const stem = `The polynomial $p(x) = x^3 ${term(a, 'x^2')}${term(b, 'x')} + c$, where $c$ is a constant, has $(x ${sgn(-k)} ${Math.abs(k)})$ as a factor. What is the value of $c$?`
      const explanation = `If $(x ${sgn(-k)} ${Math.abs(k)})$ is a factor, then $p(${k}) = 0$: $${k ** 3} ${sgn(a * k * k)} ${Math.abs(a * k * k)} ${sgn(b * k)} ${Math.abs(b * k)} + c = 0$, so $c = ${c}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(c), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(c, [-c, c + k, k], (j) => c + j), explanation }
    },
  },
  {
    id: 'rational-equation', domain: ADV, skill: 'Nonlinear equations in one variable', tiers: ['medium', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      let x, a, b, c
      do { x = rng.int(-6, 9); a = nz(rng, -7, 7); b = nz(rng, -7, 7); c = rng.int(2, 5) } while (x + b === 0 || x + a !== c * (x + b))
      // ensure consistency by solving for a instead
      a = c * (x + b) - x
      const stem = `If $\\dfrac{x ${sgn(a)} ${Math.abs(a)}}{x ${sgn(b)} ${Math.abs(b)}} = ${c}$, what is the value of $x$?`
      const explanation = `Multiply both sides by $x ${sgn(b)} ${Math.abs(b)}$: $x ${sgn(a)} ${Math.abs(a)} = ${c}x ${sgn(c * b)} ${Math.abs(c * b)}$. Then $${1 - c}x = ${c * b - a}$, so $x = ${x}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(x), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(x, [-x, x + b, x - a], (k) => x + k + 1), explanation }
    },
  },
  {
    id: 'discriminant', domain: ADV, skill: 'Nonlinear equations in one variable', tiers: ['medium', 'hard'], formats: ['mc'],
    generate(rng) {
      const b = nz(rng, -8, 8), c = rng.int(-6, 16)
      const disc = b * b - 4 * c
      const correct = disc > 0 ? 'Exactly two' : disc === 0 ? 'Exactly one' : 'Zero'
      return { stem: `How many distinct real solutions does the equation $${quad(1, b, c)} = 0$ have?`, type: 'multiple_choice', options: uniqueOptions(correct, ['Zero', 'Exactly one', 'Exactly two', 'Infinitely many'], () => 'Infinitely many'), explanation: `The discriminant is $b^2 - 4ac = ${b * b} - ${4 * c} = ${disc}$, which is ${disc > 0 ? 'positive, so there are two real solutions' : disc === 0 ? 'zero, so there is exactly one real solution' : 'negative, so there are no real solutions'}.` }
    },
  },
  {
    id: 'composite-function', domain: ADV, skill: 'Nonlinear functions', tiers: ['medium'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const a = nz(rng, -4, 5), b = rng.int(-6, 6), c = rng.int(1, 9), k = rng.int(-4, 4)
      const g = k * k - c, ans = a * g + b
      const stem = `The functions $f$ and $g$ are defined by $f(x) = ${linear(a, b)}$ and $g(x) = x^2 - ${c}$. What is the value of $f(g(${k}))$?`
      const explanation = `$g(${k}) = ${k}^2 - ${c} = ${g}$, then $f(${g}) = ${a}(${g}) ${sgn(b)} ${Math.abs(b)} = ${ans}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(ans), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(ans, [g, a * k + b, (a * k + b) ** 2 - c], (j) => ans + j), explanation }
    },
  },
  {
    id: 'radical-equation', domain: ADV, skill: 'Nonlinear equations in one variable', tiers: ['medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const b = rng.int(2, 9), a = nz(rng, -8, 8), x = b * b - a
      const stem = `What is the solution to the equation $\\sqrt{x ${sgn(a)} ${Math.abs(a)}} = ${b}$?`
      const explanation = `Square both sides: $x ${sgn(a)} ${Math.abs(a)} = ${b * b}$, so $x = ${x}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(x), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(x, [b - a, b * b + a, x + 2 * a], (k) => x + k), explanation }
    },
  },
  {
    id: 'absolute-value', domain: ADV, skill: 'Nonlinear equations in one variable', tiers: ['hard'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const a = nz(rng, -7, 7), b = rng.int(1, 9)
      const stem = `What is the sum of the solutions to the equation $|x ${sgn(-a)} ${Math.abs(a)}| = ${b}$?`
      const explanation = `The solutions are $x = ${a + b}$ and $x = ${a - b}$; their sum is $${2 * a}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(2 * a), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(2 * a, [a, 2 * b, a + b], (k) => 2 * a + k), explanation }
    },
  },
  {
    id: 'exponent-rules', domain: ADV, skill: 'Equivalent expressions', tiers: ['easy', 'medium'], formats: ['mc'],
    generate(rng) {
      const k = rng.int(2, 5), p = rng.int(2, 4), q = rng.int(2, 3), r = rng.int(1, 5)
      const coef = k ** q, exp = p * q + r
      const stem = `Which expression is equivalent to $(${k}x^{${p}})^{${q}} \\cdot x^{${r}}$?`
      const f = (c, e) => `$${c}x^{${e}}$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(f(coef, exp), [f(k * q, exp), f(coef, p * q * r), f(k, p + q + r)], (j) => f(coef, exp + j)), explanation: `$(${k}x^{${p}})^{${q}} = ${coef}x^{${p * q}}$; multiplying by $x^{${r}}$ adds exponents: $${coef}x^{${exp}}$.` }
    },
  },
  {
    id: 'linear-quadratic-system', domain: ADV, skill: 'Systems of equations', tiers: ['hard'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      let r1 = rng.int(-5, 5), r2 = rng.int(-5, 5); if (r1 === r2) r2 += 2
      const b = r1 + r2, prod = r1 * r2, a = rng.int(-6, 6), c = a - prod
      const stem = `$$\\begin{aligned} y &= x^2 ${sgn(a)} ${Math.abs(a)} \\\\ y &= ${linear(b, c)} \\end{aligned}$$\n\nThe graphs of the given equations intersect at two points in the $xy$-plane. What is the greater of the two $x$-coordinates of the points of intersection?`
      const ans = Math.max(r1, r2)
      const explanation = `Set the expressions equal: $x^2 ${sgn(a)} ${Math.abs(a)} = ${linear(b, c)}$, so $${quad(1, -b, prod)} = 0$, which factors as $(x ${sgn(-r1)} ${Math.abs(r1)})(x ${sgn(-r2)} ${Math.abs(r2)}) = 0$. The greater solution is $${ans}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(ans), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(ans, [Math.min(r1, r2), ans * ans + a, b], (k) => ans + k), explanation }
    },
  },
  // ---------- Problem-Solving and Data Analysis ----------
  {
    id: 'percent-discount', domain: PSDA, skill: 'Percentages', tiers: ['easy', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const price = rng.int(4, 40) * 5, d = rng.pick([10, 15, 20, 25, 30, 40])
      const sale = price * (1 - d / 100)
      if (tier === 'hard') {
        const tax = rng.pick([5, 6, 8])
        const total = Math.round(sale * (1 + tax / 100) * 100) / 100
        const stem = `A jacket with an original price of ${money(price)} is on sale for $${d}\\%$ off. A sales tax of $${tax}\\%$ is applied to the sale price. What is the total cost of the jacket, in dollars, including tax?`
        const explanation = `Sale price $= ${price}(1 - ${d / 100}) = ${fmt(sale)}$. With tax: $${fmt(sale)}(1.${String(tax).padStart(2, '0')}) = ${fmt(total)}$.`
        if (format === 'spr') return { stem, type: 'spr', correctAnswer: fmt(total), explanation }
        return { stem, type: 'multiple_choice', options: uniqueOptions(fmt(total), [fmt(sale), fmt(price * (1 - d / 100 + tax / 100)), fmt(Math.round(price * (1 + tax / 100) * 100) / 100)], (k) => fmt(total + k)), explanation }
      }
      const stem = `A store reduces the price of a ${money(price)} item by $${d}\\%$. What is the sale price of the item, in dollars?`
      const explanation = `$${d}\\%$ of ${price} is ${fmt(price * d / 100)}, so the sale price is $${price} - ${fmt(price * d / 100)} = ${fmt(sale)}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: fmt(sale), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(fmt(sale), [fmt(price * d / 100), fmt(price - d), fmt(price * (1 + d / 100))], (k) => fmt(sale + 5 * k)), explanation }
    },
  },
  {
    id: 'percent-change', domain: PSDA, skill: 'Percentages', tiers: ['medium'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const base = rng.int(2, 12) * 25, pct = rng.pick([4, 8, 12, 16, 20, 24, 28, 36, 40, 60])
      const after = base * (1 + pct / 100)
      const stem = `The number of members of a club increased from ${base} to ${fmt(after)} over one year. By what percent did the number of members increase?`
      const explanation = `Percent increase $= \\dfrac{${fmt(after)} - ${base}}{${base}} \\times 100 = ${pct}\\%$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(pct), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(`$${pct}\\%$`, [`$${fmt(after - base)}\\%$`, `$${fmt(Math.round(((after - base) / after) * 1000) / 10)}\\%$`, `$${pct * 2}\\%$`], (k) => `$${pct + 5 * k}\\%$`), explanation }
    },
  },
  {
    id: 'mean-median', domain: PSDA, skill: 'One-variable data: distributions and measures of center and spread', tiers: ['easy', 'medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const n = 7
      const data = Array.from({ length: n }, () => rng.int(2, 30))
      // Make the mean an integer so answers never need rounding.
      const rem = data.reduce((a, b) => a + b, 0) % n
      if (rem !== 0) data[n - 1] += data[n - 1] - rem >= 2 ? -rem : n - rem
      const sorted = [...data].sort((a, b) => a - b)
      const median = sorted[3]
      const sum = data.reduce((a, b) => a + b, 0)
      const askMean = tier === 'medium'
      const mean = sum / n
      const ctx = rng.pick(['The list gives the number of books read by 7 students over the summer.', 'The list gives the daily high temperatures, in degrees Celsius, for 7 days.', 'The list gives the number of goals scored by a team in 7 games.'])
      const stem = `${ctx}\n\n$$${data.join(',\\ ')}$$\n\nWhat is the ${askMean ? 'mean' : 'median'} of the data?`
      if (askMean) {
        const explanation = `Mean $= \\dfrac{${sum}}{7} = ${fmt(mean)}$.`
        if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(mean), explanation }
        return { stem, type: 'multiple_choice', options: uniqueOptions(mean, [median, sorted[6] - sorted[0], fmt(Math.round((sum / 6) * 100) / 100)], (k) => mean + k), explanation }
      }
      const explanation = `Ordered: $${sorted.join(', ')}$. The middle (4th) value is $${median}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(median), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(median, [data[3], fmt(Math.round(mean * 10) / 10), sorted[6] - sorted[0]], (k) => median + k), explanation }
    },
  },
  {
    id: 'two-way-table', domain: PSDA, skill: 'Probability and conditional probability', tiers: ['medium', 'hard'], formats: ['mc'],
    generate(rng) {
      const a = rng.int(8, 40), b = rng.int(8, 40), c = rng.int(8, 40), d = rng.int(8, 40)
      const table = { caption: 'Survey Results', headers: ['', 'Prefers morning', 'Prefers evening', 'Total'], rows: [['Students', a, b, a + b], ['Teachers', c, d, c + d], ['Total', a + c, b + d, a + b + c + d]] }
      const stem = 'The table summarizes the responses of students and teachers at a school who were asked whether they prefer morning or evening classes. If one of the teachers is selected at random, what is the probability that the selected teacher prefers evening classes?'
      const opt = (n, m) => `$${frac(n, m)}$`
      return { stem, table, type: 'multiple_choice', options: uniqueOptions(opt(d, c + d), [opt(d, b + d), opt(d, a + b + c + d), opt(c, c + d)], (k) => opt(d + k, c + d)), explanation: `There are $${c + d}$ teachers, and $${d}$ of them prefer evening classes: $\\dfrac{${d}}{${c + d}}$.` }
    },
  },
  {
    id: 'unit-rate', domain: PSDA, skill: 'Ratios, rates, proportional relationships, and units', tiers: ['easy'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const rate = rng.int(3, 12), t1 = rng.int(2, 6), t2 = t1 * rng.int(2, 5)
      const pages = rate * t1, ans = rate * t2
      const stem = `A printer prints ${pages} pages in ${t1} minutes. At this rate, how many pages will the printer print in ${t2} minutes?`
      const explanation = `The rate is $\\dfrac{${pages}}{${t1}} = ${rate}$ pages per minute, so in ${t2} minutes it prints $${rate} \\times ${t2} = ${ans}$ pages.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(ans), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(ans, [pages + t2, rate * t1 + t2 - t1, ans + rate], (k) => ans + rate * k), explanation }
    },
  },
  {
    id: 'best-fit', domain: PSDA, skill: 'Two-variable data: models and scatterplots', tiers: ['medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const m = rng.int(2, 9) / 2, b = rng.int(5, 40), x = rng.int(4, 20)
      const y = m * x + b
      const stem = `For a set of data, a line of best fit is given by $y = ${fmt(m)}x + ${b}$, where $x$ is the number of hours a student studied and $y$ is the predicted score on a quiz. According to the model, what is the predicted quiz score for a student who studied for ${x} hours?`
      const explanation = `Substitute $x = ${x}$: $y = ${fmt(m)}(${x}) + ${b} = ${fmt(y)}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: fmt(y), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(fmt(y), [fmt(m * x), fmt(m + b * x), fmt(x + b)], (k) => fmt(y + k)), explanation }
    },
  },
  {
    id: 'bar-chart', domain: PSDA, skill: 'One-variable data: distributions and measures of center and spread', tiers: ['easy', 'medium'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const cats = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const vals = cats.map(() => rng.int(2, 12) * 5)
      const i = rng.int(0, 4); let j = rng.int(0, 4); if (j === i) j = (i + 1) % 5
      const hi = Math.max(vals[i], vals[j]), lo = Math.min(vals[i], vals[j])
      const hiDay = vals[i] >= vals[j] ? cats[i] : cats[j], loDay = vals[i] >= vals[j] ? cats[j] : cats[i]
      const svg = svgBarChart(cats, vals, 'Cups of Coffee Sold')
      if (tier === 'medium') {
        const total = vals.reduce((a, b) => a + b, 0)
        const stem = 'The bar graph shows the number of cups of coffee a café sold on each of five days. What was the mean number of cups sold per day?'
        const mean = total / 5
        const explanation = `Total $= ${vals.join(' + ')} = ${total}$; mean $= \\dfrac{${total}}{5} = ${fmt(mean)}$.`
        if (format === 'spr') return { stem, stimulusSvg: svg, type: 'spr', correctAnswer: fmt(mean), explanation }
        return { stem, stimulusSvg: svg, type: 'multiple_choice', options: uniqueOptions(fmt(mean), [fmt(total), fmt(Math.max(...vals)), fmt(total / 4)], (k) => fmt(mean + 5 * k)), explanation }
      }
      const stem = `The bar graph shows the number of cups of coffee a café sold on each of five days. How many more cups were sold on ${hiDay} than on ${loDay}?`
      const explanation = `${hiDay}: ${hi} cups; ${loDay}: ${lo} cups. The difference is $${hi} - ${lo} = ${hi - lo}$.`
      if (format === 'spr') return { stem, stimulusSvg: svg, type: 'spr', correctAnswer: String(hi - lo), explanation }
      return { stem, stimulusSvg: svg, type: 'multiple_choice', options: uniqueOptions(hi - lo, [hi + lo, hi, lo], (k) => hi - lo + 5 * k), explanation }
    },
  },
  {
    id: 'map-scale', domain: PSDA, skill: 'Ratios, rates, proportional relationships, and units', tiers: ['easy'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const k = rng.pick([15, 20, 25, 30, 40, 50]), d = rng.int(2, 9) + rng.pick([0, 0.5])
      const miles = k * d
      const stem = `On a map, 1 inch represents ${k} miles. Two cities are ${fmt(d)} inches apart on the map. What is the actual distance, in miles, between the two cities?`
      const explanation = `$${fmt(d)} \\times ${k} = ${fmt(miles)}$ miles.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: fmt(miles), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(fmt(miles), [fmt(k + d), fmt(k / d), fmt(miles * 2)], (j) => fmt(miles + 10 * j)), explanation }
    },
  },
  // ---------- Geometry and Trigonometry ----------
  {
    id: 'circle-area', domain: GEO, skill: 'Area and volume', tiers: ['easy'], formats: ['mc'],
    generate(rng) {
      const r = rng.int(2, 12), askArea = rng.chance(0.5)
      const stem = `The figure shows a circle with radius ${r}. What is the ${askArea ? 'area' : 'circumference'} of the circle?`
      const correct = askArea ? `$${r * r}\\pi$` : `$${2 * r}\\pi$`
      return { stem, stimulusSvg: svgCircle(r), type: 'multiple_choice', options: uniqueOptions(correct, [askArea ? `$${2 * r}\\pi$` : `$${r * r}\\pi$`, `$${r}\\pi$`, `$${4 * r}\\pi$`], (k) => `$${r * r + k}\\pi$`), explanation: askArea ? `$A = \\pi r^2 = \\pi(${r})^2 = ${r * r}\\pi$.` : `$C = 2\\pi r = 2\\pi(${r}) = ${2 * r}\\pi$.` }
    },
  },
  {
    id: 'pythagorean', domain: GEO, skill: 'Right triangles and trigonometry', tiers: ['easy', 'medium'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [12, 16, 20], [9, 40, 41], [20, 21, 29]])
      const findHyp = tier === 'easy' || rng.chance(0.5)
      const stem = findHyp ? `In the right triangle shown, the two legs have lengths ${a} and ${b}. What is the length of the hypotenuse?` : `In the right triangle shown, one leg has length ${b} and the hypotenuse has length ${c}. What is the length of the other leg?`
      const ans = findHyp ? c : a
      const svg = svgRightTriangle(a, b, c, { labelA: findHyp ? a : '?', labelB: b, labelC: findHyp ? '?' : c })
      const explanation = findHyp ? `$c^2 = ${a}^2 + ${b}^2 = ${a * a + b * b}$, so $c = ${c}$.` : `$a^2 = ${c}^2 - ${b}^2 = ${c * c - b * b}$, so $a = ${a}$.`
      if (format === 'spr') return { stem, stimulusSvg: svg, type: 'spr', correctAnswer: String(ans), explanation }
      return { stem, stimulusSvg: svg, type: 'multiple_choice', options: uniqueOptions(ans, [findHyp ? a + b : c - b, findHyp ? a * a + b * b : c * c - b * b, ans + 1], (k) => ans + k + 1), explanation }
    },
  },
  {
    id: 'triangle-angles', domain: GEO, skill: 'Lines, angles, and triangles', tiers: ['easy'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const a = rng.int(25, 80), b = rng.int(25, 80), x = 180 - a - b
      const stem = `In the triangle shown, two of the angles measure $${a}°$ and $${b}°$. What is the value of $x$?`
      const explanation = `The angles of a triangle sum to $180°$: $x = 180 - ${a} - ${b} = ${x}$.`
      if (format === 'spr') return { stem, stimulusSvg: svgTriangleAngles(a, b), type: 'spr', correctAnswer: String(x), explanation }
      return { stem, stimulusSvg: svgTriangleAngles(a, b), type: 'multiple_choice', options: uniqueOptions(x, [a + b, 360 - a - b, 90 - Math.abs(a - b)], (k) => x + 5 * k), explanation }
    },
  },
  {
    id: 'cylinder-volume', domain: GEO, skill: 'Area and volume', tiers: ['medium'], formats: ['mc'],
    generate(rng) {
      const r = rng.int(2, 8), h = rng.int(3, 12)
      const v = r * r * h
      return { stem: `A right circular cylinder has a radius of ${r} centimeters and a height of ${h} centimeters. What is the volume of the cylinder, in cubic centimeters?`, type: 'multiple_choice', options: uniqueOptions(`$${v}\\pi$`, [`$${2 * r * h}\\pi$`, `$${r * h}\\pi$`, `$${r * r * h * 2}\\pi$`], (k) => `$${v + r * k}\\pi$`), explanation: `$V = \\pi r^2 h = \\pi(${r})^2(${h}) = ${v}\\pi$ cubic centimeters.` }
    },
  },
  {
    id: 'trig-ratio', domain: GEO, skill: 'Right triangles and trigonometry', tiers: ['medium', 'hard'], formats: ['mc'],
    generate(rng, tier) {
      const [a, b, c] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]])
      const fn = rng.pick(['sin', 'cos', 'tan'])
      // angle A is opposite side a (vertical leg), adjacent side b (horizontal leg)
      const val = fn === 'sin' ? [a, c] : fn === 'cos' ? [b, c] : [a, b]
      const svg = svgRightTriangle(a, b, c, { angleLabel: 'A' })
      const opt = (n, d) => `$${frac(n, d)}$`
      const stem = `In the right triangle shown, angle $A$ is opposite the side of length ${a}. What is the value of $\\${fn} A$?`
      const wrong = [[b, c], [a, c], [a, b], [b, a], [c, a]].filter(([n, d]) => !(n === val[0] && d === val[1]))
      return { stem, stimulusSvg: svg, type: 'multiple_choice', options: uniqueOptions(opt(...val), wrong.map(([n, d]) => opt(n, d)), (k) => opt(val[0] + k, val[1])), explanation: `$\\${fn} A = \\dfrac{\\text{${fn === 'sin' ? 'opposite' : fn === 'cos' ? 'adjacent' : 'opposite'}}}{\\text{${fn === 'tan' ? 'adjacent' : 'hypotenuse'}}} = \\dfrac{${val[0]}}{${val[1]}}$.` }
    },
  },
  {
    id: 'circle-equation', domain: GEO, skill: 'Circles', tiers: ['medium', 'hard'], formats: ['mc', 'spr'],
    generate(rng, tier, format) {
      const h = rng.int(-6, 6), k = rng.int(-6, 6), r = rng.int(2, 9)
      if (tier === 'hard') {
        const D = -2 * h, E = -2 * k, F = h * h + k * k - r * r
        const stem = `The equation $x^2 + y^2 ${term(D, 'x')}${term(E, 'y')} ${sgn(F)} ${Math.abs(F)} = 0$ represents a circle in the $xy$-plane. What is the radius of the circle?`
        const explanation = `Complete the square: $(x ${sgn(-h)} ${Math.abs(h)})^2 + (y ${sgn(-k)} ${Math.abs(k)})^2 = ${r * r}$, so the radius is $${r}$.`
        if (format === 'spr') return { stem, type: 'spr', correctAnswer: String(r), explanation }
        return { stem, type: 'multiple_choice', options: uniqueOptions(r, [r * r, Math.abs(F), Math.abs(h) + Math.abs(k)], (j) => r + j), explanation }
      }
      const stem = `A circle in the $xy$-plane has the equation $(x ${sgn(-h)} ${Math.abs(h)})^2 + (y ${sgn(-k)} ${Math.abs(k)})^2 = ${r * r}$. What are the coordinates of the center of the circle?`
      const pt = (x, y) => `$(${x}, ${y})$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(pt(h, k), [pt(-h, -k), pt(k, h), pt(h, -k)], (j) => pt(h + j, k)), explanation: `The standard form $(x - h)^2 + (y - k)^2 = r^2$ has center $(h, k) = (${h}, ${k})$.` }
    },
  },
  {
    id: 'similar-triangles', domain: GEO, skill: 'Lines, angles, and triangles', tiers: ['hard'], formats: ['spr', 'mc'],
    generate(rng, tier, format) {
      const a = rng.int(3, 9), b = rng.int(4, 12), k = rng.pick([2, 3, 4, 1.5, 2.5])
      const a2 = a * k, b2 = b * k
      const stem = `Triangle $ABC$ is similar to triangle $DEF$, where $A$ corresponds to $D$ and $B$ corresponds to $E$. The length of $\\overline{AB}$ is ${a}, the length of $\\overline{BC}$ is ${b}, and the length of $\\overline{DE}$ is ${fmt(a2)}. What is the length of $\\overline{EF}$?`
      const explanation = `Corresponding sides are proportional: $\\dfrac{EF}{${b}} = \\dfrac{${fmt(a2)}}{${a}} = ${fmt(k)}$, so $EF = ${fmt(b2)}$.`
      if (format === 'spr') return { stem, type: 'spr', correctAnswer: fmt(b2), explanation }
      return { stem, type: 'multiple_choice', options: uniqueOptions(fmt(b2), [fmt(b + (a2 - a)), fmt(b / k), fmt(a2 + b)], (j) => fmt(b2 + j)), explanation }
    },
  },
  {
    id: 'arc-length', domain: GEO, skill: 'Circles', tiers: ['hard'], formats: ['mc'],
    generate(rng) {
      const r = rng.pick([3, 6, 9, 12, 18]), deg = rng.pick([30, 45, 60, 90, 120, 135, 150])
      const num = deg * 2 * r, den = 360
      const stem = `A circle has a radius of ${r}. An arc of the circle has a central angle of $${deg}°$. What is the length of the arc?`
      const opt = (n, d) => `$${frac(n, d)}\\pi$`
      return { stem, type: 'multiple_choice', options: uniqueOptions(opt(num, den), [opt(deg * r * r, den), opt(num * 2, den), opt(deg * r, den)], (k) => opt(num + k * 36, den)), explanation: `Arc length $= \\dfrac{${deg}}{360} \\cdot 2\\pi(${r}) = ${frac(num, den)}\\pi$.` }
    },
  },
]
