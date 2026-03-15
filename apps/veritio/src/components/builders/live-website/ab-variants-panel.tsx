'use client'

import { memo, useMemo, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  useLiveWebsiteVariants,
  useLiveWebsiteSelectedVariantId,
  useLiveWebsiteActions,
  type LiveWebsiteVariant,
} from '@/stores/study-builder'

const VARIANT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
]

interface AbVariantsPanelProps {
  className?: string
}

export const AbVariantsPanel = memo(function AbVariantsPanel({ className }: AbVariantsPanelProps) {
  const variants = useLiveWebsiteVariants()
  const selectedVariantId = useLiveWebsiteSelectedVariantId()
  const { addVariant, updateVariant, removeVariant, setSelectedVariantId } = useLiveWebsiteActions()

  const totalWeight = useMemo(
    () => variants.reduce((sum, v) => sum + v.weight, 0),
    [variants]
  )

  const segments = useMemo(() => {
    if (totalWeight === 0 || variants.length < 2) return []
    return variants.map((v, i) => ({
      id: v.id,
      name: v.name,
      percentage: Math.round((v.weight / totalWeight) * 100),
      color: VARIANT_COLORS[i % VARIANT_COLORS.length],
    }))
  }, [variants, totalWeight])

  const handleAddVariant = useCallback(() => {
    const id = addVariant()
    setSelectedVariantId(id)
  }, [addVariant, setSelectedVariantId])

  const handleRemove = useCallback((id: string) => {
    removeVariant(id)
  }, [removeVariant])

  return (
    <div className={cn('flex flex-col h-full border-r', className)}>
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Variants</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Add URLs to test</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddVariant}
          disabled={variants.length >= 5}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Weight distribution bar */}
      {segments.length >= 2 && (
        <div className="px-4 py-2 border-b">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Traffic distribution</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-muted">
            {segments.map((s) => (
              <div
                key={s.id}
                className={cn(s.color, 'transition-all duration-300')}
                style={{ width: `${s.percentage}%` }}
                title={`Variant ${s.name}: ${s.percentage}%`}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {segments.map((s) => (
              <span key={s.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={cn('inline-block w-2 h-2 rounded-full', s.color)} />
                {s.name}: {s.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Variant list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {variants.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No variants yet.</p>
            <p className="text-xs mt-1">Add variants to test different URLs.</p>
          </div>
        )}
        {variants.map((variant, index) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            index={index}
            isSelected={selectedVariantId === variant.id}
            onSelect={() => setSelectedVariantId(variant.id)}
            onUpdate={(updates) => updateVariant(variant.id, updates)}
            onRemove={() => handleRemove(variant.id)}
            canDelete={variants.length > 1}
          />
        ))}
      </div>

      {variants.length >= 5 && (
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground">Maximum 5 variants reached.</p>
        </div>
      )}
    </div>
  )
})

interface VariantCardProps {
  variant: LiveWebsiteVariant
  index: number
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Omit<LiveWebsiteVariant, 'id' | 'study_id'>>) => void
  onRemove: () => void
  canDelete: boolean
}

const VariantCard = memo(function VariantCard({
  variant,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  canDelete,
}: VariantCardProps) {
  const color = VARIANT_COLORS[index % VARIANT_COLORS.length]

  return (
    <div
      className={cn(
        'rounded-lg border p-3 cursor-pointer transition-colors',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'hover:border-border/80 hover:bg-muted/30'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2 mb-2">
        <Badge
          variant="secondary"
          className={cn('text-white text-xs font-bold shrink-0 mt-0.5', color)}
        >
          {variant.name}
        </Badge>
        <div className="flex-1 min-w-0" />
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-sm text-muted-foreground">Website URL</Label>
          <Input
            value={variant.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://your-app.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Weight</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={0}
              max={100}
              value={variant.weight}
              onChange={(e) => onUpdate({ weight: parseInt(e.target.value, 10) || 0 })}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">points</span>
          </div>
        </div>
      </div>
    </div>
  )
})
