"use client"

import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type PopoverTipContextValue = {
  usePopover: boolean
}

const PopoverTipContext = React.createContext<PopoverTipContextValue>({ usePopover: false })

const usePopoverTipContext = () => React.useContext(PopoverTipContext)

const useIsCoarsePointer = () => {
  const [isCoarse, setIsCoarse] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const media = window.matchMedia("(pointer: coarse)")
    const update = () => setIsCoarse(media.matches)
    update()
    if (media.addEventListener) {
      media.addEventListener("change", update)
      return () => media.removeEventListener("change", update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  return isCoarse
}

type PopoverTipProps = React.ComponentPropsWithoutRef<typeof Popover>

const PopoverTip = ({ children, ...props }: PopoverTipProps) => {
  const usePopover = useIsCoarsePointer()
  const Root = usePopover ? Popover : Tooltip
  return (
    <PopoverTipContext.Provider value={{ usePopover }}>
      <Root {...props}>{children}</Root>
    </PopoverTipContext.Provider>
  )
}

type PopoverTipTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger> &
  React.ComponentPropsWithoutRef<typeof TooltipTrigger>

const PopoverTipTrigger = React.forwardRef<
  HTMLButtonElement,
  PopoverTipTriggerProps
>(({ ...props }, ref) => {
  const { usePopover } = usePopoverTipContext()
  const Trigger = usePopover ? PopoverTrigger : TooltipTrigger
  return <Trigger ref={ref} {...props} />
})
PopoverTipTrigger.displayName = "PopoverTipTrigger"

type PopoverTipContentProps = React.ComponentPropsWithoutRef<typeof PopoverContent> &
  React.ComponentPropsWithoutRef<typeof TooltipContent>

const PopoverTipContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  PopoverTipContentProps
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => {
  const { usePopover } = usePopoverTipContext()
  const Content = usePopover ? PopoverContent : TooltipContent
  return (
    <Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-[240px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
        className
      )}
      {...props}
    />
  )
})
PopoverTipContent.displayName = "PopoverTipContent"

export { PopoverTip, PopoverTipTrigger, PopoverTipContent }
