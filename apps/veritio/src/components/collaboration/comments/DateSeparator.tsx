'use client'

interface DateSeparatorProps {
  label: string
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
