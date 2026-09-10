import { fractionPreview } from '../../lib/rich-text.jsx'

export function sanitizeSpr(raw) {
  let v = String(raw).replace(/[^0-9./-]/g, '')
  const negative = v.startsWith('-')
  v = v.replace(/-/g, '')
  let seenSeparator = false
  v = v.split('').filter((ch) => {
    if (ch === '.' || ch === '/') { if (seenSeparator) return false; seenSeparator = true }
    return true
  }).join('')
  v = (negative ? '-' : '') + v
  return v.slice(0, negative ? 6 : 5)
}

export default function SprInput({ value, onChange }) {
  return (
    <div className="mt-2">
      <input
        type="text"
        inputMode="decimal"
        aria-label="Your answer"
        value={value}
        onChange={(e) => onChange(sanitizeSpr(e.target.value))}
        className="h-12 w-[220px] rounded border-2 border-bb-black px-3 font-serif text-[20px] focus:border-bb-blue focus:outline-none"
        autoComplete="off"
        spellCheck={false}
      />
      <div className="mt-3 text-[14px] font-semibold">Answer Preview:</div>
      <div className="bb-content mt-1 min-h-[36px] !text-[22px]" dangerouslySetInnerHTML={{ __html: fractionPreview(value) }} />
    </div>
  )
}
