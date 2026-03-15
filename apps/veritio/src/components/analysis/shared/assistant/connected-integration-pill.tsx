'use client'

import { memo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Loader2, Unplug, Plug } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import type { ConnectionInfo } from '@/hooks/use-composio-status'

interface ConnectedIntegrationPillProps {
  connection: ConnectionInfo
  onDisconnect: (toolkit: string) => Promise<void>
}

function IntegrationIcon({ logo, name }: { logo: string | null; name: string }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} className="h-5 w-5 object-contain" />
  ) : (
    <Plug className="h-4 w-4 text-muted-foreground" />
  )
}

export const ConnectedIntegrationPill = memo(function ConnectedIntegrationPill({
  connection,
  onDisconnect,
}: ConnectedIntegrationPillProps) {
  const [open, setOpen] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true)
    try {
      await onDisconnect(connection.toolkit)
      toast.success(`${connection.name} disconnected`)
      setOpen(false)
    } catch {
      toast.error(`Failed to disconnect ${connection.name}`)
    } finally {
      setIsDisconnecting(false)
    }
  }, [onDisconnect, connection.toolkit, connection.name])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <IntegrationIcon logo={connection.logo} name={connection.name} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-[1.5px] ring-background" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{connection.name}</TooltipContent>
      </Tooltip>

      <PopoverContent side="top" align="start" className="w-56 p-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <IntegrationIcon logo={connection.logo} name={connection.name} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{connection.name}</p>
            {connection.account && (
              <p className="text-xs text-muted-foreground truncate">{connection.account}</p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs mb-3">
          Connected
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="w-full h-7 text-xs text-muted-foreground hover:text-destructive"
        >
          {isDisconnecting ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Unplug className="h-3 w-3 mr-1" />
          )}
          Disconnect
        </Button>
      </PopoverContent>
    </Popover>
  )
})
