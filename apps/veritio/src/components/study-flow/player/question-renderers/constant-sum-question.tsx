'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type {
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
  ConstantSumItem,
} from '@veritio/study-types/study-flow-types'

interface ConstantSumQuestionProps {
  config: ConstantSumQuestionConfig
  value: ConstantSumResponseValue | undefined
  onChange: (value: ConstantSumResponseValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

function shuffleArray<T>(array: T[], seed: string): T[] {
  const shuffled = [...array]
  // Simple seeded random using string hash
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i
    hash = hash & hash
    const j = Math.abs(hash) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export function ConstantSumQuestion({
  config,
  value = {},
  onChange,
  showKeyboardHints: _showKeyboardHints = false,
}: ConstantSumQuestionProps) {
  const totalPoints = config.totalPoints ?? 100
  const displayMode = config.displayMode ?? 'inputs'
  const showBars = config.showBars ?? true
  const randomOrder = config.randomOrder ?? false

  // Generate stable session ID for randomization (lazy initialization)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Compute items order (stable for session)
  const orderedItems = useMemo(() => {
    const items = config.items || []
    if (randomOrder) {
      return shuffleArray(items, sessionId)
    }
    return items
  }, [config.items, randomOrder, sessionId])

  // Initialize allocation with 0 for all items if not set
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!hasInitialized.current && Object.keys(value).length === 0 && orderedItems.length > 0) {
      hasInitialized.current = true
      const initialValue: ConstantSumResponseValue = {}
      orderedItems.forEach((item) => {
        initialValue[item.id] = 0
      })
      onChange(initialValue)
    }
  }, [value, orderedItems, onChange])

  // Calculate totals
  const currentTotal = useMemo(() => {
    return Object.values(value).reduce((sum, v) => sum + (v || 0), 0)
  }, [value])

  const remaining = totalPoints - currentTotal
  const isValid = remaining === 0
  const isOver = remaining < 0

  // Handle allocation change
  const handleAllocationChange = (itemId: string, newValue: number) => {
    // Ensure integer and non-negative
    const sanitized = Math.max(0, Math.floor(newValue) || 0)
    onChange({ ...value, [itemId]: sanitized })
  }

  // Helper to add remaining points to a specific item
  const addRemainingToItem = (itemId: string) => {
    const currentValue = value[itemId] || 0
    const newValue = currentValue + remaining
    handleAllocationChange(itemId, newValue)
  }

  return (
    <div className="space-y-4">
      {/* Header with total info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Distribute {totalPoints} points across {orderedItems.length} items
        </span>
        <div
          className={cn(
            'font-medium px-3 py-1 rounded-full transition-colors whitespace-nowrap shrink-0 text-center sm:text-left w-fit',
            isValid && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            isOver && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            !isValid && !isOver && 'bg-muted text-muted-foreground'
          )}
        >
          {isOver ? (
            <span>{Math.abs(remaining)} over</span>
          ) : isValid ? (
            <span>Complete</span>
          ) : (
            <span>{remaining} remaining</span>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {orderedItems.map((item) => (
          <AllocationItem
            key={item.id}
            item={item}
            value={value[item.id] ?? 0}
            totalPoints={totalPoints}
            displayMode={displayMode}
            showBars={showBars}
            remaining={remaining}
            onChange={(newValue) => handleAllocationChange(item.id, newValue)}
            onAddRemaining={() => addRemainingToItem(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AllocationItem({
  item,
  value,
  totalPoints,
  displayMode,
  showBars,
  remaining,
  onChange,
  onAddRemaining,
}: {
  item: ConstantSumItem
  value: number
  totalPoints: number
  displayMode: 'inputs' | 'sliders'
  showBars: boolean
  remaining: number
  onChange: (value: number) => void
  onAddRemaining: () => void
}) {
  const percentage = totalPoints > 0 ? (value / totalPoints) * 100 : 0
  const showAddRemaining = remaining > 0

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 hover:bg-muted/30 transition-colors">
      {/* Label and description */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <span className="font-medium text-sm">{item.label || 'Untitled item'}</span>
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>

        {/* Quick add remaining button */}
        {showAddRemaining && (
          <button
            type="button"
            onClick={onAddRemaining}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0 cursor-pointer px-2 py-1 rounded hover:bg-primary/10"
          >
            +{remaining}
          </button>
        )}
      </div>

      {/* Input control */}
      <div className="flex items-center gap-4">
        {displayMode === 'inputs' ? (
          <>
            {/* Number input */}
            <Input
              type="number"
              min={0}
              max={totalPoints}
              value={value}
              onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
              className="w-24 h-10 text-center font-medium cursor-text"
            />

            {/* Visual bar */}
            {showBars && (
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden cursor-pointer" onClick={onAddRemaining}>
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
            )}

            {/* Percentage label */}
            <span className="text-sm text-muted-foreground w-14 text-right">
              {Math.round(percentage)}%
            </span>
          </>
        ) : (
          <>
            {/* Slider mode - slider already provides visual feedback, no need for extra bar */}
            <div className="flex-1 cursor-pointer">
              <Slider
                value={[value]}
                min={0}
                max={totalPoints}
                step={1}
                onValueChange={([newValue]) => onChange(newValue)}
                className="w-full"
              />
            </div>

            {/* Value and percentage */}
            <div className="text-right min-w-[60px]">
              <span className="font-medium">{value}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({Math.round(percentage)}%)
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
