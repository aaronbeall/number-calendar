import * as React from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


// Confirmation component using a popover and render-prop pattern.
// Usage:
// <Confirmation>
//   {(confirm) => (
//     <button onClick={confirm(() => doSomething())}>Delete</button>
//   )}
// </Confirmation>
// confirm(action) returns an onClick handler that opens the popover and, on user confirmation, runs the action.

interface ConfirmationProps {
  children: (confirm: (action: () => void) => (e: React.MouseEvent) => void) => React.ReactNode
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'destructive'
  disabled?: boolean
}

export function Confirmation({
  children,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'destructive',
  disabled = false,
}: ConfirmationProps) {
  const [open, setOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null)
  const triggerRef = React.useRef<HTMLDivElement | null>(null)

  const confirm = React.useCallback(
    (action: () => void) => (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setPendingAction(() => action)
      setOpen(true)
    },
    [disabled]
  )

  const run = () => {
    if (pendingAction) {
      try {
        pendingAction()
      } finally {
        setPendingAction(null)
        setOpen(false)
      }
    }
  }

  const cancel = () => {
    setOpen(false)
    setPendingAction(null)
  }

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) cancel(); }}>
      <PopoverTrigger asChild>
        <div ref={triggerRef}>
          {children(confirm)}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-64 p-3 rounded-md">
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</div>
          {description && (
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{description}</div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={cancel}>{cancelLabel}</Button>
            <Button
              type="button"
              size="sm"
              variant={tone === 'destructive' ? 'destructive' : 'default'}
              onClick={run}
              autoFocus
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

