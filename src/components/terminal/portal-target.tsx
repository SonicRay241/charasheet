import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PortalTargetProps {
  /** Renders children into this element when active. */
  enabled: boolean
  /** Container to portal into when enabled; falls back to in-place rendering. */
  target: HTMLElement | null
  /**
   * When false, children are hidden (visibility only, layout space kept in
   * the fallback position) until the portal layout has been measured.
   */
  measured?: boolean
  className?: string
  children: ReactNode
}

/**
 * Moves `children` into `target` via a React portal while `enabled` is true,
 * and renders them in place otherwise. React preserves component state across
 * portal moves as long as the element identity in the tree stays stable.
 */
export function PortalTarget({
  enabled,
  target,
  measured = true,
  className,
  children,
}: PortalTargetProps) {
  const hidden = !measured

  if (enabled && target) {
    return <>{createPortal(children, target)}</>
  }
  return <div className={cn(hidden && 'invisible', className)}>{children}</div>
}