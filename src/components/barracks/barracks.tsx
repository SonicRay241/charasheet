/**
 * The barracks dressing for the character list: a bunk bed behind each
 * character's footlocker, and the notice board in the header.
 */

const BLANKETS = ['#7a2e24', '#3d4a5c', '#5d4d2c', '#4a5a3a', '#6b3a52']

/** A small stable number from a string, so each bunk keeps its look. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** The ticking stripes of a bare mattress. */
function Ticking({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#e4d8bd" />
      {Array.from({ length: Math.floor(w / 9) }, (_, i) => (
        <rect key={i} x={x + 4 + i * 9} y={y + 1} width={2} height={h - 2} fill="#8a9bb0" opacity={0.45} />
      ))}
    </g>
  )
}

/** One bunk of the pair: mattress, blanket, pillow (or bare, if nobody's in it). */
function Berth({ y, blanket, made, empty }: { y: number; blanket: string; made: boolean; empty?: boolean }) {
  return (
    <g>
      {empty ? (
        <Ticking x={26} y={y} w={250} h={16} />
      ) : (
        <>
          <rect x={26} y={y + 2} width={250} height={14} rx={3} fill="#e4d8bd" />
          <rect x={30} y={y - 8} width={46} height={14} rx={6} fill="#f1e8d6" />
          {made ? (
            <path d={`M82 ${y} H274 V${y + 20} H82 Z`} fill={blanket} />
          ) : (
            <path d={`M92 ${y + 1} q40 -9 90 -2 q50 6 92 -1 V${y + 20} H92 Z`} fill={blanket} />
          )}
          <path d={`M82 ${y + 4} H274`} stroke="rgb(0 0 0 / .18)" strokeWidth={2} />
        </>
      )}
      <rect x={16} y={y + 16} width={268} height={11} fill="#6b4526" />
      <rect x={16} y={y + 16} width={268} height={3} fill="#8a5a34" />
    </g>
  )
}

/** Something hanging off the bed post: a cloak, a helmet, a sword, or nothing. */
function Kit({ kind }: { kind: number }) {
  switch (kind) {
    case 0:
      return (
        <g>
          <circle cx={20} cy={16} r={3} fill="#3a2414" />
          <path d="M20 16 C6 22 4 58 9 88 H33 C37 58 34 22 20 16 Z" fill="#4a3b2c" />
          <path d="M20 16 C14 30 14 60 16 88" stroke="rgb(0 0 0 / .25)" strokeWidth={2} fill="none" />
        </g>
      )
    case 1:
      return (
        <g>
          <circle cx={20} cy={20} r={3} fill="#3a2414" />
          <path d="M8 44 Q8 22 20 22 Q32 22 32 44 Z" fill="#8f949b" />
          <rect x={6} y={42} width={28} height={5} rx={2} fill="#6d727a" />
          <rect x={18} y={26} width={4} height={18} fill="#6d727a" />
        </g>
      )
    case 2:
      return (
        <g>
          <circle cx={20} cy={14} r={3} fill="#3a2414" />
          <path d="M20 14 L20 22" stroke="#3a2414" strokeWidth={2} />
          <rect x={17} y={22} width={6} height={60} rx={2} fill="#3b2a1c" />
          <rect x={11} y={20} width={18} height={4} rx={2} fill="#b89a52" />
          <circle cx={20} cy={18} r={3} fill="#b89a52" />
        </g>
      )
    default:
      return null
  }
}

/** A bunk bed seen side on, against the barracks wall. */
export function BunkBed({ seed, empty }: { seed: string; empty?: boolean }) {
  const h = hash(seed)
  const lower = BLANKETS[h % BLANKETS.length]
  const upper = BLANKETS[(h >>> 3) % BLANKETS.length]
  return (
    <svg className="bunk-bed" viewBox="0 0 300 172" aria-hidden="true">
      <rect x={16} y={132} width={268} height={32} fill="rgb(0 0 0 / .18)" />
      {/* posts */}
      <rect x={10} y={6} width={10} height={160} rx={2} fill="#5a3920" />
      <rect x={280} y={6} width={10} height={160} rx={2} fill="#5a3920" />
      <rect x={8} y={4} width={14} height={6} rx={2} fill="#6b4526" />
      <rect x={278} y={4} width={14} height={6} rx={2} fill="#6b4526" />
      <Berth y={40} blanket={upper} made={((h >>> 6) & 1) === 1} empty={empty} />
      <Berth y={108} blanket={lower} made={((h >>> 7) & 1) === 1} empty={empty} />
      {/* the ladder up the far end */}
      {[70, 86, 102].map((y) => (
        <rect key={y} x={262} y={y} width={18} height={4} rx={1} fill="#6b4526" />
      ))}
      <rect x={260} y={56} width={4} height={62} fill="#5a3920" />
      {!empty && <Kit kind={(h >>> 9) % 4} />}
    </svg>
  )
}

/** The board by the door: the roll call, and whatever else got pinned up. */
export function NoticeBoard({ count }: { count: number }) {
  return (
    <div className="notice-board" aria-label={`${count} on the roll`}>
      <div className="note note-roll">
        <span className="terminal-label">On the roll</span>
        <b>{count}</b>
      </div>
      <div className="note note-a">Lights out at the tenth bell.</div>
      <div className="note note-b">Footlockers are subject to inspection. — The Quartermaster</div>
      <div className="note note-c">Lost: one boot (left). See the quartermaster.</div>
    </div>
  )
}
