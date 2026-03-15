'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { format, formatDistanceToNow } from 'date-fns'
import { Search, UserPlus, Activity, Bot, FlaskConical } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminDataTable } from '@/components/admin/shared/admin-data-table'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { AdminStatCard } from '@/components/admin/shared/admin-stat-card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserDetailSheet } from '@/components/admin/users/user-detail-sheet'
import { OrganizationDetailSheet } from '@/components/admin/users/organization-detail-sheet'

interface User {
  id: string
  name: string | null
  email: string
  createdAt: string
  orgCount: number
  studyCount: number
  lastActive: string | null
  aiMessageCount: number
}

interface Organization {
  id: string
  name: string
  slug: string
  memberCount: number
  studyCount: number
  created_at: string
  owner: { name: string | null; email: string } | null
}

interface UsersResponse {
  users: User[]
  total: number
}

interface OrgsResponse {
  organizations: Organization[]
  total: number
}

interface UsersPageStats {
  newUsersThisWeek: number
  newUsersThisWeekTrend: number
  activeUsers7d: number
  aiMessagesThisMonth: number
  aiMessagesThisMonthTrend: number
  avgStudiesPerUser: number
}

function getUserStatus(user: User): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const createdAt = new Date(user.createdAt).getTime()

  if (createdAt > sevenDaysAgo) return { label: 'new', variant: 'default' }
  if (user.lastActive && new Date(user.lastActive).getTime() > sevenDaysAgo) return { label: 'active', variant: 'outline' }
  return { label: 'inactive', variant: 'secondary' }
}

export default function AdminUsersPage() {
  const [usersPage, setUsersPage] = useState(0)
  const [orgsPage, setOrgsPage] = useState(0)
  const limit = 25
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  const { data: stats, isLoading: statsLoading } = useSWR<UsersPageStats>('/api/admin/users-stats')

  const { data: usersData, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR<UsersResponse>(
    `/api/admin/users?page=${usersPage}&limit=25`
  )

  const { data: orgsData, error: orgsError, isLoading: orgsLoading, mutate: mutateOrgs } = useSWR<OrgsResponse>(
    `/api/admin/organizations?page=${orgsPage}&limit=25`
  )

  const filteredUsers = useMemo(() => {
    if (!usersData?.users || !search) return usersData?.users ?? []
    const q = search.toLowerCase()
    return usersData.users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    )
  }, [usersData?.users, search])

  const filteredOrgs = useMemo(() => {
    if (!orgsData?.organizations || !search) return orgsData?.organizations ?? []
    const q = search.toLowerCase()
    return orgsData.organizations.filter((o) => o.name.toLowerCase().includes(q))
  }, [orgsData?.organizations, search])

  const userColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: User) => (
        <span className="font-medium">{row.name || 'No name'}</span>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Status',
      render: (row: User) => {
        const status = getUserStatus(row)
        return <Badge variant={status.variant}>{status.label}</Badge>
      },
    },
    {
      key: 'lastActive',
      label: 'Last Active',
      render: (row: User) => (
        <span className="text-muted-foreground text-sm">
          {row.lastActive ? formatDistanceToNow(new Date(row.lastActive), { addSuffix: true }) : 'Never'}
        </span>
      ),
    },
    {
      key: 'orgCount',
      label: 'Orgs',
      className: 'text-right',
      render: (row: User) => <span>{row.orgCount}</span>,
    },
    {
      key: 'studyCount',
      label: 'Studies',
      className: 'text-right',
      render: (row: User) => <span>{row.studyCount}</span>,
    },
    {
      key: 'aiMessageCount',
      label: 'AI Messages',
      className: 'text-right',
      render: (row: User) => <span>{row.aiMessageCount}</span>,
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (row: User) => (
        <span className="text-muted-foreground">
          {format(new Date(row.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  const orgColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Organization) => (
        <div>
          <span className="font-medium">{row.name}</span>
          <p className="text-xs text-muted-foreground">{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      label: 'Owner',
      render: (row: Organization) => (
        <span className="text-sm">{row.owner?.name || row.owner?.email || '—'}</span>
      ),
    },
    {
      key: 'memberCount',
      label: 'Members',
      className: 'text-right',
      render: (row: Organization) => <span>{row.memberCount}</span>,
    },
    {
      key: 'studyCount',
      label: 'Studies',
      className: 'text-right',
      render: (row: Organization) => <span>{row.studyCount}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Organization) => (
        <span className="text-muted-foreground">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6">
      <AdminPageHeader title="Users & Organizations" description="Manage platform users and organizations" />

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <AdminStatCard
              label="New Users This Week"
              value={stats.newUsersThisWeek}
              icon={<UserPlus className="h-4 w-4" />}
              trend={stats.newUsersThisWeekTrend !== 0 ? { value: stats.newUsersThisWeekTrend, label: 'vs last week' } : undefined}
            />
            <AdminStatCard
              label="Active Users (7d)"
              value={stats.activeUsers7d}
              icon={<Activity className="h-4 w-4" />}
            />
            <AdminStatCard
              label="AI Messages This Month"
              value={stats.aiMessagesThisMonth}
              icon={<Bot className="h-4 w-4" />}
              trend={stats.aiMessagesThisMonthTrend !== 0 ? { value: stats.aiMessagesThisMonthTrend, label: 'vs last month' } : undefined}
            />
            <AdminStatCard
              label="Avg Studies / User"
              value={stats.avgStudiesPerUser}
              icon={<FlaskConical className="h-4 w-4" />}
            />
          </>
        ) : null}
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {usersError ? (
            <AdminErrorState message={usersError.message} onRetry={() => mutateUsers()} />
          ) : (
            <AdminDataTable
              columns={userColumns}
              data={filteredUsers}
              page={usersPage + 1}
              totalPages={Math.ceil((usersData?.total ?? 0) / limit) || 1}
              onPageChange={(p) => setUsersPage(p - 1)}
              isLoading={usersLoading}
              emptyMessage="No users found"
              onRowClick={(user) => setSelectedUserId(user.id)}
            />
          )}
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          {orgsError ? (
            <AdminErrorState message={orgsError.message} onRetry={() => mutateOrgs()} />
          ) : (
            <AdminDataTable
              columns={orgColumns}
              data={filteredOrgs}
              page={orgsPage + 1}
              totalPages={Math.ceil((orgsData?.total ?? 0) / limit) || 1}
              onPageChange={(p) => setOrgsPage(p - 1)}
              isLoading={orgsLoading}
              emptyMessage="No organizations found"
              onRowClick={(org) => setSelectedOrgId(org.id)}
            />
          )}
        </TabsContent>
      </Tabs>

      <UserDetailSheet userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      <OrganizationDetailSheet orgId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />
    </div>
  )
}
