import { useEffect, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { formatModifier } from '@/db/derived'

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onCommit'>

interface BareInputProps extends BaseInputProps {
  value: string
  onCommit?: (value: string) => void
  className?: string
}

/**
 * Borderless editable text that underlines on hover/focus.
 * Commits on Enter/blur; Escape reverts.
 */
export function BareInput({ value, onCommit, className, ...props }: BareInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commit() {
    if (onCommit && draft !== value) {
      onCommit(draft)
    }
  }

  return (
    <input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          setDraft(value)
          e.currentTarget.blur()
        }
      }}
      className={cn('terminal-input', className)}
    />
  )
}

interface EditableNumberProps extends BaseInputProps {
  value: number | null
  onCommit: (value: number | null) => void
  className?: string
  placeholder?: string
  allowEmpty?: boolean
  /**
   * When true the field edits a signed delta: the displayed value is the
   * total (value + draft delta), and committing applies draft to onCommit.
   */
  signed?: boolean
}

export function EditableNumber({
  value,
  onCommit,
  className,
  placeholder,
  allowEmpty = false,
  signed = false,
  ...props
}: EditableNumberProps) {
  const [draft, setDraft] = useState(
    signed ? (value === null ? '' : formatModifier(value)) : value === null ? '' : String(value),
  )

  useEffect(() => {
    setDraft(
      signed ? (value === null ? '' : formatModifier(value)) : value === null ? '' : String(value),
    )
  }, [value, signed])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed === '' && allowEmpty) {
      onCommit(null)
      return
    }
    const parsed = Number(trimmed)
    if (trimmed !== '' && Number.isFinite(parsed)) {
      onCommit(parsed)
    } else {
      setDraft(
        signed ? (value === null ? '' : formatModifier(value)) : value === null ? '' : String(value),
      )
    }
  }

  return (
    <input
      {...props}
      value={draft}
      inputMode="numeric"
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          setDraft(value === null ? '' : String(value))
          e.currentTarget.blur()
        }
      }}
      className={cn('terminal-input', className)}
    />
  )
}