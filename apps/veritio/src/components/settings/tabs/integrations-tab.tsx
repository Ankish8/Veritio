'use client'

import { useState, useCallback, useMemo } from 'react'
import { useComposioStatus } from '@/hooks/use-composio-status'
import { useComposioToolkits } from '@/hooks/use-composio-toolkits'
import { useComposioAvailableTriggers } from '@/hooks/use-composio-available-triggers'
import { useComposioTriggers } from '@/hooks/use-composio-triggers'
import type { ComposioTrigger } from '@/hooks/use-composio-triggers'
import type { AvailableTrigger } from '@/hooks/use-composio-available-triggers'
import type { ToolkitInfo } from '@/hooks/use-composio-toolkits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Plug,
  Search,
  Loader2,
  Check,
  ExternalLink,
  Unplug,
  ChevronDown,
  ChevronRight,
  Zap,
  Trash2,
  Radio,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'

function IntegrationIcon({ logo, name, size = 'md' }: { logo: string | null; name: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} className={`${sizeClass} object-contain`} />
  ) : (
    <Plug className={`${iconClass} text-muted-foreground`} />
  )
}

export function IntegrationsTab() {
  const {
    isConfigured,
    connections,
    isConnected,
    connect,
    disconnect,
    isLoading: isStatusLoading,
  } = useComposioStatus()

  const {
    toolkits: allToolkits,
    isLoading: isToolkitsLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useComposioToolkits('', 50)

  const [search, setSearch] = useState('')

  // Client-side filtering — the allowed toolkits list is small enough to filter locally
  const toolkits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allToolkits
    return allToolkits.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    )
  }, [allToolkits, search])

  // Enrich connected toolkit data with metadata (logos, descriptions) from the toolkits endpoint
  // so the status endpoint doesn't need to make a slow Composio API call
  const toolkitMetaMap = useMemo(() => {
    const map = new Map<string, ToolkitInfo>()
    for (const tk of allToolkits) {
      map.set(tk.slug.toLowerCase(), tk)
    }
    return map
  }, [allToolkits])

  const connectedToolkits = useMemo(() =>
    connections.filter(c => c.connected).map(c => {
      const meta = toolkitMetaMap.get(c.toolkit.toLowerCase())
      return {
        ...c,
        name: meta?.name || c.name,
        logo: meta?.logo || c.logo,
        description: meta?.description || c.description,
      }
    }),
  [connections, toolkitMetaMap])

  if (!isConfigured && !isStatusLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>
              Third-party integrations are not configured for this instance. Contact your administrator to enable Composio integration support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Connected Integrations */}
      {connectedToolkits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Connected ({connectedToolkits.length})
            </CardTitle>
            <CardDescription>
              Services currently connected to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {connectedToolkits.map(conn => (
                <ConnectedToolkitRow
                  key={conn.toolkit}
                  toolkit={conn.toolkit}
                  name={conn.name}
                  logo={conn.logo}
                  description={conn.description}
                  account={conn.account}
                  onDisconnect={disconnect}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Available Integrations
          </CardTitle>
          <CardDescription>
            Connect third-party services to export study data and automate workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Separator />

          {/* Toolkit grid */}
          {isToolkitsLoading && toolkits.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading integrations...
            </div>
          ) : toolkits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? `No integrations found for "${search}"` : 'No integrations available'}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {toolkits.map(toolkit => (
                  <ToolkitCard
                    key={toolkit.slug}
                    toolkit={toolkit}
                    connected={isConnected(toolkit.slug)}
                    onConnect={connect}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ToolkitCard({
  toolkit,
  connected,
  onConnect,
}: {
  toolkit: ToolkitInfo
  connected: boolean
  onConnect: (slug: string) => Promise<void>
}) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    try {
      await onConnect(toolkit.slug)
    } catch {
      toast.error(`Failed to connect ${toolkit.name}`)
      setIsConnecting(false)
    }
  }, [onConnect, toolkit.slug, toolkit.name])

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <IntegrationIcon logo={toolkit.logo} name={toolkit.name} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{toolkit.name}</span>
          {connected && (
            <Badge variant="secondary" className="text-green-700 bg-green-100 shrink-0">
              Connected
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {toolkit.description || 'No description'}
        </p>
      </div>
      {!connected && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleConnect}
          disabled={isConnecting}
          className="shrink-0"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Connect
            </>
          )}
        </Button>
      )}
    </div>
  )
}

