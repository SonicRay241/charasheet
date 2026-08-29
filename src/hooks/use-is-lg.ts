import { useEffect, useState } from 'react'

/** Tailwind `lg` breakpoint in px. */
const LG_BREAKPOINT = 1024

/**
 * Tracks the Tailwind `lg` breakpoint (1024px).
 * `measured` is false until the first media query evaluation on the client,
 * letting callers hide layout-dependent UI to avoid a misplaced first paint.
 */
export function useIsLg(): { isLg: boolean; measured: boolean } {
  const [state, setState] = useState({ isLg: false, measured: false })

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    const update = () => setState({ isLg: mediaQuery.matches, measured: true })
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return state
}