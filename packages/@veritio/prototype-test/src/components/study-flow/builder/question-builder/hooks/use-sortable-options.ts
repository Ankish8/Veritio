'use client'

import { useCallback } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { ChoiceOption } from '../../../../../lib/supabase/study-flow-types'
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}
export function useDragReorder<T extends { id: string }>({
  items,
  onReorder,
}: {
  items: T[]
  onReorder: (newItems: T[]) => void
}) {
  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorder(arrayMove(items, oldIndex, newIndex))
        }
      }
    },
    [items, onReorder]
  )
}
export function useOptionManagement({
  options,
  onChange,
  minOptions = 2,
}: {
  options: ChoiceOption[]
  onChange: (updates: { options: ChoiceOption[] }) => void
  minOptions?: number
}) {
  const addOption = useCallback(() => {
    const newOption: ChoiceOption = {
      id: crypto.randomUUID(),
      label: '',
    }
    onChange({ options: [...options, newOption] })
  }, [options, onChange])

  const updateOption = useCallback(
    (id: string, label: string) => {
      onChange({
        options: options.map((o) => (o.id === id ? { ...o, label } : o)),
      })
    },
    [options, onChange]
  )

  const removeOption = useCallback(
    (id: string) => {
      if (options.length > minOptions) {
        onChange({ options: options.filter((o) => o.id !== id) })
      }
    },
    [options, onChange, minOptions]
  )

  const canRemove = options.length > minOptions

  return {
    addOption,
    updateOption,
    removeOption,
    canRemove,
  }
}
