/**
 * The barracks dressing for the character list: a bunk bed behind each
 * character's footlocker (with the character in it), and the notice board in
 * the header.
 * The dressing's paint is in index.css (multi-layer gradients, pseudo
 * elements and keyframes don't belong in markup); layout and placement are
 * Tailwind right here.
 */
import type { ReactNode } from 'react'
import { hash, looksOf, type Looks } from './looks'

const BLANKETS = ['#7a2e24', '#3d4a5c', '#5d4d2c', '#4a5a3a', '#6b3a52']
const BOOKS = ['#7a2e24', '#2f4d3a', '#28405e', '#6b4b1f']
/**
 * What the bunk's owner is doing: lying down (asleep, reading, or an arm over
 * the side of the top bunk), perched on the edge of the top bunk with their
 * legs swinging, or sitting on the edge of the bottom one with a hot mug.
 */
const POSES = ['sleeping', 'reading', 'dangling', 'perched', 'sitting'] as const
type Pose = (typeof POSES)[number]
const LYING: readonly Pose[] = ['sleeping', 'reading', 'dangling']

/** Whoever the bunk belongs to, and how they're spending the evening. */
interface Occupant extends Looks {
  pose: Pose
  book: string
  /** Where along the bunk someone sitting sits. */
  x: number
  /** Negative animation delay, so neighbours don't move in step. */
  delay: string
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

/**
 * Someone lying in a berth on their back, head on the pillow and the blanket
 * up to their chest (it takes the shape of them): asleep, the z's rising, or
 * reading. An arm over the side is drawn by Berth, in front of the frame.
 */
function Sleeper({ y, blanket, who }: { y: number; blanket: string; who: Occupant }) {
  const reading = who.pose === 'reading'
  const head = reading ? { x: 54, y: y - 12 } : { x: 52, y: y - 6 }
  const chest = `M70 ${y + 4} C74 ${y - 8} 96 ${y - 12} 118 ${y - 7}`
  return (
    <g>
      {reading && <rect x={30} y={y - 16} width={40} height={12} rx={6} fill="#e8dcc4" />}
      <ellipse cx={head.x + 13} cy={head.y + 6} rx={10} ry={7} fill={who.shirt} />
      <g className="bunk-body" style={{ animationDelay: who.delay }}>
        <path
          d={`${chest} C146 ${y - 2} 172 ${y - 3} 196 ${y - 8} C212 ${y - 12} 228 ${y - 5} 238 ${y - 3} C250 ${y - 13} 264 ${y - 11} 270 ${y + 1} L274 ${y + 1} V${y + 20} H70 Z`}
          fill={blanket}
        />
        {/* the sheet, turned down over the blanket's edge */}
        <path d={chest} stroke="#efe6d2" strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
      <circle cx={head.x - 2} cy={head.y - 2} r={9.5} fill={who.hair} />
      <circle cx={head.x + 1} cy={head.y + 1} r={8} fill={who.skin} />
      {reading && (
        <g>
          <path d={`M${head.x + 14} ${y - 4} L84 ${y - 20}`} stroke={who.shirt} strokeWidth={5} strokeLinecap="round" />
          <circle cx={85} cy={y - 21} r={3} fill={who.skin} />
          <g transform={`rotate(-24 88 ${y - 26})`}>
            <rect x={80} y={y - 36} width={16} height={20} rx={1.5} fill={who.book} />
            <rect x={80} y={y - 36} width={3} height={20} fill="rgb(0 0 0 / .25)" />
          </g>
        </g>
      )}
      {who.pose === 'sleeping' && (
        <g className="bunk-zzz">
          <text x={head.x + 12} y={head.y - 7} fontSize={8}>z</text>
          <text x={head.x + 20} y={head.y - 13} fontSize={10}>z</text>
          <text x={head.x + 29} y={head.y - 19} fontSize={12}>z</text>
        </g>
      )}
    </g>
  )
}

/**
 * Someone sitting on the front edge of a berth, facing out: on the top bunk
 * with their legs swinging over the side, or on the bottom one with a mug
 * (their legs go down behind the footlocker). `seat` is the top of the frame.
 */
function Sitter({ seat, who }: { seat: number; who: Occupant }) {
  const x = who.x
  const perched = who.pose === 'perched'
  const leg = (dx: number, delay: string) => (
    <g className={perched ? 'bunk-swing' : undefined} style={{ animationDelay: delay }}>
      <rect x={x + dx - 3.5} y={seat - 2} width={7} height={perched ? 28 : 40} rx={3} fill={who.trousers} />
      <ellipse cx={x + dx} cy={seat + (perched ? 27 : 39)} rx={5} ry={3.5} fill="#2b1d12" />
    </g>
  )
  return (
    <g>
      {leg(-5, who.delay)}
      {leg(5, `calc(${who.delay} - .8s)`)}
      <path d={`M${x - 12} ${seat + 1} L${x - 10} ${seat - 19} Q${x} ${seat - 25} ${x + 10} ${seat - 19} L${x + 12} ${seat + 1} Z`} fill={who.shirt} />
      <rect x={x - 12} y={seat - 3} width={24} height={3.5} fill="#3a2414" />
      <rect x={x - 2.5} y={seat - 28} width={5} height={6} fill={who.skin} />
      <circle cx={x} cy={seat - 35} r={9.5} fill={who.hair} />
      <circle cx={x} cy={seat - 33} r={8} fill={who.skin} />
      {perched ? (
        <g fill="none" strokeLinecap="round">
          {/* hands on the edge of the mattress either side */}
          <path d={`M${x - 10} ${seat - 17} Q${x - 15} ${seat - 10} ${x - 16} ${seat - 2}`} stroke={who.shirt} strokeWidth={5} />
          <path d={`M${x + 10} ${seat - 17} Q${x + 15} ${seat - 10} ${x + 16} ${seat - 2}`} stroke={who.shirt} strokeWidth={5} />
          <circle cx={x - 16} cy={seat} r={3} fill={who.skin} />
          <circle cx={x + 16} cy={seat} r={3} fill={who.skin} />
        </g>
      ) : (
        <g>
          {/* a tin mug held off to one side, so the steam rises past their face, not across it */}
          <path d={`M${x - 10} ${seat - 17} Q${x - 8} ${seat - 8} ${x + 3} ${seat - 9}`} stroke={who.shirt} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={`M${x + 10} ${seat - 17} Q${x + 15} ${seat - 13} ${x + 15} ${seat - 10}`} stroke={who.shirt} strokeWidth={5} fill="none" strokeLinecap="round" />
          <rect x={x + 4} y={seat - 17} width={9} height={10} rx={1.5} fill="#b8bcc2" />
          <rect x={x + 4} y={seat - 14} width={9} height={2} fill="#8f949b" />
          <circle cx={x + 3.5} cy={seat - 10} r={2.8} fill={who.skin} />
          <circle cx={x + 14} cy={seat - 10} r={2.8} fill={who.skin} />
          <g className="bunk-steam" fill="none" stroke="#efe6d2" strokeWidth={1.5} strokeLinecap="round">
            <path d={`M${x + 11} ${seat - 19} q3 -3 1 -6 q-2 -3 2 -6`} />
            <path d={`M${x + 14} ${seat - 19} q3 -3 1 -6 q-2 -3 2 -6`} />
          </g>
        </g>
      )}
    </g>
  )
}

/** One bunk of the pair: mattress, blanket, pillow (or bare, if nobody's in it). */
function Berth({ y, blanket, made, empty, who }: { y: number; blanket: string; made: boolean; empty?: boolean; who?: Occupant }) {
  const lying = who && LYING.includes(who.pose)
  return (
    <g>
      {empty ? (
        <Ticking x={26} y={y} w={250} h={16} />
      ) : (
        <>
          <rect x={26} y={y + 2} width={250} height={14} rx={3} fill="#e4d8bd" />
          <rect x={30} y={y - 8} width={46} height={14} rx={6} fill="#f1e8d6" />
          {lying ? (
            <Sleeper y={y} blanket={blanket} who={who} />
          ) : (
            <>
              {made ? (
                <path d={`M82 ${y} H274 V${y + 20} H82 Z`} fill={blanket} />
              ) : (
                <path d={`M92 ${y + 1} q40 -9 90 -2 q50 6 92 -1 V${y + 20} H92 Z`} fill={blanket} />
              )}
              <path d={`M82 ${y + 4} H274`} stroke="rgb(0 0 0 / .18)" strokeWidth={2} />
            </>
          )}
        </>
      )}
      <rect x={16} y={y + 16} width={268} height={11} fill="#6b4526" />
      <rect x={16} y={y + 16} width={268} height={3} fill="#8a5a34" />
      {who && !lying && <Sitter seat={y + 16} who={who} />}
      {who?.pose === 'dangling' && (
        // from the shoulder, over the edge of the mattress and down past the frame
        <g className="bunk-dangle" style={{ animationDelay: who.delay }}>
          <path d={`M66 ${y + 1} C71 ${y + 5} 73 ${y + 11} 73 ${y + 18}`} stroke={who.shirt} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d={`M73 ${y + 18} C74 ${y + 26} 73 ${y + 32} 74 ${y + 38}`} stroke={who.skin} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <circle cx={74.5} cy={y + 40} r={3.4} fill={who.skin} />
        </g>
      )}
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

/**
 * A bunk bed seen side on, against the barracks wall. A character's bunk has
 * them in it (pose, looks and berth picked from their id, so they keep them);
 * an empty one is bare mattresses.
 */
export function BunkBed({ seed, empty }: { seed: string; empty?: boolean }) {
  const h = hash(seed)
  const lower = BLANKETS[h % BLANKETS.length]
  const upper = BLANKETS[(h >>> 3) % BLANKETS.length]
  const pose = POSES[(h >>> 11) % POSES.length]
  const who: Occupant | undefined = empty
    ? undefined
    : {
        pose,
        ...looksOf(seed),
        book: BOOKS[(h >>> 24) % BOOKS.length],
        x: 120 + ((h >>> 26) % 5) * 18,
        delay: `-${((h >>> 25) % 40) / 10}s`,
      }
  // An arm or legs can only hang over the side from the top bunk; the mug is
  // had on the bottom one; lying down, either.
  const upstairs = pose === 'dangling' || pose === 'perched' || (pose !== 'sitting' && ((h >>> 13) & 1) === 1)

  return (
    <svg className="bunk-bed" viewBox="0 0 300 172" aria-hidden="true" data-pose={who?.pose}>
      <rect x={16} y={132} width={268} height={32} fill="rgb(0 0 0 / .18)" />
      {/* posts */}
      <rect x={10} y={6} width={10} height={160} rx={2} fill="#5a3920" />
      <rect x={280} y={6} width={10} height={160} rx={2} fill="#5a3920" />
      <rect x={8} y={4} width={14} height={6} rx={2} fill="#6b4526" />
      <rect x={278} y={4} width={14} height={6} rx={2} fill="#6b4526" />
      <Berth y={40} blanket={upper} made={((h >>> 6) & 1) === 1} empty={empty} who={upstairs ? who : undefined} />
      <Berth y={108} blanket={lower} made={((h >>> 7) & 1) === 1} empty={empty} who={upstairs ? undefined : who} />
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

/**
 * One bay along the wall: the bunk against it, and on its strip of floor the
 * footlocker in front (or, vacant, the chalk outline of where one would go).
 * Layout and placement in Tailwind; the bunk's and locker's looks live in
 * index.css (.bunk-bay .footlocker's overlap, .bunk-bay::before's floor).
 */
export function BunkBay({
  seed,
  empty = false,
  arriving = false,
  spare = false,
  vacant,
  children,
  className = '',
  'aria-hidden': ariaHidden,
}: {
  seed: string
  empty?: boolean
  /** Just joined: the footlocker is carried in and set down (see motion.ts). */
  arriving?: boolean
  /** A filler bunk that only exists to finish the row on wide screens. */
  spare?: boolean
  /** The chalk-outline box where a footlocker would be, with its action. */
  vacant?: ReactNode
  children?: ReactNode
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}) {
  return (
    <div
      className={`${spare ? 'hidden lg:flex' : ''} bunk-bay relative isolate flex flex-col pt-0 px-2.5 pb-3.5 ${empty ? 'bunk-empty' : ''} ${arriving ? 'arriving' : ''} ${className}`}
      aria-hidden={ariaHidden}
    >
      <BunkBed seed={seed} empty={empty} />
      {vacant ?? children}
    </div>
  )
}