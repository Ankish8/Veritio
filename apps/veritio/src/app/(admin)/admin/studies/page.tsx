'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Search } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminDataTable } from '@/components/admin/shared/admin-data-table'
import { AdminFiltersBar } from '@/components/admin/shared/admin-filters-bar'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Study {
  id: string
  title: string
  study_type: string
  status: string
  organization_id: string
  organizationName: string | null
  participantCount: number
  created_at: string
  launched_at: string | null
}

interface StudiesResponse {
  studies: Study[]
  total: number
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'card_sort', label: 'Card Sort' },
  { value: 'tree_test', label: 'Tree Test' },
  { value: 'survey', label: 'Survey' },
  { value: 'first_click', label: 'First Click' },
  { value: 'first_impression', label: 'First Impression' },
  { value: 'prototype_test', label: 'Prototype Test' },
  { value: 'live_website', label: 'Live Website' },
]

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'draft':
      return 'secondary'
    case 'closed':
      return 'outline'
    default:
      return 'secondary'
  }
}

export default function AdminStudiesPage() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const limit = 25

  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status !== 'all') params.set('status', status)
  if (type !== 'all') params.set('type', type)
  if (search) params.set('search', search)

  const { data, error, isLoading, mutate } = useSWR<StudiesResponse>(
    `/api/admin/studies?${params.toString()}`
  )

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (row: Study) => (
        <span className="font-medium">{row.title || 'Untitled'}</span>
      ),
    },
    {
      key: 'study_type',
      label: 'Type',
      render: (row: Study) => (
        <Badge variant="outline">{row.study_type.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Study) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'organizationName',
      label: 'Organization',
      render: (row: Study) => (
        <span className="text-muted-foreground">{row.organizationName}</span>
      ),
    },
    {
      key: 'participantCount',
      label: 'Participants',
      className: 'text-right',
      render: (row: Study) => <span>{row.participantCount}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Study) => (
        <span className="text-muted-foreground">
          {format(new Date(row.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6">
      <AdminPageHeader title="Studies" description="Browse all studies across the platform" />

      <AdminFiltersBar>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(v) => { setType(v); setPage(0) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search studies..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-9 w-[220px]"
          />
        </div>
      </AdminFiltersBar>

      {error ? (
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      ) : (
        <AdminDataTable
          columns={columns}
          data={data?.studies ?? []}
          page={page + 1}
          totalPages={Math.ceil((data?.total ?? 0) / limit) || 1}
          onPageChange={(p) => setPage(p - 1)}
          isLoading={isLoading}
          emptyMessage="No studies found"
        />
      )}
    </div>
  )
}
