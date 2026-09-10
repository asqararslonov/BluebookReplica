// Bluebook wordmark + star mark.
export function BluebookMark({ size = 33, color = '#324dc7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" aria-hidden="true">
      <g fill={color} stroke={color} strokeWidth="6" strokeLinejoin="round">
        <polygon points="150,60 330,268 228,240 176,340" />
        <polygon points="60,208 135,177 132,232" />
        <polygon points="318,100 248,138 270,166" />
      </g>
    </svg>
  )
}

export function BluebookLogo({ color = '#324dc7', size = 33, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <BluebookMark size={size} color={color} />
      <span className="font-bold tracking-tight" style={{ color, fontSize: size * 1.05 }}>Bluebook</span>
      <sup className="-ml-0.5 text-[9px] font-bold" style={{ color }}>TM</sup>
    </span>
  )
}

export function Dots() {
  return <div className="bb-dots" aria-hidden="true">{Array.from({ length: 8 }).map((_, i) => <i key={i} />)}</div>
}

export function SegToggle({ value, onChange, options = ['Active', 'Past'] }) {
  return (
    <div className="bb-seg" role="tablist">
      {options.map((o) => (
        <button key={o} type="button" role="tab" aria-selected={value === o} className={value === o ? 'active' : ''} onClick={() => onChange(o)}>
          {value === o && <span aria-hidden="true">✓</span>} {o}
        </button>
      ))}
    </div>
  )
}

export const BUILD_STAMP = `VSN-1.0.0 BT-${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'}`
