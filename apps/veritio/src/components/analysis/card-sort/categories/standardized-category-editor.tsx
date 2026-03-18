'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@veritio/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EnhancedCategoryAnalysis } from './use-category-analysis'

interface StandardizedCategoryEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: EnhancedCategoryAnalysis | null
  allCategories: EnhancedCategoryAnalysis[]
  onSave: (name: string, includedCategories: string[]) => void
  onUnstandardizeAll: () => void
}

export function StandardizedCategoryEditor({
  open,
  onOpenChange,
  category,
  allCategories,
  onSave,
  onUnstandardizeAll,
}: StandardizedCategoryEditorProps) {
  const [name, setName] = useState('')
  const [includedCategories, setIncludedCategories] = useState<Set<string>>(new Set())
  const [selectedCategoryForCards, setSelectedCategoryForCards] = useState<string | null>(null)

  useEffect(() => {
    if (category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(category.categoryName)
      setIncludedCategories(new Set(category.originalCategories))
      setSelectedCategoryForCards(category.originalCategories[0] || null)
    }
  }, [category])

  const cardsForSelectedCategory = useMemo(() => {
    if (!selectedCategoryForCards || !category) return []
    const cat = allCategories.find(
      c => c.categoryName === selectedCategoryForCards || c.originalCategories.includes(selectedCategoryForCards)
    )
    return cat?.cards || []
  }, [selectedCategoryForCards, allCategories, category])

  const handleToggleCategory = (catName: string) => {
    setIncludedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catName)) next.delete(catName)
      else next.add(catName)
      return next
    })
  }

  const handleSave = useCallback(() => {
    if (name.trim() && includedCategories.size > 0) {
      onSave(name, Array.from(includedCategories))
    }
  }, [name, includedCategories, onSave])

  useKeyboardShortcut({
    enabled: open && !!name.trim() && includedCategories.size > 0,
    onCmdEnter: handleSave,
  })

  if (!category) return null

  const agreementScore = category.agreementScore ?? 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Standardized category editor</DialogTitle>
          <DialogDescription>
            Update your standardized category by including or excluding participant categories.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Standardized category name</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Categories</label>
                <span className="text-sm text-muted-foreground">Unique Cards</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Select a category name to show which cards your participant sorted into this
                category.
              </p>

              <div className="space-y-1 max-h-[200px] overflow-auto border rounded-md p-2">
                {category.originalCategories.map(catName => {
                  const catData = allCategories.find(
                    c => c.categoryName === catName || c.originalCategories.includes(catName)
                  )

                  return (
                    <div
                      key={catName}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50',
                        selectedCategoryForCards === catName && 'bg-muted'
                      )}
                      onClick={() => setSelectedCategoryForCards(catName)}
                    >
                      <Checkbox
                        checked={includedCategories.has(catName)}
                        onCheckedChange={() => handleToggleCategory(catName)}
                        onClick={e => e.stopPropagation()}
                      />
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{catName}</span>
                      <span className="text-sm text-muted-foreground">
                        {catData?.uniqueCardCount || 0}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agreement</label>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">{agreementScore}%</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      agreementScore >= 60 ? 'bg-green-500' : 'bg-yellow-400'
                    )}
                    style={{ width: `${agreementScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cards</label>
                <span className="text-sm text-muted-foreground">Frequency</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Select a card to show which categories your participants sorted this card into.
              </p>

              <div className="space-y-1 max-h-[200px] overflow-auto border rounded-md p-2">
                {cardsForSelectedCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a category to view cards
                  </p>
                ) : (
                  cardsForSelectedCategory.map(card => (
                    <div
                      key={card.cardId}
                      className="flex items-center justify-between p-2 rounded bg-muted/30"
                    >
                      <span className="text-sm">{card.cardLabel}</span>
                      <span className="text-sm text-muted-foreground">{card.frequency}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={onUnstandardizeAll}
            disabled={!category.isStandardized}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            Unstandardize All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
              <EscapeHint />
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || includedCategories.size === 0}
            >
              Update
              <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
