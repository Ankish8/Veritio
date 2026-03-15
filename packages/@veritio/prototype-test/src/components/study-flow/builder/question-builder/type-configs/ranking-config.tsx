'use client'

import { Label } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Plus } from 'lucide-react'
import type { RankingQuestionConfig } from '../../../../../lib/supabase/study-flow-types'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDndSensors, useDragReorder, useOptionManagement } from '../hooks/use-sortable-options'
import { SortableOptionRow } from '../sortable-option-row'
import { RandomOrderToggle } from '../random-order-toggle'

interface RankingConfigProps {
  config: RankingQuestionConfig
  onChange: (config: Partial<RankingQuestionConfig>) => void
}

export function RankingConfig({ config, onChange }: RankingConfigProps) {
  const items = config.items || []

  const sensors = useDndSensors()

  const handleDragEnd = useDragReorder({
    items,
    onReorder: (newItems) => onChange({ items: newItems }),
  })

  // Reuse shared option management - RankingItem has the same { id, label } shape as ChoiceOption
  const { addOption: addItem, updateOption: updateItem, removeOption: removeItem, canRemove } = useOptionManagement({
    options: items,
    onChange: (updates) => onChange({ items: updates.options }),
    minOptions: 2,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Items to Rank</Label>
        <p className="text-xs text-muted-foreground">
          Add items that participants will drag to rank in order of preference
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableOptionRow
                  key={item.id}
                  option={item}
                  index={index}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  canRemove={canRemove}
                  placeholder="Item label"
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <RandomOrderToggle
        checked={config.randomOrder || false}
        onChange={(checked) => onChange({ randomOrder: checked })}
        label="Randomize Initial Order"
        description="Present items in random order for each participant"
      />
    </div>
  )
}
