// Renders question/passage text with inline markup and KaTeX math.
//   $...$  inline math     $$...$$ display math
//   **bold** *italic* __underline__   [[blank]] -> fill-in blank
//   blank line = new paragraph, "- " lines = bullet list
import katex from 'katex'
import { useMemo } from 'react'

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderMath(expr, displayMode) {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode, strict: 'ignore', output: 'htmlAndMathml' })
  } catch {
    return `<code>${escapeHtml(expr)}</code>`
  }
}

const DOLLAR = '\u0001'
function inlineMarkup(text) {
  let html = escapeHtml(text).split(DOLLAR).join('$')
  html = html.replace(/\[\[blank\]\]/g, '<span class="bb-blank" aria-label="blank"></span>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<u>$1</u>')
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
  html = html.replace(/\n/g, '<br />')
  return html
}

// Split a string into text and math tokens.
function tokenize(src) {
  const tokens = []
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let last = 0
  let m
  while ((m = re.exec(src))) {
    if (m.index > last) tokens.push({ type: 'text', value: src.slice(last, m.index) })
    if (m[1] !== undefined) tokens.push({ type: 'display', value: m[1] })
    else tokens.push({ type: 'inline', value: m[2] })
    last = re.lastIndex
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) })
  return tokens
}

function renderInline(src) {
  return tokenize(String(src).replace(/\\\$/g, DOLLAR))
    .map((t) => {
      if (t.type === 'text') return inlineMarkup(t.value)
      if (t.type === 'inline') return renderMath(t.value, false)
      return renderMath(t.value, true)
    })
    .join('')
}

export function toHtml(text) {
  if (!text) return ''
  const paragraphs = String(text).replace(/\r\n/g, '\n').split(/\n{2,}/)
  return paragraphs
    .map((p) => {
      const lines = p.split('\n')
      if (lines.length > 0 && lines.every((l) => /^\s*-\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${renderInline(l.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`
      }
      if (/^\s*\$\$[\s\S]*\$\$\s*$/.test(p)) return renderInline(p.trim())
      return `<p>${renderInline(p)}</p>`
    })
    .join('')
}

export function tableHtml(table) {
  if (!table) return ''
  const caption = table.caption ? `<caption>${renderInline(table.caption)}</caption>` : ''
  const head = table.headers?.length
    ? `<thead><tr>${table.headers.map((h) => `<th>${renderInline(String(h))}</th>`).join('')}</tr></thead>`
    : ''
  const body = `<tbody>${(table.rows || []).map((r) => `<tr>${r.map((c) => `<td>${renderInline(String(c))}</td>`).join('')}</tr>`).join('')}</tbody>`
  return `<table>${caption}${head}${body}</table>`
}

export function figureHtml(q) {
  if (q.stimulusSvg) return `<figure>${q.stimulusSvg}${q.figureCaption ? `<figcaption>${escapeHtml(q.figureCaption)}</figcaption>` : ''}</figure>`
  if (q.stimulusImage) return `<figure><img src="${escapeHtml(q.stimulusImage)}" alt="${escapeHtml(q.imageAlt || 'Figure')}" />${q.figureCaption ? `<figcaption>${escapeHtml(q.figureCaption)}</figcaption>` : ''}</figure>`
  return ''
}

export function RichText({ text, className = '', as: Tag = 'div' }) {
  const html = useMemo(() => toHtml(text), [text])
  return <Tag className={`bb-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export function InlineRich({ text, className = '' }) {
  const html = useMemo(() => renderInline(text || ''), [text])
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function fractionPreview(value) {
  // Renders an SPR answer preview (fractions shown as stacked fractions like Bluebook)
  if (!value) return ''
  const m = /^(-?)(\d+)\/(\d+)$/.exec(value)
  if (m) return renderMath(`${m[1]}\\frac{${m[2]}}{${m[3]}}`, false)
  return renderMath(value.replace(/-/g, '-'), false)
}
