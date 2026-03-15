'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format, formatDistanceToNow } from 'date-fns'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminDataTable } from '@/components/admin/shared/admin-data-table'
import { AdminFiltersBar } from '@/components/admin/shared/admin-filters-bar'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Participant {
  id: string
  study_id: string
  studyTitle: string
  status: string
  city: string | null
  country: string | null
  created_at: string
  completed_at: string | null
}

interface ParticipantsResponse {
  participants: Participant[]
  total: number
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'screened_out', label: 'Screened Out' },
]

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'in_progress':
      return 'secondary'
    case 'abandoned':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function AdminParticipantsPage() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('all')
  const limit = 25

  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status !== 'all') params.set('status', status)

  const { data, error, isLoading, mutate } = useSWR<ParticipantsResponse>(
    `/api/admin/participants?${params.toString()}`
  )

  const columns = [
    {
      key: 'studyTitle',
      label: 'Study',
      render: (row: Participant) => (
        <span className="font-medium">{row.studyTitle || 'Untitled'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Participant) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'city',
      label: 'City',
      render: (row: Participant) => (
        <span className="text-muted-foreground">{row.city || '-'}</span>
      ),
    },
    {
      key: 'country',
      label: 'Country',
      render: (row: Participant) => (
        <span className="text-muted-foreground">{row.country || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Participant) => (
        <span className="text-muted-foreground">
          {format(new Date(row.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'completed_at',
      label: 'Completed',
      render: (row: Participant) => (
        <span className="text-muted-foreground">
          {row.completed_at
            ? formatDistanceToNow(new Date(row.completed_at), { addSuffix: true })
            : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6">
      <AdminPageHeader title="Participants" description="All participant sessions across the platform" />

      <AdminFiltersBar>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFiltersBar>

      {error ? (
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={data?.participants ?? []}
          page={page + 1}
          totalPages={Math.ceil((data?.total ?? 0) / limit) || 1}
          onPageChange={(p) => setPage(p - 1)}
          isLoading={isLoading}
          emptyMessage="No participants found"
        />
      )}
    </div>
  )
}
