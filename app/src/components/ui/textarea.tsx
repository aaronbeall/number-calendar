import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaProps = React.ComponentProps<"textarea"> & {
  autoSize?: boolean
  maxAutoHeight?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoSize = false, maxAutoHeight = 160, onInput, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    const adjustHeight = React.useCallback(
      (el: HTMLTextAreaElement) => {
        if (!autoSize) return
        el.style.height = "auto"
        el.style.height = `${Math.min(el.scrollHeight, maxAutoHeight)}px`
      },
      [autoSize, maxAutoHeight]
    )

    React.useLayoutEffect(() => {
      if (!autoSize || !innerRef.current) return
      adjustHeight(innerRef.current)
    }, [autoSize, adjustHeight, props.value, props.defaultValue])

    const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoSize) {
        adjustHeight(event.currentTarget)
      }
      onInput?.(event)
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
          className
        )}
        ref={setRefs}
        onInput={handleInput}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
