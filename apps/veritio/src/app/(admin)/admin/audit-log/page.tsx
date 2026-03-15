'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { RefreshCw, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminFiltersBar } from '@/components/admin/shared/admin-filters-bar'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AuditLogEntry {
  id: string
  created_at: string
  user_id: string
  user: { id: string; name: string | null; email: string } | null
  action: string
  resource_type: string | null
  resource_id: string | null
  ip_address: string | null
  metadata: Record<string, unknown> | null
}

interface AuditLogResponse {
  logs: AuditLogEntry[]
  total: number
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'export', label: 'Export' },
]

const RESOURCE_OPTIONS = [
  { value: 'all', label: 'All Resources' },
  { value: 'study', label: 'Study' },
  { value: 'project', label: 'Project' },
  { value: 'organization', label: 'Organization' },
  { value: 'user', label: 'User' },
  { value: 'participant', label: 'Participant' },
]

function ExpandableRow({ entry }: { entry: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm:ss')}
        </TableCell>
        <TableCell>
          <span className="font-medium">{entry.user?.name || entry.user?.email || entry.user_id}</span>
        </TableCell>
        <TableCell>{entry.action}</TableCell>
        <TableCell className="text-muted-foreground">{entry.resource_type || '-'}</TableCell>
        <TableCell className="text-muted-foreground">{entry.ip_address || '-'}</TableCell>
        <TableCell>
          {entry.metadata && (
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </TableCell>
      </TableRow>
      {isOpen && entry.metadata && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="bg-muted/50 rounded-md p-3 ml-4">
              <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(0)
  const [action, setAction] = useState('all')
  const [resourceType, setResourceType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const limit = 50

  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (action !== 'all') params.set('action', action)
  if (resourceType !== 'all') params.set('resourceType', resourceType)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data, error, isLoading, mutate } = useSWR<AuditLogResponse>(
    `/api/admin/audit-log?${params.toString()}`,
    { revalidateOnFocus: false }
  )

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Audit Log"
        description="Track all user actions across the platform"
      />

      <AdminFiltersBar>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(0) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setPage(0) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
          placeholder="From"
          className="w-[160px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
          placeholder="To"
          className="w-[160px]"
        />

        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </AdminFiltersBar>

      {error ? (
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      ) : (
        <div className="rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell />
                      </TableRow>
                    ))
                  : data?.logs.map((entry) => (
                      <ExpandableRow key={entry.id} entry={entry} />
                    ))}
              </TableBody>
            </Table>
          </div>

          {!isLoading && (!data?.logs || data.logs.length === 0) && (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No audit log entries found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
