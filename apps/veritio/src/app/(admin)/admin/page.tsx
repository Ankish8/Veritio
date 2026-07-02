'use client'

import useSWR from 'swr'
import { Users, Building2, FlaskConical, UserCheck } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminStatCard } from '@/components/admin/shared/admin-stat-card'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LazyLineChart,
  LazyLine,
  LazyBarChart,
  LazyBar,
  LazyAreaChart,
  LazyArea,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyResponsiveContainer,
} from '@/components/ui/lazy-charts'

interface OverviewData {
  totalUsers: number
  totalOrgs: number
  totalStudies: number
  totalParticipants: number
  trends?: {
    users: { value: number; label: string }
    orgs: { value: number; label: string }
    studies: { value: number; label: string }
    participants: { value: number; label: string }
  }
  signupsPerDay: Array<{ date: string; count: number }>
  studiesByType: Array<{ type: string; count: number }>
  participantsPerDay: Array<{ date: string; count: number }>
}

export default function AdminOverviewPage() {
  const { data, error, isLoading, mutate } = useSWR<OverviewData>(
    '/api/admin/overview',
    { refreshInterval: 300000 }
  )

  if (error) {
    return (
      <div className="p-6">
        <AdminPageHeader title="Overview" description="Platform metrics at a glance" />
        <AdminErrorState message={error.message} onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <AdminPageHeader title="Overview" description="Platform metrics at a glance" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : data ? (
          <>
            <AdminStatCard
              label="Total Users"
              value={data.totalUsers.toLocaleString()}
              icon={<Users className="h-5 w-5" />}
              trend={data.trends?.users}
            />
            <AdminStatCard
              label="Total Organizations"
              value={data.totalOrgs.toLocaleString()}
              icon={<Building2 className="h-5 w-5" />}
              trend={data.trends?.orgs}
            />
            <AdminStatCard
              label="Total Studies"
              value={data.totalStudies.toLocaleString()}
              icon={<FlaskConical className="h-5 w-5" />}
              trend={data.trends?.studies}
            />
            <AdminStatCard
              label="Total Participants"
              value={data.totalParticipants.toLocaleString()}
              icon={<UserCheck className="h-5 w-5" />}
              trend={data.trends?.participants}
            />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups per day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Signups per Day</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.signupsPerDay?.length ? (
              <LazyResponsiveContainer width="100%" height={300}>
                <LazyLineChart data={data.signupsPerDay}>
                  <LazyCartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <LazyXAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                  <LazyYAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <LazyTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <LazyLine
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LazyLineChart>
              </LazyResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No signup data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Studies by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Studies by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.studiesByType?.length ? (
              <LazyResponsiveContainer width="100%" height={300}>
                <LazyBarChart data={data.studiesByType}>
                  <LazyCartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <LazyXAxis dataKey="type" className="text-xs" tick={{ fontSize: 12 }} />
                  <LazyYAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <LazyTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <LazyBar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </LazyBarChart>
              </LazyResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No study data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants per day */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Participants per Day</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.participantsPerDay?.length ? (
              <LazyResponsiveContainer width="100%" height={300}>
                <LazyAreaChart data={data.participantsPerDay}>
                  <LazyCartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <LazyXAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                  <LazyYAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <LazyTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <LazyArea
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.1)"
                    strokeWidth={2}
                  />
                </LazyAreaChart>
              </LazyResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No participant data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
