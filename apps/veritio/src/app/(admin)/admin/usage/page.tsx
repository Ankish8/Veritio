'use client'

import useSWR from 'swr'
import { Database, HardDrive, FlaskConical, UserCheck } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminStatCard } from '@/components/admin/shared/admin-stat-card'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UsageData {
  storage: {
    total_size_bytes: number
  } | null
  studiesThisMonth: number
  participantsThisMonth: number
  topOrgs: Array<{
    id: string
    name: string
    studyCount: number
    participantCount: number
  }>
}

export default function AdminUsagePage() {
  const { data, error, isLoading, mutate } = useSWR<UsageData>(
    '/api/admin/usage',
    { refreshInterval: 300000 }
  )

  if (error) {
    return (
      <div className="p-6">
        <AdminPageHeader title="Usage & Limits" description="Platform resource usage and quotas" />
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <AdminPageHeader title="Usage & Limits" description="Platform resource usage and quotas" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border/40 bg-card rounded-lg p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : data ? (
          <>
            <AdminStatCard
              label="DB Storage"
              value={data.storage ? `${(data.storage.total_size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'N/A'}
              icon={<Database className="h-5 w-5" />}
            />
            <AdminStatCard
              label="R2 Storage"
              value="—"
              icon={<HardDrive className="h-5 w-5" />}
            />
            <AdminStatCard
              label="Studies This Month"
              value={data.studiesThisMonth.toLocaleString()}
              icon={<FlaskConical className="h-5 w-5" />}
            />
            <AdminStatCard
              label="Participants This Month"
              value={data.participantsThisMonth.toLocaleString()}
              icon={<UserCheck className="h-5 w-5" />}
            />
          </>
        ) : null}
      </div>

      {/* Top Orgs Table */}
      <div className="rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-foreground">Top 10 Organizations by Study Count</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Studies</TableHead>
                <TableHead className="text-right">Participants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                : data?.topOrgs.map((org, index) => (
                    <TableRow key={org.id}>
                      <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-right">{org.studyCount}</TableCell>
                      <TableCell className="text-right">{org.participantCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
        {!isLoading && (!data?.topOrgs || data.topOrgs.length === 0) && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No organization data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
