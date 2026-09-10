// Illustrations for the Practice and Prepare cards (Test Preview, Full-Length Practice).
// Flat vector art drawn inline so no external assets are needed.

const OUTLINE = '#4a4a4a'
const SKY = '#4aa3e0'

// "Test Preview" tile art: dashed circle, timer badge, bulleted browser window, calculator.
export function PreviewIcon() {
  const keyRows = [52, 62, 72]
  const keyCols = [104, 117, 130]
  return (
    <svg
      width="112"
      height="90"
      viewBox="0 0 150 120"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinejoin="round"
    >
      {/* Dashed backdrop circle, centered slightly right */}
      <circle cx="82" cy="58" r="48" stroke="#c9c9c9" strokeWidth="2" strokeDasharray="5 5" />

      {/* Browser window (bottom-left) */}
      <rect x="8" y="54" width="72" height="58" rx="4" fill="#ffffff" />
      <path d="M12 54H76a4 4 0 0 1 4 4v8H8v-8a4 4 0 0 1 4-4z" fill={SKY} />
      <circle cx="14" cy="60" r="1.5" fill="#ffffff" />
      <circle cx="19" cy="60" r="1.5" fill="#ffffff" />
      <circle cx="24" cy="60" r="1.5" fill="#ffffff" />
      <line x1="8" y1="66" x2="80" y2="66" stroke={OUTLINE} strokeWidth="2" />
      <rect x="8" y="54" width="72" height="58" rx="4" stroke={OUTLINE} strokeWidth="2" />
      {/* Bulleted list */}
      <circle cx="17" cy="77" r="1.8" fill="#6b6b6b" />
      <rect x="22" y="75.5" width="42" height="3" rx="1.5" fill="#6b6b6b" />
      <circle cx="17" cy="89" r="1.8" fill="#6b6b6b" />
      <rect x="22" y="87.5" width="34" height="3" rx="1.5" fill="#6b6b6b" />
      <circle cx="17" cy="101" r="1.8" fill="#6b6b6b" />
      <rect x="22" y="99.5" width="38" height="3" rx="1.5" fill="#6b6b6b" />

      {/* Timer badge (top-left) */}
      <rect x="10" y="14" width="50" height="24" rx="5" fill="#ffffff" stroke={OUTLINE} strokeWidth="2" />
      <text
        x="35"
        y="30"
        textAnchor="middle"
        fontFamily="Roboto, Arial, sans-serif"
        fontSize="11"
        fontWeight="500"
        fill={OUTLINE}
      >
        00:00
      </text>

      {/* Calculator (right) */}
      <rect x="98" y="28" width="46" height="70" rx="5" fill={OUTLINE} />
      <rect x="104" y="35" width="34" height="12" rx="2" fill="#a9d6f2" />
      {keyRows.map((y) =>
        keyCols.map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="8" height="7" rx="1.5" fill="#ffffff" />
        )),
      )}
      <rect x="104" y="82" width="21" height="7" rx="1.5" fill="#ffffff" />
      <rect x="130" y="82" width="8" height="7" rx="1.5" fill="#ffffff" />
    </svg>
  )
}

// "Full-Length Practice" tile art: browser window with a blue body and a white document sheet.
export function FullLengthIcon() {
  return (
    <svg
      width="112"
      height="90"
      viewBox="0 0 150 120"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinejoin="round"
    >
      {/* Window body (blue) with rounded bottom corners */}
      <path d="M11 24H139v81a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V24z" fill={SKY} />
      {/* Diagonal highlight across the top-right of the blue area */}
      <polygon points="85,24 115,24 139,48 139,78" fill="#8fc7ee" opacity="0.45" />

      {/* Document sheet: inset 10px left/right, touching the bottom edge */}
      <path d="M21 39a3 3 0 0 1 3-3h102a3 3 0 0 1 3 3v71H21V39z" fill="#ffffff" />
      <rect x="31" y="46" width="50" height="7" rx="2" fill={OUTLINE} />
      <rect x="31" y="60" width="86" height="4" rx="2" fill="#c9c9c9" />
      <rect x="31" y="70" width="86" height="4" rx="2" fill="#c9c9c9" />
      <rect x="31" y="80" width="60" height="4" rx="2" fill="#c9c9c9" />

      {/* Title bar (light gray) with rounded top corners and traffic-light dots */}
      <path d="M16 10H134a5 5 0 0 1 5 5v9H11v-9a5 5 0 0 1 5-5z" fill="#e6e6e6" />
      <circle cx="19" cy="17" r="2.5" fill="#e5534b" />
      <circle cx="27" cy="17" r="2.5" fill="#f2c94c" />
      <circle cx="35" cy="17" r="2.5" fill="#4caf50" />
      <line x1="11" y1="24" x2="139" y2="24" stroke={OUTLINE} strokeWidth="2" />

      {/* Window outline */}
      <rect x="11" y="10" width="128" height="100" rx="5" stroke={OUTLINE} strokeWidth="2" />
    </svg>
  )
}
