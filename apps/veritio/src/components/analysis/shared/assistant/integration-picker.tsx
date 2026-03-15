'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Search, Loader2, ExternalLink, Plug } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useComposioToolkits } from '@/hooks/use-composio-toolkits'

interface IntegrationPickerProps {
  isConnected: (toolkit: string) => boolean
  onConnect: (toolkit: string) => Promise<void>
  isEmpty?: boolean
}

export const IntegrationPicker = memo(function IntegrationPicker({
  isConnected,
  onConnect,
  isEmpty,
}: IntegrationPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {isEmpty ? (
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plug className="h-3.5 w-3.5" />
            Connect an integration
            <Plus className="h-3 w-3 ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-0">
        {open && (
          <PickerContent
            isConnected={isConnected}
            onConnect={onConnect}
          />
        )}
      </PopoverContent>
    </Popover>
  )
})

function IntegrationIcon({ logo, name }: { logo: string | null; name: string }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} className="h-5 w-5 object-contain" />
  ) : (
    <Plug className="h-4 w-4 text-muted-foreground" />
  )
}

function PickerContent({
  isConnected,
  onConnect,
}: {
  isConnected: (toolkit: string) => boolean
  onConnect: (toolkit: string) => Promise<void>
}) {
  const { toolkits, isLoading, isLoadingMore, hasMore, loadMore } = useComposioToolkits('', 50)
  const [search, setSearch] = useState('')
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null)

  const filteredToolkits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return toolkits
    return toolkits.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    )
  }, [toolkits, search])

  const handleConnect = useCallback(
    async (slug: string, name: string) => {
      setConnectingSlug(slug)
      try {
        await onConnect(slug)
      } catch {
        toast.error(`Failed to connect ${name}`)
        setConnectingSlug(null)
      }
    },
    [onConnect]
  )

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          placeholder="Search integrations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          autoFocus
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* List */}
      <div className="max-h-[480px] overflow-y-auto">
        <div className="p-2 space-y-0.5">
          {isLoading && toolkits.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : filteredToolkits.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No integrations found
            </div>
          ) : (
            <>
              {filteredToolkits.map((toolkit) => {
                const connected = isConnected(toolkit.slug)
                const isConnecting = connectingSlug === toolkit.slug

                return (
                  <ToolkitRow
                    key={toolkit.slug}
                    toolkit={toolkit}
                    isConnected={connected}
                    isConnecting={isConnecting}
                    onConnect={handleConnect}
                  />
                )
              })}

              {hasMore && (
                <div className="flex justify-center pt-1 pb-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="h-7 text-xs"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
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
        </div>
      </div>
    </div>
  )
}

function ToolkitRow({
  toolkit,
  isConnected,
  isConnecting,
  onConnect,
}: {
  toolkit: { slug: string; name: string; logo: string | null; description: string | null }
  isConnected: boolean
  isConnecting: boolean
  onConnect: (slug: string, name: string) => Promise<void>
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <IntegrationIcon logo={toolkit.logo} name={toolkit.name} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{toolkit.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {toolkit.description || 'No description'}
        </p>
      </div>
      {isConnected ? (
        <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs px-2 py-0.5 shrink-0">
          Connected
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onConnect(toolkit.slug, toolkit.name)}
          disabled={isConnecting}
          className="h-7 text-xs px-2.5 shrink-0"
        >
          {isConnecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <ExternalLink className="h-3 w-3 mr-1" />
              Connect
            </>
          )}
        </Button>
      )}
    </div>
  )
}
