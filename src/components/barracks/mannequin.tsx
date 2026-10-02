/**
 * The sheet's mannequin: the character standing front-on, drawn like the people in the bunks and with their looks,
 * wearing and holding whatever is in their slots. Gear is drawn from its
 * name, since that's all a sheet knows of it: a "Leather Hood" is a brown
 * hood, an "Iron Mace" a mace, and anything unrecognised a plain version of
 * whatever goes in that slot.
 */
import { useId } from 'react'
import type { EquipSlot } from '@/db/db'
import { heldItem, type Equipped } from '@/db/equipped'
import { BRASS, GOLD, IRON, LEATHER, WOOD, handwearOf, headgearOf, heldShape, materialOf, type Held } from './gear-names'
import type { Looks } from './looks'

const GRIP = '#3b2a1c'
const SHOES = '#2b1d12'

/** A colour a little darker (negative) or lighter (positive). */
function shade(hex: string, by: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + by))))
  return `rgb(${f(n >> 16)} ${f((n >> 8) & 255)} ${f(n & 255)})`
}

/** Things that hang from a lowered hand rather than being held up. */
const HANGING: readonly Held[] = ['pouch', 'lantern']
const WOODEN: readonly Held[] = ['bow', 'staff', 'club', 'torch']

/**
 * Something held, drawn with the hand at the origin and the outside of the
 * body towards -x (the hand on the other side draws it mirrored).
 */
function HeldItem({ shape, metal }: { shape: Held; metal: string }) {
  const dark = shade(metal, -0.28)
  switch (shape) {
    case 'sword':
    case 'greatsword':
    case 'dagger': {
      const great = shape === 'greatsword'
      const len = great ? 92 : shape === 'dagger' ? 32 : 66
      const w = great ? 4 : 3
      return (
        <g transform="rotate(-12)">
          <path d={`M${-w} -9 V${-len + 8} L0 ${-len} L${w} ${-len + 8} V-9 Z`} fill={metal} />
          <path d={`M0 -12 V${-len + 10}`} stroke={dark} strokeWidth={1} />
          <rect x={great ? -14 : -11} y={-11} width={great ? 28 : 22} height={4} rx={1.5} fill={BRASS} />
          <rect x={-2.5} y={-7} width={5} height={great ? 20 : 13} rx={1} fill={GRIP} />
          <circle cx={0} cy={great ? 15 : 8} r={3} fill={BRASS} />
        </g>
      )
    }
    case 'axe':
      return (
        <g transform="rotate(-12)">
          <rect x={-2} y={-62} width={4} height={78} rx={1.5} fill={WOOD} />
          <path d="M-1 -60 C-14 -68 -24 -62 -26 -50 C-24 -38 -14 -34 -1 -42 Z" fill={metal} />
          <path d="M-25 -58 C-27 -52 -27 -46 -24 -41" stroke="rgb(255 255 255 / .45)" strokeWidth={1.5} fill="none" />
        </g>
      )
    case 'mace':
      return (
        <g transform="rotate(-12)">
          <rect x={-2} y={-46} width={4} height={60} rx={1.5} fill={WOOD} />
          <circle cx={0} cy={-52} r={8.5} fill={metal} />
          {[-1, 1].map((s) => <rect key={s} x={s < 0 ? -12 : 8} y={-55} width={4} height={6} rx={1} fill={dark} />)}
          <rect x={-3} y={-64} width={6} height={4} rx={1} fill={dark} />
        </g>
      )
    case 'hammer':
      return (
        <g transform="rotate(-12)">
          <rect x={-2} y={-56} width={4} height={70} rx={1.5} fill={WOOD} />
          <rect x={-12} y={-64} width={24} height={13} rx={2} fill={metal} />
          <rect x={-12} y={-64} width={4} height={13} fill={dark} />
        </g>
      )
    case 'club':
      return (
        <g transform="rotate(-12)">
          <path d="M-2 14 L-3 -8 L-8 -48 Q0 -58 8 -48 L3 -8 L2 14 Z" fill={WOOD} />
          {metal !== WOOD && (
            <g fill={metal}>
              <rect x={-8.5} y={-47} width={17} height={4} rx={1} />
              <rect x={-7} y={-36} width={14} height={3.5} rx={1} />
            </g>
          )}
        </g>
      )
    case 'spear':
      return (
        <g transform="rotate(-12)">
          <rect x={-1.5} y={-100} width={3} height={128} rx={1.5} fill={WOOD} />
          <path d="M-4.5 -98 L0 -116 L4.5 -98 L0 -94 Z" fill={metal} />
          <rect x={-2.5} y={-98} width={5} height={4} fill={GRIP} />
        </g>
      )
    case 'staff':
      return (
        <g transform="rotate(-10)">
          <rect x={-2.2} y={-94} width={4.4} height={128} rx={2} fill={WOOD} />
          <circle cx={0} cy={-96} r={4.5} fill={metal === WOOD ? shade(WOOD, -0.15) : metal} />
          <path d="M-0.5 -86 V20" stroke={shade(WOOD, -0.2)} strokeWidth={0.8} />
        </g>
      )
    case 'bow':
      return (
        <g>
          <path d="M16 -58 V58" stroke="#e8e0cc" strokeWidth={1} />
          <path d="M16 -58 Q-16 0 16 58" stroke={metal} strokeWidth={4} fill="none" strokeLinecap="round" />
          <rect x={-3.5} y={-6} width={6} height={12} rx={1.5} fill={GRIP} />
        </g>
      )
    case 'shield':
      return (
        <g transform="translate(-6 -2)">
          <path d="M-18 -26 H18 V-4 Q18 18 0 28 Q-18 18 -18 -4 Z" fill={metal} stroke={dark} strokeWidth={3} strokeLinejoin="round" />
          <path d="M0 -24 V26 M-16 -6 H16" stroke={dark} strokeWidth={1.2} opacity={0.5} />
          <circle r={4.5} fill={shade(metal, 0.15)} stroke={dark} strokeWidth={1.2} />
        </g>
      )
    case 'torch':
      return (
        <g transform="rotate(-8)">
          <rect x={-2} y={-38} width={4} height={50} rx={1.5} fill={WOOD} />
          <rect x={-3.5} y={-43} width={7} height={8} rx={1.5} fill="#5d4d2c" />
          <g className="mannequin-flame">
            <path d="M0 -66 C-8 -56 -7 -47 0 -43 C7 -47 8 -56 0 -66 Z" fill="#e8a33a" />
            <path d="M0 -58 C-3 -52 -3 -47 0 -45 C3 -47 3 -52 0 -58 Z" fill="#f6d67a" />
          </g>
        </g>
      )
    case 'lantern':
      return (
        <g>
          <path d="M-5 3 Q0 -3 5 3" stroke={dark} strokeWidth={1.5} fill="none" />
          <rect x={-7} y={3} width={14} height={4} rx={1} fill={metal} />
          <rect x={-6} y={7} width={12} height={14} fill="#f6d67a" opacity={0.9} />
          <path d="M-6 7 V21 M0 7 V21 M6 7 V21" stroke={dark} strokeWidth={1} />
          <rect x={-7} y={21} width={14} height={3} rx={1} fill={metal} />
        </g>
      )
    case 'pouch':
      return (
        <g>
          <path d="M-7 3 Q-11 20 0 22 Q11 20 7 3 Q0 6 -7 3 Z" fill={metal} />
          <path d="M-6 4.5 Q0 2 6 4.5" stroke={dark} strokeWidth={1.5} fill="none" />
        </g>
      )
  }
}

