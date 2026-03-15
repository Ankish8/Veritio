'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useCardSortCategories, useCardSortSettings, useCardSortActions } from '@/stores/study-builder'
import { SortableCategoryItem, InlineCategoryEditForm } from '../components'
import type { Category } from '@veritio/study-types'

interface CategoriesSectionProps {
  studyId: string
}

export function CategoriesSection({ studyId }: CategoriesSectionProps) {
  const categories = useCardSortCategories()
  const settings = useCardSortSettings()
  const { addCategory, updateCategory, removeCategory, reorderCategories, setSettings } = useCardSortActions()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const showDescriptions = settings.showCategoryDescriptions ?? false

  useEffect(() => {
    const handleKeyboardAddCategory = () => {
      inputRef.current?.focus()
    }

    window.addEventListener('builder:add-category', handleKeyboardAddCategory)
    return () => {
      window.removeEventListener('builder:add-category', handleKeyboardAddCategory)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id)
      const newIndex = categories.findIndex((cat) => cat.id === over.id)
      const newCategories = arrayMove(categories, oldIndex, newIndex).map((cat, index) => ({
        ...cat,
        position: index,
      }))
      reorderCategories(newCategories)
    }
  }

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCategoryLabel.trim()) {
      addCategory({
        study_id: studyId,
        label: newCategoryLabel.trim(),
        description: newCategoryDescription.trim() || null,
        position: categories.length,
      })
      setNewCategoryLabel('')
      setNewCategoryDescription('')
    }
  }

  const handleUpdateCategory = (label: string, description?: string | null) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, {
        label,
        ...(description !== undefined && { description }),
      })
      setEditingCategory(null)
    }
  }

  const handleDeleteAll = () => {
    categories.forEach((category) => removeCategory(category.id))
  }

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Categories</Label>
          <p className="text-sm text-muted-foreground">
            {settings.mode === 'closed'
              ? 'Predefined categories for sorting'
              : 'Starting categories (participants can add more)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Descriptions</span>
            <Switch
              checked={showDescriptions}
              onCheckedChange={(checked) => setSettings({ showCategoryDescriptions: checked })}
              className="h-5"
            />
          </div>
          {categories.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteAllConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete all
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete all categories</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <form onSubmit={handleAddCategory} className="mt-4 border rounded-lg p-3">
        {showDescriptions ? (
          <div className="space-y-2">
            <Input
              ref={inputRef}
              placeholder="Category label (required)"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
            />
            <Textarea
              placeholder="Category description (optional)"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!newCategoryLabel.trim()}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add
                <KeyboardShortcutHint shortcut="enter" variant="dark" className="ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              placeholder="Category label (required)"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newCategoryLabel.trim()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add
              <KeyboardShortcutHint shortcut="enter" variant="dark" className="ml-2" />
            </Button>
          </div>
        )}
      </form>

      {categories.length > 0 && (
        <ScrollArea className="flex-1 min-h-0 mt-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 pr-4">
                {categories.map((category) =>
                  editingCategory?.id === category.id ? (
                    <InlineCategoryEditForm
                      key={category.id}
                      category={category}
                      showDescription={showDescriptions}
                      onSave={handleUpdateCategory}
                      onCancel={() => setEditingCategory(null)}
                    />
                  ) : (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      studyId={studyId}
                      showDescription={showDescriptions}
                      onEdit={setEditingCategory}
                      onDelete={removeCategory}
                    />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      )}

      {categories.length === 0 && (
        <div className="flex-1 min-h-0 mt-4 rounded-md border border-dashed p-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No categories yet. Type above to add one.
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <p className="text-sm text-muted-foreground mt-3 flex-shrink-0">
          {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
        </p>
      )}

      <ConfirmDialog
        open={showDeleteAllConfirm}
        onOpenChange={setShowDeleteAllConfirm}
        title="Delete all categories?"
        description={`This will permanently delete all ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}. This action cannot be undone.`}
        confirmText="Delete all"
        variant="danger"
        onConfirm={handleDeleteAll}
      />
    </section>
  )
}
