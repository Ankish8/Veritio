'use client'

import React from 'react'

interface VisualizationEmptyProps {
  /** Message to display */
  message?: string
  /** Additional description */
  description?: string
}

/**
 * Empty state component for visualizations.
 * Used when there's no data or configuration to display.
 */
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
