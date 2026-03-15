"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CircleIcon } from "lucide-react"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

interface RadioGroupItemProps extends React.ComponentProps<typeof RadioGroupPrimitive.Item> {
  /** Use brand colors instead of default primary colors */
  branded?: boolean
}

function RadioGroupItem({
  className,
  branded = false,
  style,
  ...props
}: RadioGroupItemProps & { style?: React.CSSProperties }) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // Base styles
        "flex size-4 rounded-full border outline-none",
        "group/radio-group-item peer relative aspect-square shrink-0",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Focus styles - use brand color when branded
        branded
          ? "focus-visible:border-brand focus-visible:ring-brand-muted"
          : "focus-visible:border-ring focus-visible:ring-ring/50",
        "focus-visible:ring-[3px]",
        // Indicator color (inherited via text color)
        branded ? "text-brand" : "text-primary",
        // Error states
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive/50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:ring-[3px]",
        className
      )}
      style={{
        borderColor: 'var(--style-border-muted, var(--border))',
        backgroundColor: 'var(--style-input-bg, transparent)',
        ...style,
      }}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={cn(
          "flex size-4 items-center justify-center",
          branded
            ? "text-brand group-aria-invalid/radio-group-item:text-destructive"
            : "text-primary group-aria-invalid/radio-group-item:text-destructive"
        )}
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
