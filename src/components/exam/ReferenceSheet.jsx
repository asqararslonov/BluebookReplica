import { useExamStore } from '../../store/exam-store.js'
import { InlineRich } from '../../lib/rich-text.jsx'
import FloatingWindow from './FloatingWindow.jsx'

const S = { stroke: '#1e1e1e', strokeWidth: 1.6, fill: 'none' }
const L = { fontFamily: 'Noto Serif, serif', fontSize: 13, fontStyle: 'italic', fill: '#1e1e1e' }

function Figure({ children, formula, label }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded border border-bb-gray-200 p-2">
      <svg viewBox="0 0 120 84" width="120" height="84" aria-label={label}>{children}</svg>
      <div className="bb-content text-center !text-[14px] !leading-tight"><InlineRich text={formula} /></div>
    </div>
  )
}

export default function ReferenceSheet() {
  const setOpen = useExamStore((s) => s.setReferenceOpen)
  const initial = { x: Math.max(16, window.innerWidth - 700), y: 104, w: 660, h: Math.min(640, window.innerHeight - 180) }
  return (
    <FloatingWindow title="Reference" initial={initial} minWidth={520} minHeight={360} onClose={() => setOpen(false)}>
      <div className="bb-scroll h-full overflow-y-auto bg-white p-4">
        <div className="grid grid-cols-4 gap-3">
          <Figure label="Circle" formula={'$A = \\pi r^2$\n$C = 2\\pi r$'}>
            <circle cx="60" cy="42" r="30" {...S} /><line x1="60" y1="42" x2="90" y2="42" {...S} /><text x="72" y="38" {...L}>r</text>
          </Figure>
          <Figure label="Rectangle" formula="$A = \ell w$">
            <rect x="20" y="22" width="80" height="44" {...S} /><text x="57" y="16" {...L}>ℓ</text><text x="106" y="48" {...L}>w</text>
          </Figure>
          <Figure label="Triangle" formula="$A = \frac{1}{2} b h$">
            <polygon points="20,70 100,70 60,14" {...S} /><line x1="60" y1="14" x2="60" y2="70" stroke="#1e1e1e" strokeDasharray="3 3" /><text x="56" y="82" {...L}>b</text><text x="64" y="46" {...L}>h</text>
          </Figure>
          <Figure label="Right triangle" formula="$c^2 = a^2 + b^2$">
            <polygon points="20,70 100,70 100,14" {...S} /><rect x="90" y="60" width="10" height="10" {...S} /><text x="56" y="82" {...L}>b</text><text x="104" y="46" {...L}>a</text><text x="50" y="40" {...L}>c</text>
          </Figure>
          <Figure label="Special right triangle 30-60-90" formula="$x,\ x\sqrt{3},\ 2x$">
            <polygon points="16,70 104,70 104,20" {...S} /><rect x="94" y="60" width="10" height="10" {...S} /><text x="56" y="82" {...L}>x√3</text><text x="108" y="48" {...L}>x</text><text x="46" y="42" {...L}>2x</text><text x="24" y="66" {...L} fontSize="10">30°</text><text x="88" y="32" {...L} fontSize="10">60°</text>
          </Figure>
          <Figure label="Special right triangle 45-45-90" formula="$s,\ s,\ s\sqrt{2}$">
            <polygon points="24,70 96,70 96,0" {...S} /><rect x="86" y="60" width="10" height="10" {...S} /><text x="56" y="82" {...L}>s</text><text x="100" y="40" {...L}>s</text><text x="40" y="38" {...L}>s√2</text><text x="32" y="66" {...L} fontSize="10">45°</text><text x="82" y="16" {...L} fontSize="10">45°</text>
          </Figure>
          <Figure label="Rectangular solid" formula="$V = \ell w h$">
            <rect x="22" y="30" width="56" height="40" {...S} /><polygon points="22,30 40,14 96,14 78,30" {...S} /><polygon points="78,30 96,14 96,54 78,70" {...S} /><text x="46" y="82" {...L}>ℓ</text><text x="100" y="40" {...L}>h</text><text x="90" y="10" {...L}>w</text>
          </Figure>
          <Figure label="Cylinder" formula="$V = \pi r^2 h$">
            <ellipse cx="60" cy="20" rx="30" ry="9" {...S} /><path d="M30 20 V64 A30 9 0 0 0 90 64 V20" {...S} /><line x1="60" y1="20" x2="90" y2="20" {...S} /><text x="72" y="16" {...L}>r</text><text x="94" y="46" {...L}>h</text>
          </Figure>
          <Figure label="Sphere" formula="$V = \frac{4}{3}\pi r^3$">
            <circle cx="60" cy="42" r="30" {...S} /><ellipse cx="60" cy="42" rx="30" ry="9" {...S} strokeDasharray="3 3" /><line x1="60" y1="42" x2="90" y2="42" {...S} /><text x="72" y="38" {...L}>r</text>
          </Figure>
          <Figure label="Cone" formula="$V = \frac{1}{3}\pi r^2 h$">
            <ellipse cx="60" cy="66" rx="30" ry="9" {...S} /><path d="M30 66 L60 8 L90 66" {...S} /><line x1="60" y1="8" x2="60" y2="66" stroke="#1e1e1e" strokeDasharray="3 3" /><line x1="60" y1="66" x2="90" y2="66" {...S} /><text x="72" y="62" {...L}>r</text><text x="64" y="40" {...L}>h</text>
          </Figure>
          <Figure label="Pyramid" formula="$V = \frac{1}{3}\ell w h$">
            <polygon points="20,66 76,66 100,50 44,50" {...S} /><path d="M20 66 L58 10 L76 66 M44 50 L58 10 L100 50" {...S} /><line x1="58" y1="10" x2="58" y2="58" stroke="#1e1e1e" strokeDasharray="3 3" /><text x="44" y="80" {...L}>ℓ</text><text x="92" y="66" {...L}>w</text><text x="62" y="40" {...L}>h</text>
          </Figure>
        </div>
        <div className="bb-content mt-4 !text-[14px]">
          <p>The number of degrees of arc in a circle is 360.</p>
          <p><InlineRich text="The number of radians of arc in a circle is $2\\pi$." /></p>
          <p>The sum of the measures in degrees of the angles of a triangle is 180.</p>
        </div>
      </div>
    </FloatingWindow>
  )
}
