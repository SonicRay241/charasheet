/**
 * How the barracks' people look, picked from a character's id so they look
 * the same in their bunk and on their sheet's mannequin.
 */
const SKIN = ['#f1c9a5', '#e0ac85', '#c68a5e', '#9c6644', '#6e4a33']
const HAIR = ['#2b1d12', '#5a3a1e', '#a0522d', '#d9b36a', '#8a8a8a', '#1a1a1a']
const SHIRTS = ['#e8e0cc', '#6b7d5c', '#8a6f4e', '#4f5d6e']
const TROUSERS = ['#3b3024', '#4a4a52', '#5b4632', '#2e3a2e']

/** Skin, hair, and the shirt and trousers they wear under anything else. */
export interface Looks {
  skin: string
  hair: string
  shirt: string
  trousers: string
}

/** A small stable number from a string, so each character keeps their look. */
export function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A character's looks, from their id. */
export function looksOf(seed: string): Looks {
  const h = hash(seed)
  return {
    skin: SKIN[(h >>> 14) % SKIN.length],
    hair: HAIR[(h >>> 17) % HAIR.length],
    shirt: SHIRTS[(h >>> 20) % SHIRTS.length],
    trousers: TROUSERS[(h >>> 22) % TROUSERS.length],
  }
}
