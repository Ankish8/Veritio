'use client'

import { Progress } from '@veritio/ui/components/progress'

export interface ProgressCellProps {
  value: number
  color?: 'green' | 'blue' | 'orange' | 'purple' | 'gray'
  showPercentage?: boolean
  className?: string
}

const colorClasses: Record<string, string> = {
  green: '[&>[data-slot=progress-indicator]]:bg-green-500',
  blue: '[&>[data-slot=progress-indicator]]:bg-blue-500',
  orange: '[&>[data-slot=progress-indicator]]:bg-orange-500',
  purple: '[&>[data-slot=progress-indicator]]:bg-purple-500',
  gray: '[&>[data-slot=progress-indicator]]:bg-gray-500',
}

export function ProgressCell({
  value,
  color = 'green',
  showPercentage = false,
  className,
}: ProgressCellProps) {
  const colorClass = colorClasses[color] || colorClasses.green

  if (showPercentage) {
    return (
      <div className="flex items-center gap-2">
        <Progress
          value={value}
          className={`h-3 sm:h-4 flex-1 ${colorClass} ${className || ''}`}
        />
        <span className="text-xs sm:text-sm text-muted-foreground w-10 text-right">
          {value}%
        </span>
      </div>
    )
  }

  return (
    <Progress
      value={value}
      className={`h-3 sm:h-4 ${colorClass} ${className || ''}`}
    />
  )
}

export function createProgressColumn<T extends { percentage: number }>(options: {
  key?: string
  header?: string
  width?: string
  color?: ProgressCellProps['color']
  showPercentage?: boolean
  getValue?: (row: T) => number
}) {
  const {
    key = 'progress',
    header = '',
    width = 'w-[30%] sm:w-[40%]',
    color = 'green',
    showPercentage = false,
    getValue = (row) => row.percentage,
  } = options

  return {
    key,
    header,
    width,
    render: (row: T) => (
      <ProgressCell
        value={getValue(row)}
        color={color}
        showPercentage={showPercentage}
      />
    ),
  }
}
