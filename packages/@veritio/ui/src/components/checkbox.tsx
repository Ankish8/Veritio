"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "../utils/cn"
import { CheckIcon } from "lucide-react"

interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  branded?: boolean
}

function Checkbox({
  className,
  branded = false,
  style,
  checked,
  defaultChecked,
  ...props
}: CheckboxProps & { style?: React.CSSProperties }) {
  // Determine if checkbox is in checked state (for controlled or uncontrolled)
  const isChecked = checked === true || checked === 'indeterminate'

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      defaultChecked={defaultChecked}
      className={cn(
        // Base styles
        "flex size-4 items-center justify-center rounded-[4px] border transition-colors",
        "peer relative shrink-0 outline-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "group-has-disabled/field:opacity-50",
        // Focus styles - use brand color when branded
        branded
          ? "focus-visible:border-brand focus-visible:ring-brand-muted"
          : "focus-visible:border-ring focus-visible:ring-ring/50",
        "focus-visible:ring-[3px]",
        // Checked state - use brand color when branded
        branded
          ? "data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground data-[state=checked]:border-brand"
          : "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
        // Error states
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive/50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:ring-[3px]",
        branded
          ? "aria-invalid:aria-checked:border-brand"
          : "aria-invalid:aria-checked:border-primary",
        className
      )}
      style={{
        // Only apply custom border/background for unchecked state
        // This prevents inline styles from overriding the checked state styles
        borderColor: isChecked ? undefined : 'var(--style-border-muted, var(--border))',
        backgroundColor: isChecked ? undefined : 'var(--style-input-bg, transparent)',
        ...style,
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="[&>svg]:size-3.5 grid place-content-center text-current transition-none"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
