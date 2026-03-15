'use client'

import { useState, useCallback, useEffect, startTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Upload, Download, Tag, Trash2, Search, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { ParticipantsTable } from '@/components/panel/participants/participants-table'
import { ParticipantsPagination } from '@/components/panel/participants/participants-pagination'
import { usePanelParticipants, usePanelImport } from '@/hooks/panel/use-panel-participants'
import { usePanelTags } from '@/hooks/panel/use-panel-tags'
import { useDebounce } from '@/hooks/use-debounce'
import { markParticipantsViewed } from '@/hooks/panel/use-recent-participants-count'
import { PARTICIPANT_STATUS, PARTICIPANT_SOURCE } from '@/lib/supabase/panel-types'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'

import type { PanelParticipantFilters } from '@/lib/supabase/panel-types'

const CreateParticipantDialog = dynamic(
  () => import('@/components/panel/participants/create-participant-dialog').then(mod => ({ default: mod.CreateParticipantDialog })),
  { ssr: false }
)
const ImportCSVDialog = dynamic(
  () => import('@/components/panel/participants/import-csv-dialog').then(mod => ({ default: mod.ImportCSVDialog })),
  { ssr: false }
)

interface ParticipantsClientProps {
  organizationId?: string
}

export function ParticipantsClient({ organizationId: overrideOrganizationId }: ParticipantsClientProps) {
  const router = useRouter()
  const storeOrganizationId = useCurrentOrganizationId()
  const organizationId = overrideOrganizationId || storeOrganizationId
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState<PanelParticipantFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined }))
  }, [debouncedSearch])

  const {
    participants,
    total,
    hasMore,
    isLoading,
    createParticipant,
    deleteParticipant,
    bulkDeleteParticipants,
    mutate,
  } = usePanelParticipants({
    filters,
    pagination: { page, limit: pageSize },
    overrideOrganizationId,
  })

  // Mark participants as viewed on mount → clears the sidebar badge
  useEffect(() => {
    markParticipantsViewed(organizationId ?? undefined)
  }, [organizationId])

  const { importParticipants } = usePanelImport()
  const { tags, createTag, mutate: mutateTags } = usePanelTags(overrideOrganizationId)

  const handleCreateTag = useCallback(
    async (name: string, color: string) => {
      const newTag = await createTag({ name, color })
      mutateTags()
      return newTag
    },
    [createTag, mutateTags]
  )

  const hasActiveFilters = filters.status || filters.source || filters.search

  const clearFilters = () => {
    setFilters({})
    setSearchInput('')
  }

  const handleSelectId = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(participants.map((p) => p.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [participants]
  )

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handlePrefetch = useCallback((participant: any) => {
    router.prefetch(`/panel/participants/${participant.id}`)
  }, [router])

  const handleViewDetails = useCallback((participant: any) => {
    startTransition(() => {
      router.push(`/panel/participants/${participant.id}`)
    })
  }, [router])

  const handleEdit = useCallback((participant: any) => {
    toast.info(`Edit ${participant.email}`)
  }, [])

  const handleDelete = useCallback(
    async (participant: any) => {
      if (!confirm(`Delete ${participant.email}?`)) return

      try {
        await deleteParticipant(participant.id)
        toast.success('Participant deleted')
      } catch {
        toast.error('Failed to delete participant')
      }
    },
    [deleteParticipant]
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} participants?`)) return

    try {
      await bulkDeleteParticipants(Array.from(selectedIds))
      toast.success(`Deleted ${selectedIds.size} participants`)
      setSelectedIds(new Set())
    } catch {
      toast.error('Failed to delete participants')
    }
  }, [selectedIds, bulkDeleteParticipants])

  const handleBulkTag = useCallback(() => {
    if (selectedIds.size === 0) return
    toast.info(`Bulk tag ${selectedIds.size} participants`)
  }, [selectedIds])

  const handleImport = useCallback(
    async (data: {
      participants: Array<{ email: string; first_name?: string; last_name?: string }>
      duplicate_handling: 'skip' | 'update' | 'merge'
      auto_create_tags: boolean
    }) => {
      const result = await importParticipants(data)
      mutate()
      return result
    },
    [importParticipants, mutate]
  )

  const handleExport = useCallback(() => {
    if (participants.length === 0) {
      toast.error('No participants to export')
      return
    }

    const headers = ['email', 'first_name', 'last_name', 'status', 'source', 'created_at']
    const csvRows = [
      headers.join(','),
      ...participants.map((p) =>
        [
          p.email,
          p.first_name || '',
          p.last_name || '',
          p.status,
          p.source,
          p.created_at,
        ]
          .map((val) => `"${val}"`)
          .join(',')
      ),
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `participants_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${participants.length} participants`)
  }, [participants])

  const selectedCount = selectedIds.size

  return (
    <>
      <Header title="Participants">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button size="sm" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Participant
        </Button>
      </Header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={typeof filters.status === 'string' ? filters.status : 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v === 'all' ? undefined : (v as any) }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {PARTICIPANT_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeof filters.source === 'string' ? filters.source : 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, source: v === 'all' ? undefined : (v as any) }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {PARTICIPANT_SOURCE.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span>
                {total} {total === 1 ? 'participant' : 'participants'}
              </span>
            )}
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedCount} {selectedCount === 1 ? 'participant' : 'participants'} selected
              </span>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkTag}>
                <Tag className="h-4 w-4" />
                Apply Tags
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}

        <ParticipantsTable
          participants={participants}
          selectedIds={selectedIds}
          onSelectId={handleSelectId}
          onSelectAll={handleSelectAll}
          onViewDetails={handleViewDetails}
          onPrefetch={handlePrefetch}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />

        {total > 0 && (
          <ParticipantsPagination
            page={page}
            limit={pageSize}
            total={total}
            hasMore={hasMore}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </div>

      <CreateParticipantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createParticipant}
        availableTags={tags}
        onCreateTag={handleCreateTag}
      />

      <ImportCSVDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </>
  )
}
