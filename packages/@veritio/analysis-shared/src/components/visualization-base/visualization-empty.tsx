'use client'

interface VisualizationEmptyProps {
  message?: string
  description?: string
}

export function VisualizationEmpty({
  message = 'No data available',
  description,
}: VisualizationEmptyProps) {
  return (
    <div className="text-center py-4 text-muted-foreground">
      <p className="text-sm">{message}</p>
      {description && (
        <p className="text-xs mt-1">{description}</p>
      )}
    </div>
  )
}
