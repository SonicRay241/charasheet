import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  label?: string
  banner?: string
  /** Optional control (e.g. an add button) rendered at the far end of the header row. */
  action?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

/**
 * Bento box primitive: bordered panel with an optional uppercase label
 * and optional full-width inverted banner row.
 */
export function Panel({ label, banner, action, className, contentClassName, children }: PanelProps) {
  return (
    <section className={cn('terminal-panel', className)}>
      {(label || banner || action) && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 min-h-0">
          <div className="min-w-0">
            {label && <span className="terminal-label">{label}</span>}
            {banner && <span className="terminal-banner mt-1 bg-foreground text-background">{banner}</span>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-3', contentClassName)}>{children}</div>
    </section>
  )
}

interface StatBoxProps {
  label: string
  value: string
  className?: string
  valueClassName?: string
}

/** Read-only stat display: label on top, large value below. */
export function StatBox({ label, value, className, valueClassName }: StatBoxProps) {
  return (
    <div className={cn('terminal-panel flex min-h-20 flex-col justify-between p-2', className)}>
      <span className="terminal-label whitespace-pre-line">{label}</span>
      <span className={cn('text-3xl leading-none font-medium', valueClassName)}>{value}</span>
    </div>
  )
}