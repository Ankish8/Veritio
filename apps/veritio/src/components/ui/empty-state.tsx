import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"

export interface EmptyStateProps {
  /** Icon to display (Lucide icon component) */
  icon: LucideIcon
  /** Main heading text */
  title: string
  /** Description text */
  description: string
  /** Optional action button(s) */
  action?: ReactNode
  /** Optional variant - 'default' uses the polished layered design, 'simple' uses basic border */
  variant?: "default" | "simple"
}

/**
 * EmptyState component with polished design pattern
 *
 * Features layered gradient backgrounds and centered content.
 * Extracted from the Projects page empty state.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "simple") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="font-semibold text-lg mt-4">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="max-w-md text-center">
        {/* Decorative illustration with layered gradients */}
        <div className="relative mx-auto mb-6 w-32 h-32">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-3xl rotate-6" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-3xl -rotate-3" />
          <div className="relative flex h-full items-center justify-center rounded-3xl bg-card border border-border/60 shadow-sm">
            <Icon className="h-12 w-12 text-muted-foreground/60" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          {description}
        </p>

        {action && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
