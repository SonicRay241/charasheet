import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  label?: string
  banner?: string
  /** Optional control (e.g. an add button) rendered at the far end of the header row. */
  action?: ReactNode
  className?: string
  contentClassName?: string
  /** Click the header row to open the panel's page (the footlocker's lid). */
  onOpen?: MouseEventHandler<HTMLDivElement>
  children: ReactNode
}

/**
 * Bento box primitive: bordered panel with an optional uppercase label
 * and optional full-width inverted banner row.
 */
export function Panel({ label, banner, action, onOpen, className, contentClassName, children }: PanelProps) {
  return (
    <section className={cn('terminal-panel', className)}>
      {(label || banner || action) && (
        <div
          className={cn('flex items-center justify-between gap-2 border-b border-border px-3 py-2 min-h-0', onOpen && 'cursor-pointer')}
          role={onOpen ? 'button' : undefined}
          tabIndex={onOpen ? 0 : undefined}
          onClick={onOpen}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            // reissued as a real click, so the one event kind flows through
            event.currentTarget.click()
          }}
        >
          <div className="min-w-0">
            {label && <span className="terminal-title">{label}</span>}
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