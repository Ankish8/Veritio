'use client'

import { CheckCircle2, ChevronRight } from 'lucide-react'

interface TaskBreadcrumbProps {
  taskNumber: number
  taskQuestion: string
  breadcrumbPath?: string[]
  className?: string
}

/**
 * Displays the task title with correct answer path in breadcrumb format.
 * Shows: "1. Task question" with correct path "Home > Category > Item" below.
 */
export function TaskBreadcrumb({
  taskNumber,
  taskQuestion,
  breadcrumbPath = [],
  className,
}: TaskBreadcrumbProps) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      {/* Task title */}
      <h3 className="text-base font-medium text-foreground">
        {taskNumber}. {taskQuestion}
      </h3>

      {/* Correct path breadcrumb */}
      {breadcrumbPath.length > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <div className="flex items-center flex-wrap gap-1">
            {breadcrumbPath.map((label, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                )}
                <span
                  className={
                    index === breadcrumbPath.length - 1
                      ? 'text-green-600 font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No correct answer specified */}
      {breadcrumbPath.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No correct answer specified
        </p>
      )}
    </div>
  )
}
