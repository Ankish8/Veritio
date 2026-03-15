'use client'
import { Figma, AlertCircle } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'

interface FigmaAccountSectionProps {
  isConnected: boolean
  figmaUser: { handle?: string | null; email?: string | null; imgUrl?: string | null } | null
  tokenHealth: 'healthy' | 'warning' | 'expired' | null
  isConnecting: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function FigmaAccountSection({
  isConnected,
  figmaUser,
  tokenHealth,
  isConnecting,
  onConnect,
  onDisconnect,
}: FigmaAccountSectionProps) {
  return (
    <section className="p-4">
      <h3 className="text-xs font-semibold text-foreground mb-3">
        Figma Account
      </h3>
      {isConnected ? (
        <div className="flex items-center gap-3">
          {figmaUser?.imgUrl ? (
            <img
              src={figmaUser.imgUrl}
              alt={figmaUser?.handle || 'Figma user'}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {(figmaUser?.handle || figmaUser?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {figmaUser?.handle ? `@${figmaUser.handle}` : figmaUser?.email?.split('@')[0]}
            </p>
            {tokenHealth === 'expired' ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1 cursor-help">
                      <AlertCircle className="h-3 w-3" />
                      Session expired
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <p className="text-sm">
                      Your Figma session has expired. Reconnect to continue syncing prototypes.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : tokenHealth === 'warning' ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-amber-500 font-medium flex items-center gap-1 cursor-help">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Session expiring soon
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <p className="text-sm">
                      Your session will expire within an hour. We&apos;ll refresh it automatically when needed.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={tokenHealth === 'expired' ? onConnect : onDisconnect}
            className="text-xs h-8 text-muted-foreground"
          >
            {tokenHealth === 'expired' ? 'Reconnect' : 'Disconnect'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-amber-600 font-medium">Not connected</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full h-9"
          >
            <Figma className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect to Figma'}
          </Button>
        </div>
      )}
    </section>
  )
}
