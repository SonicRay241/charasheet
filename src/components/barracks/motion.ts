/**
 * The barracks' animation: footlockers that open before their sheet does,
 * and new recruits' being carried in.
 * The look is in index.css; this decides when.
 */
import type { MouseEvent } from 'react'

/** How long opening a footlocker takes before the sheet shows (see sheet-rise in index.css). */
const OPEN_MS = 800
/** How recently a character joined for its footlocker to be carried in. */
const ARRIVING_MS = 2500

/**
 * Whether to animate at all: not for people who've asked their system for
 * reduced motion. The one place to change if the app gets its own switch.
 */
export function barracksAnimated(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Just created or imported, so its footlocker gets set down as it appears. */
export function isNewRecruit(createdAt: number): boolean {
  return Date.now() - createdAt < ARRIVING_MS
}

function openLid(locker: Element, go: () => void): void {
  if (locker.classList.contains('opening')) return
  locker.classList.add('opening')
  window.setTimeout(go, OPEN_MS)
}

/**
 * For the Open link: open the footlocker it sits on, then go (the link's own
 * navigation is held back until then). A ctrl-, shift- or middle-click, or
 * animation switched off, goes straight on as a plain link.
 */
export function openFootlocker(event: MouseEvent<HTMLElement>, go: () => void): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const locker = event.currentTarget.closest('.footlocker')
  if (!locker || !barracksAnimated()) return
  event.preventDefault()
  openLid(locker, go)
}

/**
 * For a click on the footlocker's lid itself: open it and go. The caller
 * does the navigating; nothing here needs preventing.
 */
export function clickLid(target: HTMLElement, go: () => void): void {
  const locker = target.closest('.footlocker')
  if (!locker || !barracksAnimated()) return
  openLid(locker, go)
}
