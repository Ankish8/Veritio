"use client"

import * as React from "react"
import { cn } from "../utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, style, ...props }, ref) => {
    const inputId = id || React.useId()
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <input
          type={type}
          id={inputId}
          data-slot="input"
          className={cn(
            "flex h-11 w-full px-4 py-2 text-sm",
            "transition-all duration-200",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            // Error state
            error && "!border-destructive focus:!border-destructive",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          style={{
            backgroundColor: 'var(--style-input-bg, var(--muted))',
            border: '1px solid var(--style-input-border, var(--border))',
            borderRadius: 'var(--style-radius, var(--radius))',
            color: 'var(--style-text-primary, var(--foreground))',
            ...style,
          }}
          ref={ref}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={helperId}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
