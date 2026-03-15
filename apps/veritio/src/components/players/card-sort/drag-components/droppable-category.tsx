'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { FolderOpen, Pencil, Trash2, Check, X, ChevronRight, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CardWithImage, Category } from '@veritio/study-types'
import { DraggableCard } from './draggable-card'

interface CustomCategory {
  id: string
  label: string
  description?: string | null
}

interface DroppableCategoryProps {
  category: Category | CustomCategory
  cards: CardWithImage[]
  isCustom?: boolean
  isEditing?: boolean
  editValue?: string
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onSaveEdit?: () => void
  onEditChange?: (value: string) => void
  onDelete?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isHovered?: boolean
  showDescription?: boolean // Whether to show category description
  isUnclear?: boolean // Special styling for "Unclear" category
}

export function DroppableCategory({
  category,
  cards,
  isCustom,
  isEditing,
  editValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  isHovered,
  showDescription,
  isUnclear,
}: DroppableCategoryProps) {
  // Ensure cards is always an array (guard against undefined)
  const safeCards = Array.isArray(cards) ? cards : []

  const { setNodeRef, isOver } = useDroppable({ id: category.id })
  // Use either the native isOver or the external isHovered state
  const showHoverEffect = isOver || isHovered

  // Check if category needs naming (empty label for custom categories)
  const needsNaming = isCustom && !category.label.trim()

  // Get description if it exists on the category
  const description = 'description' in category ? category.description : null

  // Determine border and background colors based on state
  const getBorderAndBg = () => {
    if (showHoverEffect) {
      return {
        border: 'var(--brand)',
        bg: 'var(--brand-subtle)',
      }
    }
    if (isUnclear) {
      return {
        border: 'var(--warning-border, #fbbf24)',
        bg: 'var(--warning-bg, #fffbeb)',
      }
    }
    if (needsNaming) {
      return {
        border: 'var(--warning-border, #fb923c)',
        bg: 'var(--warning-bg, #fff7ed)',
      }
    }
    if (safeCards.length > 0) {
      return {
        border: 'var(--style-card-border)',
        bg: 'var(--style-bg-muted)',
      }
    }
    return {
      border: 'var(--style-card-border)',
      bg: 'transparent',
    }
  }

  const { border, bg } = getBorderAndBg()

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] p-4 transition-all ${showHoverEffect ? 'scale-[1.02]' : ''}`}
      style={{
        borderRadius: 'var(--style-radius-lg)',
        border: `2px dashed ${border}`,
        backgroundColor: bg,
      }}
    >
      <div
        className={`flex items-center gap-2 ${showDescription && description ? 'mb-1' : 'mb-3'} pb-3`}
        style={{ borderBottom: '1px solid var(--style-card-border)' }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-0.5 rounded transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`}
            style={{ color: 'var(--style-text-secondary)' }}
          />
        </button>
        {isUnclear ? (
          <HelpCircle className="h-5 w-5" style={{ color: 'var(--warning-color, #f59e0b)' }} />
        ) : (
          <FolderOpen
            className="h-5 w-5"
            style={{ color: needsNaming ? 'var(--warning-color, #f97316)' : 'var(--style-text-secondary)' }}
          />
        )}

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => onEditChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit?.()
                if (e.key === 'Escape') onCancelEdit?.()
              }}
              onBlur={onSaveEdit}
              placeholder="Enter group name..."
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={onSaveEdit} className="h-8 px-2">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur from firing before cancel
                onCancelEdit?.()
              }}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {needsNaming ? (
              <button
                onClick={onStartEdit}
                className="font-semibold text-base underline flex-1 text-left"
                style={{ color: 'var(--warning-color, #ea580c)' }}
              >
                Click to rename
              </button>
            ) : (
              <h3
                className="font-semibold text-base truncate flex-1"
                style={{ color: 'var(--style-text-primary)' }}
              >
                {category.label}
              </h3>
            )}

            {/* Card count badge when collapsed */}
            {isCollapsed && safeCards.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--brand-muted)',
                  color: 'var(--style-text-secondary)',
                }}
              >
                {safeCards.length}
              </span>
            )}

            {isCustom && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onStartEdit}
                  className="h-7 w-7 p-0"
                  style={{ color: 'var(--style-text-muted)' }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-7 w-7 p-0 hover:text-red-600"
                  style={{ color: 'var(--style-text-muted)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category description */}
      {showDescription && description && (
        <p className="text-sm mb-3 px-1" style={{ color: 'var(--style-text-secondary)' }}>
          {description}
        </p>
      )}

      {/* Collapsible content */}
      {!isCollapsed && (
        <>
          <SortableContext items={safeCards.map(c => c.id)} strategy={rectSortingStrategy}>
            <div className="space-y-2 min-h-[80px]">
              {safeCards.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--style-text-secondary)' }}>
                  Drop cards here
                </p>
              )}
              {safeCards.map((card) => (
                <DraggableCard key={card.id} card={card} />
              ))}
            </div>
          </SortableContext>
          <div
            className="mt-3 pt-2 text-xs text-center"
            style={{
              borderTop: '1px solid var(--style-card-border)',
              color: 'var(--style-text-secondary)',
            }}
          >
            {safeCards.length} card{safeCards.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  )
}
