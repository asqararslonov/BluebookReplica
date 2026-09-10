// DOM helpers to persist text highlights as character offsets and re-apply them.

export function selectionOffsets(container) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null
  const pre = document.createRange()
  pre.selectNodeContents(container)
  pre.setEnd(range.startContainer, range.startOffset)
  const start = pre.toString().length
  const text = range.toString()
  if (!text.trim()) return null
  return { start, end: start + text.length, text }
}

function textNodes(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes = []
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  return nodes
}

export function applyHighlights(container, highlights) {
  if (!container) return
  const sorted = [...(highlights || [])].sort((a, b) => a.start - b.start)
  for (const h of sorted) {
    let pos = 0
    for (const node of textNodes(container)) {
      const len = node.nodeValue.length
      const nodeStart = pos
      const nodeEnd = pos + len
      pos = nodeEnd
      if (nodeEnd <= h.start || nodeStart >= h.end) continue
      if (node.parentElement?.closest('.katex-mathml')) continue
      const from = Math.max(h.start, nodeStart) - nodeStart
      const to = Math.min(h.end, nodeEnd) - nodeStart
      let target = node
      if (from > 0) target = target.splitText(from)
      if (to - from < target.nodeValue.length) target.splitText(to - from)
      const mark = document.createElement('mark')
      mark.className = `bb-hl bb-hl-${h.color || 'yellow'}`
      mark.dataset.id = h.id
      target.parentNode.insertBefore(mark, target)
      mark.appendChild(target)
      // A note pin after the last fragment of an annotation.
      if (h.note && nodeEnd >= h.end) {
        const pin = document.createElement('span')
        pin.className = 'bb-note-pin'
        pin.dataset.id = h.id
        pin.textContent = '✎'
        mark.after(pin)
      }
    }
  }
}

export function clearSelection() {
  const sel = window.getSelection()
  if (sel) sel.removeAllRanges()
}
