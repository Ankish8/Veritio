'use client'
import { RefreshCw, ExternalLink, Figma, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { cn } from '@veritio/ui'

interface PrototypeInfoCardProps {
  figmaFileName: string
  figmaUrl: string
  frameCount: number
  lastSyncedAt: string | null
  figmaFileModifiedAt: string | null
  isSyncing: boolean
  onSync: () => void
  onRemove?: () => void
}

export function PrototypeInfoCard({
  figmaFileName,
  figmaUrl,
  frameCount,
  lastSyncedAt,
  figmaFileModifiedAt,
  isSyncing,
  onSync,
  onRemove,
}: PrototypeInfoCardProps) {
  const hasChanges = figmaFileModifiedAt && lastSyncedAt &&
    new Date(figmaFileModifiedAt) > new Date(lastSyncedAt)

  return (
    <section className="p-4">
      <h3 className="text-xs font-semibold text-foreground mb-3">
        Linked Prototype
      </h3>

      {/* File card */}
      <div className="rounded-lg border bg-muted/30 p-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center shrink-0">
            <Figma className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{figmaFileName}</p>
            <p className="text-xs text-muted-foreground">
              {frameCount} {frameCount === 1 ? 'frame' : 'frames'} synced
            </p>
          </div>
        </div>
        {/* Sync status indicator */}
        {lastSyncedAt && (
          <div className="mt-2 pt-2 border-t border-border/50">
            {hasChanges ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 cursor-help">
                      <AlertCircle className="h-3 w-3" />
                      Figma file may have changed
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <p className="text-sm">
                      The Figma file was modified after your last sync. Re-sync to get the latest frames.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Up to date
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <TooltipProvider delayDuration={200}>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="flex-1 h-9"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Re-sync'}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(figmaUrl, '_blank')}
                className="h-9"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Open in Figma</p>
            </TooltipContent>
          </Tooltip>
          {onRemove && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemove}
                  className="h-9 text-muted-foreground hover:text-destructive hover:border-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Remove prototype</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </section>
  )
}
