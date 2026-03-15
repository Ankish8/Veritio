'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { Folder, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgreementBadge } from './agreement-badge'
import type { EnhancedCategoryAnalysis } from './use-category-analysis'

interface CategoryRowProps {
  analysis: EnhancedCategoryAnalysis
  isExpanded: boolean
  onToggleExpand: () => void
  maxCardsDefault: number
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onEdit: () => void
  isLast?: boolean
}

export const CategoryRow = memo(function CategoryRow({
  analysis,
  isExpanded,
  onToggleExpand,
  maxCardsDefault,
  isSelected,
  onSelect,
  onEdit,
}: CategoryRowProps) {
  const displayCards = isExpanded ? analysis.cards : analysis.cards.slice(0, maxCardsDefault)
  const hiddenCardsCount = !isExpanded ? Math.max(0, analysis.cards.length - maxCardsDefault) : 0
  const hasExpandableCards = analysis.cards.length > maxCardsDefault
  const cardCount = displayCards.length + (hasExpandableCards ? 1 : 0) || 1

  if (displayCards.length === 0) {
    return (
      <TableRow className="border-b border-border/60 hover:bg-muted/30">
        <TableCell className="relative border-l-4 border-l-transparent">
          {analysis.isStandardized && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
          )}
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{analysis.categoryName}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">0 cards</TableCell>
        <TableCell className="bg-slate-100/50 dark:bg-slate-800/30 text-muted-foreground">—</TableCell>
        <TableCell className="text-center bg-slate-100/50 dark:bg-slate-800/30 text-muted-foreground">—</TableCell>
        <TableCell className="text-center bg-slate-100/50 dark:bg-slate-800/30 text-muted-foreground">—</TableCell>
        <TableCell>{analysis.createdByCount} participant{analysis.createdByCount !== 1 ? 's' : ''}</TableCell>
        <TableCell>{analysis.agreementScore !== null ? <AgreementBadge score={analysis.agreementScore} /> : '—'}</TableCell>
        <TableCell><Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button></TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {displayCards.map((card, cardIdx) => {
        const isFirstCard = cardIdx === 0
        const isLastCard = cardIdx === displayCards.length - 1 && hiddenCardsCount === 0

        return (
          <TableRow
            key={`${analysis.categoryName}-${card.cardId}`}
            className={cn(
              // Bottom border only on last card row (when no hidden cards) to separate category groups
              isLastCard && 'border-b border-border/60',
              // Subtle border between cards within same category (not on first)
              !isFirstCard && 'border-t border-slate-200/50 dark:border-slate-700/50',
              'hover:bg-muted/20'
            )}
          >
            {isFirstCard && (
              <>
                <TableCell
                  rowSpan={cardCount}
                  className="relative align-top pt-3 border-l-4 border-l-transparent"
                >
                  {analysis.isStandardized && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
                  )}
                  <Checkbox checked={isSelected} onCheckedChange={onSelect} />
                </TableCell>
                <TableCell rowSpan={cardCount} className="align-top pt-3">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{analysis.categoryName}</span>
                  </div>
                </TableCell>
                <TableCell rowSpan={cardCount} className="align-top pt-3 text-muted-foreground">
                  {analysis.uniqueCardCount} different card{analysis.uniqueCardCount !== 1 ? 's' : ''}
                </TableCell>
              </>
            )}

            <TableCell className="bg-slate-100/50 dark:bg-slate-800/30 py-2">
              <span className="text-sm">{card.cardLabel}</span>
            </TableCell>
            <TableCell className="text-center bg-slate-100/50 dark:bg-slate-800/30 py-2">
              <span className="text-sm">{card.frequency}</span>
            </TableCell>
            <TableCell className="text-center bg-slate-100/50 dark:bg-slate-800/30 py-2">
              <span className="text-sm">{card.averagePosition.toFixed(1)}</span>
            </TableCell>

            {isFirstCard && (
              <>
                <TableCell rowSpan={cardCount} className="align-top pt-3">
                  {analysis.createdByCount} participant{analysis.createdByCount !== 1 ? 's' : ''}
                </TableCell>
                <TableCell rowSpan={cardCount} className="align-top pt-3">
                  {analysis.agreementScore !== null ? <AgreementBadge score={analysis.agreementScore} /> : '—'}
                </TableCell>
                <TableCell rowSpan={cardCount} className="align-top pt-3">
                  <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </>
            )}
          </TableRow>
        )
      })}

      {hiddenCardsCount > 0 && (
        <TableRow
          className="border-b border-border/60 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={onToggleExpand}
        >
          <TableCell colSpan={3} className="bg-slate-50/50 dark:bg-slate-800/20 py-1.5 text-center">
            <span className="text-xs text-primary hover:underline font-medium">
              +{hiddenCardsCount} more card{hiddenCardsCount !== 1 ? 's' : ''}
            </span>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && analysis.cards.length > maxCardsDefault && (
        <TableRow
          className="border-b border-border/60 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={onToggleExpand}
        >
          <TableCell colSpan={3} className="bg-slate-50/50 dark:bg-slate-800/20 py-1.5 text-center">
            <span className="text-xs text-primary hover:underline font-medium">
              Show less
            </span>
          </TableCell>
        </TableRow>
      )}
    </>
  )
})
