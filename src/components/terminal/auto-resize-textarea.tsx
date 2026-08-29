import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BaseTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'onCommit'
>

interface AutoResizeTextareaProps extends BaseTextareaProps {
  value: string
  /** Called on every keystroke (controlled) — persist debounced or directly. */
  onCommit: (value: string) => void
  className?: string
  minRows?: number
}

/**
 * Borderless auto-resizing textarea with the terminal input treatment:
 * underlines on hover, inverts when focused. Grows with its content,
 * never scrolls.
 */
export function AutoResizeTextarea({
  value,
  onCommit,
  className,
  minRows = 3,
  ...props
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Grow to fit content whenever the value changes (typed or external).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      {...props}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onCommit(value)
          e.currentTarget.blur()
        }
      }}
      className={cn('terminal-input resize-none', className)}
    />
  )
}