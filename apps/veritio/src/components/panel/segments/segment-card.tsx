/**
 * Segment Card
 *
 * Elegant card displaying segment information with hover effects.
 */

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Users, Calendar, Filter, Edit, Copy, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { PanelSegment } from '@/lib/supabase/panel-types'

interface SegmentCardProps {
  segment: PanelSegment
  onEdit: (segment: PanelSegment) => void
  onDuplicate: (segment: PanelSegment) => void
  onDelete: (segment: PanelSegment) => void
  className?: string
}

export function SegmentCard({
  segment,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: SegmentCardProps) {
  const conditionCount = segment.conditions.length

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1',
        'bg-gradient-to-br from-white to-purple-50/20 border-purple-100/50',
        className
      )}
      onClick={() => onEdit(segment)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
              {segment.name}
            </h3>
            {segment.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{segment.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onEdit(segment)
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onDuplicate(segment)
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(segment)
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-purple-100/50 border border-purple-200/50 p-3">
            <div className="flex items-center gap-2 text-purple-700">
              <Users className="h-4 w-4" />
              <div>
                <div className="text-xl font-bold">{segment.participant_count}</div>
                <div className="text-xs font-medium opacity-80">Participants</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-violet-100/50 border border-violet-200/50 p-3">
            <div className="flex items-center gap-2 text-violet-700">
              <Filter className="h-4 w-4" />
              <div>
                <div className="text-xl font-bold">{conditionCount}</div>
                <div className="text-xs font-medium opacity-80">
                  {conditionCount === 1 ? 'Condition' : 'Conditions'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last updated */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          Updated {formatDistanceToNow(new Date(segment.updated_at), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  )
}
