'use client'

import { memo } from 'react'
import { ConnectedIntegrationPill } from './connected-integration-pill'
import { IntegrationPicker } from './integration-picker'
import type { ConnectionInfo } from '@/hooks/use-composio-status'

interface IntegrationBarProps {
  isConfigured: boolean
  connections: ConnectionInfo[]
  isConnected: (toolkit: string) => boolean
  onConnect: (toolkit: string) => Promise<void>
  onDisconnect: (toolkit: string) => Promise<void>
}

export const IntegrationBar = memo(function IntegrationBar({
  isConfigured,
  connections,
  isConnected,
  onConnect,
  onDisconnect,
}: IntegrationBarProps) {
  if (!isConfigured) return null

  const connectedItems = connections.filter((c) => c.connected)

  return (
    <div className="flex-shrink-0 border-t border-border px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
        {connectedItems.map((conn) => (
          <ConnectedIntegrationPill
            key={conn.toolkit}
            connection={conn}
            onDisconnect={onDisconnect}
          />
        ))}
        <IntegrationPicker
          isConnected={isConnected}
          onConnect={onConnect}
          isEmpty={connectedItems.length === 0}
        />
      </div>
    </div>
  )
})
