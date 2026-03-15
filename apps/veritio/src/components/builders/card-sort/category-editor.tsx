'use client'

import { useState, useCallback } from 'react'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Pencil, Trash2, X, Check, FolderOpen, Upload, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCardSortBuilderStore } from '@/stores/study-builder'
import { ImportExportDialog, type ImportableItem } from '@/components/builders/shared/import-export-dialog'
import type { Category } from '@veritio/study-types'

interface SortableCategoryItemProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

function SortableCategoryItem({ category, onEdit, onDelete }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-background p-3 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <FolderOpen className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.label}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(category)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(category.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface CategoryFormProps {
  category?: Category
  onSave: (label: string) => void
  onCancel: () => void
}

function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [label, setLabel] = useState(category?.label ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (label.trim()) {
      onSave(label.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
      <Input
        placeholder="Category name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
        className="flex-1"
      />
      <Button type="submit" size="sm" disabled={!label.trim()}>
        <Check className="h-3.5 w-3.5" />
        <KeyboardShortcutHint shortcut="enter" variant="dark" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
        <EscapeHint />
      </Button>
    </form>
  )
}

interface CategoryEditorProps {
  studyId: string
  disabled?: boolean
}

export function CategoryEditor({ studyId, disabled }: CategoryEditorProps) {
  const { categories, settings, addCategory, updateCategory, removeCategory, reorderCategories } = useCardSortBuilderStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleImport = useCallback((items: ImportableItem[]) => {
    const startPosition = categories.length
    items.forEach((item, index) => {
      addCategory({
        study_id: studyId,
        label: item.label,
        description: item.description || null,
        position: startPosition + index,
      })
    })
  }, [categories.length, studyId, addCategory])

  const exportableCategories: ImportableItem[] = categories.map((cat) => ({
    label: cat.label,
    description: cat.description,
  }))

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

  const handleAddCategory = (label: string) => {
    addCategory({
      study_id: studyId,
      label,
      description: null,
      position: categories.length,
    })
    setShowAddForm(false)
  }

  const handleUpdateCategory = (label: string) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, { label })
      setEditingCategory(null)
    }
  }

  if (settings.mode === 'open') {
    return null
  }

  return (
    <Card className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Categories</CardTitle>
          <div className="flex items-center gap-2">
            <ImportExportDialog
              title="Import/Export Categories"
              description="Import categories from CSV, JSON, or plain text. Export your existing categories in various formats."
              items={exportableCategories}
              onImport={handleImport}
              itemName="category"
              trigger={
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  <Download className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <span className="text-sm text-muted-foreground">
              {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
        </div>
        <CardDescription>
          {settings.mode === 'closed'
            ? 'Participants will sort cards into these predefined categories.'
            : 'Predefined categories that participants can use or create their own.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length > 0 && (
          <ScrollArea className="h-[200px] pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categories.map((category) =>
                    editingCategory?.id === category.id ? (
                      <CategoryForm
                        key={category.id}
                        category={category}
                        onSave={handleUpdateCategory}
                        onCancel={() => setEditingCategory(null)}
                      />
                    ) : (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
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

        {categories.length === 0 && !showAddForm && (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No categories yet. Add categories for participants to sort cards into.
            </p>
          </div>
        )}

        {showAddForm ? (
          <CategoryForm
            onSave={handleAddCategory}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