function ConnectedToolkitRow({
  toolkit,
  name,
  logo,
  description,
  account,
  onDisconnect,
}: {
  toolkit: string
  name: string
  logo: string | null
  description: string | null
  account: string | null
  onDisconnect: (slug: string) => Promise<void>
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showTriggers, setShowTriggers] = useState(false)

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true)
    try {
      await onDisconnect(toolkit)
      toast.success(`${name} disconnected`)
    } catch {
      toast.error(`Failed to disconnect ${name}`)
    } finally {
      setIsDisconnecting(false)
    }
  }, [onDisconnect, toolkit, name])

  return (
    <div className="rounded-lg border">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <IntegrationIcon logo={logo} name={name} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{name}</span>
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                Connected
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {account || description || toolkit}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-[52px]">
          <Button variant="ghost" size="sm" onClick={() => setShowTriggers(!showTriggers)}>
            <Zap className="h-4 w-4" />
            Triggers
            {showTriggers ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="text-muted-foreground hover:text-destructive"
          >
            {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Disconnect
          </Button>
        </div>
      </div>

      {showTriggers && (
        <TriggerSection toolkit={toolkit} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trigger Section — shown inside each connected toolkit row
// ---------------------------------------------------------------------------

function TriggerSection({ toolkit }: { toolkit: string }) {
  const { availableTriggers, isLoading: isLoadingAvailable } = useComposioAvailableTriggers(toolkit)
  const { triggers: activeTriggers, createTrigger, deleteTrigger, isLoading: isLoadingActive } = useComposioTriggers(toolkit)

  const isLoading = isLoadingAvailable || isLoadingActive

  // Map active triggers by slug for quick lookup
  const activeTriggerMap = useMemo(() => {
    const map = new Map<string, ComposioTrigger>()
    for (const t of activeTriggers) {
      map.set(t.trigger_slug, t)
    }
    return map
  }, [activeTriggers])

  if (isLoading) {
    return (
      <div className="border-t px-4 py-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">Loading triggers...</span>
      </div>
    )
  }

  if (availableTriggers.length === 0) {
    return (
      <div className="border-t px-4 py-6">
        <p className="text-sm text-muted-foreground text-center">No event triggers available for this integration.</p>
      </div>
    )
  }

  return (
    <div className="border-t">
      <div className="px-4 py-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Event Triggers</span>
        {activeTriggers.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {activeTriggers.length} active
          </Badge>
        )}
      </div>
      <div className="px-4 pb-4 space-y-2">
        {availableTriggers.map(trigger => (
          <TriggerRow
            key={trigger.slug}
            trigger={trigger}
            toolkit={toolkit}
            activeTrigger={activeTriggerMap.get(trigger.slug)}
            onEnable={createTrigger}
            onRemove={deleteTrigger}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual trigger row
// ---------------------------------------------------------------------------

function TriggerRow({
  trigger,
  toolkit,
  activeTrigger,
  onEnable,
  onRemove,
}: {
  trigger: AvailableTrigger
  toolkit: string
  activeTrigger: ComposioTrigger | undefined
  onEnable: (params: { toolkit: string; triggerSlug: string; config?: Record<string, unknown> }) => Promise<unknown>
  onRemove: (triggerId: string) => Promise<void>
}) {
  const isActive = !!activeTrigger
  const [isEnabling, setIsEnabling] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})

  // Determine if this trigger requires config fields
  const configFields = useMemo(() => {
    const schema = trigger.configSchema
    if (!schema || typeof schema !== 'object') return []
    // Composio config schemas use { properties: { field: { type, description } }, required: [] }
    const properties = (schema as any).properties ?? schema
    if (!properties || typeof properties !== 'object') return []

    return Object.entries(properties)
      .filter(([key]) => key !== 'type' && key !== '$schema')
      .map(([key, value]) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
        description: (value as any)?.description ?? '',
        type: (value as any)?.type ?? 'string',
        required: Array.isArray((schema as any).required) && (schema as any).required.includes(key),
        defaultValue: (value as any)?.default,
      }))
  }, [trigger.configSchema])

  const needsConfig = configFields.length > 0 && !isActive

  const handleEnable = useCallback(async () => {
    if (needsConfig && !showConfig) {
      setShowConfig(true)
      // Pre-fill defaults
      const defaults: Record<string, string> = {}
      for (const field of configFields) {
        if (field.defaultValue !== undefined) {
          defaults[field.key] = String(field.defaultValue)
        }
      }
      setConfigValues(defaults)
      return
    }

    setIsEnabling(true)
    try {
      const config = needsConfig || showConfig
        ? Object.fromEntries(
            Object.entries(configValues)
              .filter(([, v]) => v !== '')
              .map(([k, v]) => {
                // Try to parse numbers
                const num = Number(v)
                return [k, !isNaN(num) && v.trim() !== '' ? num : v]
              })
          )
        : undefined

      await onEnable({ toolkit, triggerSlug: trigger.slug, config })
      toast.success(`Trigger enabled: ${trigger.name || trigger.slug}`)
      setShowConfig(false)
      setConfigValues({})
    } catch (err) {
      toast.error(`Failed to enable trigger: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsEnabling(false)
    }
  }, [needsConfig, showConfig, configValues, configFields, toolkit, trigger.slug, trigger.name, onEnable])

  const handleRemove = useCallback(async () => {
    if (!activeTrigger) return
    setIsRemoving(true)
    try {
      await onRemove(activeTrigger.id)
      toast.success(`Trigger removed: ${trigger.name || trigger.slug}`)
    } catch (err) {
      toast.error(`Failed to remove trigger: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsRemoving(false)
    }
  }, [activeTrigger, onRemove, trigger.name, trigger.slug])

  return (
    <div className={`rounded-lg border p-4 ${isActive ? 'border-primary/20 bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Radio className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {trigger.name || trigger.slug}
            </span>
            {isActive && activeTrigger && activeTrigger.event_count > 0 && (
              <span className="text-sm text-muted-foreground shrink-0">
                {activeTrigger.event_count} event{activeTrigger.event_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {trigger.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {trigger.description}
            </p>
          )}
          {isActive && activeTrigger?.last_event_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Last fired: {formatRelativeTime(activeTrigger.last_event_at)}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving}
              className="text-muted-foreground hover:text-destructive"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Enable'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Config form for triggers that need configuration */}
      {showConfig && !isActive && (
        <div className="mt-4 space-y-3 border-t pt-4 ml-7">
          {configFields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">{field.description}</p>
              )}
              <Input
                value={configValues[field.key] ?? ''}
                onChange={e => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.defaultValue !== undefined ? String(field.defaultValue) : `Enter ${field.label.toLowerCase()}`}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Enable Trigger
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowConfig(false); setConfigValues({}) }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(dateStr).toLocaleDateString()
}