interface ArmProps {
  /** -1 on the left as you look at them, 1 on the right. */
  side: -1 | 1
  looks: Looks
  sleeve: string
  /** What's in this hand. */
  held?: Equipped
  /** What's on the hands (gloves, bracers, a ring), by name. */
  worn?: string
}

/** One side's arm, and the hand with whatever it wears and holds. */
function Arm({ side, looks, sleeve, held, worn }: ArmProps) {
  const shape = held && heldShape(held.item.name, heldItem(held.item.details))
  const raised = shape !== undefined && !HANGING.includes(shape)
  const hand = raised ? { x: 80 + side * 40, y: 116 } : { x: 80 + side * 30, y: 126 }
  const elbow = raised ? { x: 80 + side * 34, y: 88 } : { x: 80 + side * 30, y: 92 }
  // a bow is wood, however crude; for anything else the name may say what its metal is
  const metal = shape === 'bow' ? WOOD : shape && held
    ? materialOf(held.item.name, WOODEN.includes(shape) ? WOOD : shape === 'pouch' ? LEATHER : shape === 'lantern' ? BRASS : IRON)
    : IRON
  const item = shape && (
    <g transform={`translate(${hand.x} ${hand.y})${side === 1 ? ' scale(-1 1)' : ''}`}>
      <HeldItem shape={shape} metal={metal} />
    </g>
  )
  const handwear = worn !== undefined ? handwearOf(worn) : undefined
  const wornColour = worn !== undefined
    ? materialOf(worn, handwear === 'ring' ? GOLD : /\bgauntlets?\b/.test(worn.toLowerCase()) ? IRON : LEATHER)
    : looks.skin
  // a stretch of the forearm, from `from` to `to` of the way from the hand towards the elbow
  const band = (from: number, to: number, colour: string) => (
    <path
      d={`M${hand.x + (elbow.x - hand.x) * from} ${hand.y + (elbow.y - hand.y) * from} L${hand.x + (elbow.x - hand.x) * to} ${hand.y + (elbow.y - hand.y) * to}`}
      stroke={colour}
      strokeWidth={12.5}
      strokeLinecap="round"
    />
  )
  const fist = (
    <g>
      <circle cx={hand.x} cy={hand.y} r={handwear === 'gloves' ? 6 : 5.5} fill={handwear === 'gloves' ? wornColour : looks.skin} />
      {/* a ring on the main hand */}
      {handwear === 'ring' && side === 1 && (
        <circle cx={hand.x - 2} cy={hand.y + 2.5} r={2.3} fill={wornColour} stroke={shade(wornColour, -0.3)} strokeWidth={0.6} />
      )}
    </g>
  )
  return (
    <g>
      <path d={`M${80 + side * 20} 66 Q${elbow.x} ${elbow.y} ${hand.x} ${hand.y}`} stroke={sleeve} strokeWidth={11} fill="none" strokeLinecap="round" />
      {handwear === 'gloves' && band(0.15, 0.38, shade(wornColour, -0.15))}
      {handwear === 'bracers' && band(0.25, 0.6, wornColour)}
      {shape === 'shield' ? <>{fist}{item}</> : <>{item}{fist}</>}
    </g>
  )
}

