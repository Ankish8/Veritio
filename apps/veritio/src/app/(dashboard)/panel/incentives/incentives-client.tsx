'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { Header } from '@/components/dashboard/header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IncentiveStatusBadge } from '@/components/panel/incentives/incentive-status-badge'
import { MarkSentDialog } from '@/components/panel/incentives/mark-sent-dialog'
import { useIncentiveDistributions, useIncentiveStats } from '@/hooks/panel/use-panel-incentives'
import {
  Gift,
  Download,
  X,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/components/ui/sonner'
import { INCENTIVE_STATUS } from '@/lib/supabase/panel-types'
import type { PanelIncentiveDistributionWithDetails } from '@/lib/supabase/panel-types'

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount)
}

interface IncentivesClientProps {
  serverPrefetched?: boolean
}

export function IncentivesClient({ serverPrefetched }: IncentivesClientProps) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showMarkSentDialog, setShowMarkSentDialog] = useState(false)
  const [selectedDistribution, setSelectedDistribution] = useState<PanelIncentiveDistributionWithDetails | null>(null)

  const { distributions, total, isLoading, updateDistribution, bulkMarkSent } = useIncentiveDistributions({
    filters: {
      status: statusFilter === 'all' ? undefined : (statusFilter as any),
    },
    pagination: { page, limit: 50 },
    skipRevalidateOnMount: serverPrefetched,
  })

  const { stats, isLoading: statsLoading } = useIncentiveStats({ skipRevalidateOnMount: serverPrefetched })

  // Get pending/promised distributions (actionable items)
  const actionableDistributions = useMemo(() => {
    return distributions.filter(d => d.status === 'promised' || d.status === 'pending')
  }, [distributions])

  // Check if all actionable items are selected
  const allActionableSelected = useMemo(() => {
    if (actionableDistributions.length === 0) return false
    return actionableDistributions.every(d => selectedIds.has(d.id))
  }, [actionableDistributions, selectedIds])

  // Toggle selection for a single item
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Toggle all actionable items
  const toggleAllActionable = useCallback(() => {
    if (allActionableSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(actionableDistributions.map(d => d.id)))
    }
  }, [allActionableSelected, actionableDistributions])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Open mark as sent dialog for single item
  const handleMarkAsSent = useCallback((distribution: PanelIncentiveDistributionWithDetails) => {
    setSelectedDistribution(distribution)
    setShowMarkSentDialog(true)
  }, [])

  // Open mark as sent dialog for bulk
  const handleBulkMarkAsSent = useCallback(() => {
    setSelectedDistribution(null)
    setShowMarkSentDialog(true)
  }, [])

  // Confirm mark as sent (handles both single and bulk)
  const handleConfirmMarkSent = useCallback(async (data: {
    fulfillment_method: string
    fulfillment_reference?: string
    notes?: string
  }) => {
    if (selectedDistribution) {
      // Single update
      await updateDistribution(selectedDistribution.id, {
        status: 'sent',
        ...data,
      })
      toast.success('Incentive marked as sent')
    } else {
      // Bulk update
      const ids = Array.from(selectedIds)
      await bulkMarkSent({
        distribution_ids: ids,
        ...data,
      })
      toast.success(`Marked ${ids.length} incentives as sent`)
      clearSelection()
    }
  }, [selectedDistribution, selectedIds, updateDistribution, bulkMarkSent, clearSelection])

  // Export handler
  const handleExport = useCallback(() => {
    if (distributions.length === 0) {
      toast.error('No incentives to export')
      return
    }

    const headers = ['participant_email', 'participant_name', 'study', 'amount', 'currency', 'status', 'fulfillment_method', 'fulfillment_reference', 'sent_at', 'created_at']
    const csvRows = [
      headers.join(','),
      ...distributions.map((d) =>
        [
          d.panel_participant.email,
          [d.panel_participant.first_name, d.panel_participant.last_name].filter(Boolean).join(' '),
          d.study.title,
          d.amount,
          d.currency,
          d.status,
          d.fulfillment_method || '',
          d.fulfillment_reference || '',
          d.sent_at || '',
          d.created_at,
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
    link.download = `incentives_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${distributions.length} incentives`)
  }, [distributions])

  const hasActiveFilter = statusFilter !== 'all'
  const hasSelection = selectedIds.size > 0

  return (
    <>
      <Header title="Incentives">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </Header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Stats Row with Filter - inline style matching participant profile */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <InlineStats stats={stats} isLoading={statsLoading} />

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {INCENTIVE_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilter && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setStatusFilter('all')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {hasSelection && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button size="sm" onClick={handleBulkMarkAsSent}>
              <Send className="h-4 w-4 mr-1.5" />
              Mark as Sent
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
        )}

        {/* Table */}
        {distributions.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-card/50">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold text-foreground mt-4">No incentives yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Incentive distributions will appear here when participants complete studies with rewards enabled.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allActionableSelected && actionableDistributions.length > 0}
                      onCheckedChange={toggleAllActionable}
                      disabled={actionableDistributions.length === 0}
                      aria-label="Select all pending"
                    />
                  </TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="hidden sm:table-cell">Study</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  distributions.map((dist) => {
                    const displayName = [dist.panel_participant.first_name, dist.panel_participant.last_name]
                      .filter(Boolean)
                      .join(' ')
                    const initials = displayName
                      ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase()
                      : dist.panel_participant.email.slice(0, 2).toUpperCase()
                    const isActionable = dist.status === 'promised' || dist.status === 'pending'
                    const isSelected = selectedIds.has(dist.id)

                    return (
                      <TableRow key={dist.id} className={isSelected ? 'bg-primary/5' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(dist.id)}
                            disabled={!isActionable}
                            aria-label={`Select ${displayName || dist.panel_participant.email}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              {displayName && (
                                <div className="text-sm font-medium">{displayName}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {dist.panel_participant.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">{dist.study.title}</span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatCurrency(dist.amount, dist.currency)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <IncentiveStatusBadge status={dist.status} />
                        </TableCell>

                        <TableCell className="hidden lg:table-cell">
                          {dist.sent_at ? (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(dist.sent_at), { addSuffix: true })}
                              </span>
                              {dist.fulfillment_method && (
                                <span className="text-xs text-muted-foreground">
                                  via {dist.fulfillment_method}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(dist.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>

                        <TableCell>
                          {isActionable && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMarkAsSent(dist)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {distributions.length > 0 && total > 50 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {page}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Mark as Sent Dialog */}
      <MarkSentDialog
        open={showMarkSentDialog}
        onOpenChange={setShowMarkSentDialog}
        itemCount={selectedDistribution ? undefined : selectedIds.size}
        amount={selectedDistribution?.amount}
        currency={selectedDistribution?.currency}
        onConfirm={handleConfirmMarkSent}
      />
    </>
  )
}

interface InlineStatsProps {
  stats: {
    totalDistributions: number
    totalAmount: number
    pendingAmount: number
    sentAmount: number
    statusBreakdown?: {
      promised?: number
      pending?: number
      sent?: number
      redeemed?: number
      failed?: number
      cancelled?: number
    }
  } | null
  isLoading: boolean
}

const InlineStats = memo(function InlineStats({ stats, isLoading }: InlineStatsProps) {
  const pendingCount = stats?.statusBreakdown
    ? (stats.statusBreakdown.promised || 0) + (stats.statusBreakdown.pending || 0)
    : 0

  const sentCount = stats?.statusBreakdown?.sent || 0

  const statItems = [
    {
      value: stats?.totalDistributions?.toString() || '0',
      label: 'Total',
    },
    {
      value: formatCurrency(stats?.pendingAmount || 0),
      label: `${pendingCount} Pending`,
      valueClass: pendingCount > 0 ? 'text-amber-600' : '',
    },
    {
      value: formatCurrency(stats?.sentAmount || 0),
      label: `${sentCount} Sent`,
      valueClass: 'text-green-600',
    },
    {
      value: formatCurrency(stats?.totalAmount || 0),
      label: 'Total Value',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 sm:gap-8">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
      {statItems.map((stat, index) => (
        <div key={stat.label} className="flex items-center gap-1.5 sm:gap-2">
          <span className={`text-xl sm:text-2xl font-bold text-foreground ${stat.valueClass || ''}`}>
            {stat.value}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">{stat.label}</span>
          {index < statItems.length - 1 && (
            <div className="hidden sm:block h-6 w-px bg-border ml-3 sm:ml-5" />
          )}
        </div>
      ))}
    </div>
  )
})
