'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface VariantFilterBarProps {
  variants: Array<{ id: string; name: string; url: string }>
  selectedVariantId: string | null
  compareMode: boolean
  compareVariantId: string | null
  onVariantChange: (id: string | null) => void
  onCompareModeChange: (enabled: boolean) => void
  onCompareVariantChange: (id: string | null) => void
}

const COMPARE_NONE = '__none__'

export function VariantFilterBar({
  variants,
  selectedVariantId,
  compareMode,
  compareVariantId,
  onVariantChange,
  onCompareModeChange,
  onCompareVariantChange,
}: VariantFilterBarProps) {
  if (variants.length === 0) return null

  const variantsForComparison = variants.filter(v => v.id !== selectedVariantId)

  const handleVariantClick = (id: string | null) => {
    onVariantChange(id)
    if (!id) {
      onCompareModeChange(false)
      onCompareVariantChange(null)
    } else if (compareVariantId === id) {
      onCompareVariantChange(null)
      onCompareModeChange(false)
    }
  }

  const handleCompareSelect = (value: string) => {
    if (value === COMPARE_NONE) {
      onCompareModeChange(false)
      onCompareVariantChange(null)
    } else {
      onCompareModeChange(true)
      onCompareVariantChange(value)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => handleVariantClick(null)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            !selectedVariantId
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All variants
        </button>

        {variants.map(v => (
          <button
            key={v.id}
            onClick={() => handleVariantClick(v.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              selectedVariantId === v.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Variant {v.name}
          </button>
        ))}
      </div>

      {/* Compare dropdown — appears when a specific variant is selected and there are 2+ variants */}
      {selectedVariantId && variants.length >= 2 && (
        <Select
          value={compareMode && compareVariantId ? compareVariantId : COMPARE_NONE}
          onValueChange={handleCompareSelect}
        >
          <SelectTrigger className="h-9 w-auto min-w-[150px] text-sm">
            <SelectValue placeholder="Compare with..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={COMPARE_NONE}>No comparison</SelectItem>
            {variantsForComparison.map(v => (
              <SelectItem key={v.id} value={v.id}>
                vs Variant {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
