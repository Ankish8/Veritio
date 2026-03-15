import * as React from "react"

import { cn } from "../utils/cn"

export type TextareaProps = React.ComponentProps<"textarea">

function Textarea({ className, style, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full px-4 py-2.5 text-sm",
        "text-foreground placeholder:text-muted-foreground",
        "transition-all duration-200",
        "outline-none focus:outline-none focus-visible:outline-none",
        "aria-invalid:!border-destructive aria-invalid:focus:!border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "field-sizing-content min-h-16 resize-none",
        className
      )}
      style={{
        backgroundColor: 'var(--style-input-bg, var(--muted))',
        border: '1px solid var(--style-input-border, var(--border))',
        borderRadius: 'var(--style-radius, var(--radius))',
        ...style,
      }}
      {...props}
    />
  )
}

export { Textarea }
