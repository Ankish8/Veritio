'use client'

import type { ReactNode } from 'react'
import { Button } from '@veritio/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@veritio/ui/components/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react'

export interface ParticipantDetailDialogBaseProps {
  open: boolean
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  canNavigatePrev: boolean
  canNavigateNext: boolean
  participantIndex: number
  subtitle?: string
  isExcluded?: boolean
  onToggleExclude?: (exclude: boolean) => void
  children: ReactNode
  maxWidth?: string
}

export function ParticipantDetailDialogBase({
  open,
  onClose,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
  participantIndex,
  subtitle,
  isExcluded,
  onToggleExclude,
  children,
  maxWidth = 'max-w-3xl',
}: ParticipantDetailDialogBaseProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={`${maxWidth} max-h-[80vh] overflow-y-auto`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Participant {participantIndex}</DialogTitle>
              {subtitle && (
                <DialogDescription>{subtitle}</DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onNavigate('prev')}
                disabled={!canNavigatePrev}
                aria-label="Previous participant"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onNavigate('next')}
                disabled={!canNavigateNext}
                aria-label="Next participant"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {children}
        </div>

        {/* Exclude/Include toggle footer */}
        {onToggleExclude && isExcluded !== undefined && (
          <div className="flex justify-end pt-2 border-t">
            <Button
              variant={isExcluded ? 'default' : 'outline'}
              onClick={() => onToggleExclude(!isExcluded)}
            >
              {isExcluded ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Include in Analysis
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Exclude from Analysis
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export interface StatCardProps {
  value: string | number
  label: string
  icon?: ReactNode
  className?: string
}

export function StatCard({ value, label, icon, className = '' }: StatCardProps) {
  return (
    <div className={`bg-muted rounded-lg p-3 text-center ${className}`}>
      {icon ? (
        <div className="flex justify-center">{icon}</div>
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

export interface InfoRowProps {
  label: string
  value: ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </div>
  )
}
