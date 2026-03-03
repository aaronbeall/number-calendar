"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg p-1 gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
      variant === "outline" && "bg-transparent",
      className
    )}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)
  const resolvedSize = context.size || size || "default"

  const sizeClasses =
    resolvedSize === "sm"
      ? "h-7 px-2 min-w-7 text-xs"
      : resolvedSize === "lg"
        ? "h-9 px-4 min-w-9"
        : "h-8 px-3 min-w-8 text-sm"

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-300 disabled:pointer-events-none disabled:opacity-50",
        sizeClasses,
        "text-slate-600 dark:text-slate-300 hover:bg-white/70 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-100",
        "data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm data-[state=on]:border data-[state=on]:border-slate-200 dark:data-[state=on]:bg-slate-700 dark:data-[state=on]:text-slate-50 dark:data-[state=on]:border-slate-600",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }
