'use client'

export function PreviewBanner() {
  return (
    <div className="bg-white px-6 py-4 border-b border-border flex-shrink-0">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Participant Preview
        </h3>
        <p className="text-xs text-muted-foreground">
          How participants will see this step
        </p>
      </div>
    </div>
  )
}