interface MannequinProps {
  looks: Looks
  gear: Partial<Record<EquipSlot, Equipped>>
  animate: boolean
}

/**
 * The character, standing, in what they've got on. The main hand is on the
 * right as you look at them, next to its slot.
 */
export function Mannequin({ looks, gear, animate }: MannequinProps) {
  // a pattern id of plain characters, for url(#...)
  const mail = `mail-${useId().replace(/[^\w-]/g, '')}`
  const head = gear.head?.item.name
  const chest = gear.chest?.item.name
  const legs = gear.legs?.item.name
  const feet = gear.feet?.item.name
  const headgear = head !== undefined ? headgearOf(head) : undefined
  const hat = head !== undefined && materialOf(head, headgear === 'crown' ? GOLD : headgear === 'helm' ? IRON : LEATHER)
  const coat = chest !== undefined && materialOf(chest, LEATHER)
  const worn = chest?.toLowerCase() ?? ''
  const robe = /\b(robes?|gowns?|cloaks?|capes?|coats?|mantles?)\b/.test(worn)
  const coatPath = robe ? 'M56 61 Q80 54 104 61 L114 182 Q80 188 46 182 Z' : 'M56 61 Q80 54 104 61 L109 134 Q80 140 51 134 Z'
  const trousers = legs !== undefined && materialOf(legs, LEATHER)
  const boots = feet !== undefined && materialOf(feet, LEATHER)

  return (
    <svg className="mannequin" viewBox="0 0 160 212" aria-hidden="true" data-animate={animate ? 'on' : 'off'}>
      <ellipse cx={80} cy={199} rx={44} ry={6} fill="rgb(0 0 0 / .18)" />
      <g className="mannequin-figure">
        {/* legs, then whatever's over them, then feet */}
        {[69.5, 90.5].map((x) => (
          <g key={x}>
            <rect x={x - 8.5} y={114} width={17} height={76} rx={3} fill={looks.trousers} />
            {trousers && (
              <>
                <rect x={x - 9} y={114} width={18} height={70} rx={3} fill={trousers} />
                <rect x={x - 9} y={148} width={18} height={3} fill={shade(trousers, -0.2)} />
              </>
            )}
            {boots ? (
              <>
                <rect x={x - 9} y={164} width={18} height={26} rx={2} fill={boots} />
                <ellipse cx={x} cy={191} rx={10} ry={6} fill={boots} />
                <rect x={x - 10} y={162} width={20} height={6} rx={2} fill={shade(boots, -0.22)} />
                <rect x={x - 10} y={194} width={20} height={3} rx={1.5} fill={SHOES} />
              </>
            ) : (
              <ellipse cx={x} cy={192} rx={10} ry={5.5} fill={SHOES} />
            )}
          </g>
        ))}
        {trousers && <rect x={58} y={112} width={44} height={9} rx={2} fill={trousers} />}

        <rect x={75} y={50} width={10} height={12} fill={looks.skin} />
        <path d="M58 62 Q80 56 102 62 L106 120 H54 Z" fill={looks.shirt} />
        {coat && (
          <g>
            <path d={coatPath} fill={coat} />
            {/\b(chain|mail|chainmail|hauberks?)\b/.test(worn) && (
              <>
                <defs>
                  <pattern id={mail} width={5} height={5} patternUnits="userSpaceOnUse">
                    <circle cx={2.5} cy={2.5} r={1.6} fill="none" stroke={shade(coat, -0.35)} strokeWidth={0.8} />
                  </pattern>
                </defs>
                <path d={coatPath} fill={`url(#${mail})`} />
              </>
            )}
            {/\b(plate|breastplates?|cuirass(es)?)\b/.test(worn) ? (
              <g>
                {[88, 104, 120].map((y) => <path key={y} d={`M54 ${y} Q80 ${y + 5} 106 ${y}`} stroke={shade(coat, -0.25)} strokeWidth={1.5} fill="none" />)}
                <path d="M68 68 V126" stroke="rgb(255 255 255 / .35)" strokeWidth={3} />
              </g>
            ) : (
              <path d="M73 58 L80 71 L87 58" stroke={shade(coat, -0.3)} strokeWidth={2} fill="none" />
            )}
          </g>
        )}
        <rect x={53} y={112} width={54} height={6} fill="#3a2414" />
        <rect x={77} y={111} width={6} height={8} rx={1} fill={BRASS} />

        <Arm side={-1} looks={looks} sleeve={robe && coat ? coat : looks.shirt} held={gear.offHand} worn={gear.hands?.item.name} />
        <Arm side={1} looks={looks} sleeve={robe && coat ? coat : looks.shirt} held={gear.mainHand} worn={gear.hands?.item.name} />
        {coat && !robe && [60, 100].map((x) => <circle key={x} cx={x} cy={66} r={8.5} fill={shade(coat, -0.1)} />)}

        {/* the head, and what's on it */}
        {headgear !== 'hood' && <circle cx={80} cy={34} r={19} fill={looks.hair} />}
        {headgear === 'hood' && hat && (
          <path d="M80 12 C100 12 106 30 104 50 C104 58 110 64 114 68 L46 68 C50 64 56 58 56 50 C54 30 60 12 80 12 Z" fill={hat} />
        )}
        <circle cx={80} cy={38} r={16} fill={looks.skin} />
        <g className="mannequin-eyes" fill={SHOES}>
          <circle cx={74} cy={40} r={1.8} />
          <circle cx={86} cy={40} r={1.8} />
        </g>
        <path d="M76 46 Q80 48.5 84 46" stroke={shade(looks.skin, -0.35)} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        {headgear !== 'hood' && <path d="M64 34 Q66 18 80 18 Q94 18 96 34 Q88 26 80 28 Q72 26 64 34 Z" fill={looks.hair} />}
        {hat && headgear === 'hood' && (
          <path d="M64 50 C60 30 68 20 80 20 C92 20 100 30 96 50" stroke={shade(hat, -0.3)} strokeWidth={3} fill="none" />
        )}
        {hat && headgear === 'helm' && (
          <g>
            <path d="M62 36 Q62 14 80 14 Q98 14 98 36 Z" fill={hat} />
            <rect x={60} y={33} width={40} height={5} rx={2} fill={shade(hat, -0.2)} />
            <rect x={78} y={36} width={4} height={11} rx={1} fill={shade(hat, -0.2)} />
            <path d="M68 30 Q70 20 78 18" stroke="rgb(255 255 255 / .35)" strokeWidth={2} fill="none" />
          </g>
        )}
        {hat && headgear === 'hat' && (
          <g>
            <path d="M66 26 Q66 6 80 6 Q94 6 94 26 Z" fill={hat} />
            <rect x={66} y={19} width={28} height={5} fill={shade(hat, -0.3)} />
            <ellipse cx={80} cy={26} rx={28} ry={5} fill={hat} />
          </g>
        )}
        {hat && headgear === 'crown' && (
          <g>
            <path d="M64 25 L64 11 L71 18 L75.5 8 L80 17 L84.5 8 L89 18 L96 11 L96 25 Z" fill={hat} />
            <circle cx={80} cy={21} r={2} fill="#8c2f23" />
          </g>
        )}
      </g>
    </svg>
  )
}
