'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'
import { getAuthFetchInstance } from '@/lib/swr'

interface OrganizationDetailSheetProps {
  orgId: string | null
  onClose: () => void
}

export function OrganizationDetailSheet({ orgId, onClose }: OrganizationDetailSheetProps) {
  const { data, isLoading, mutate } = useSWR(orgId ? `/api/admin/organizations/${orgId}` : null)

  return (
    <Sheet open={!!orgId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Organization Details</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-6 px-4 pb-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6 px-4 pb-6">
            {/* Header */}
            <div>
              <h3 className="font-medium text-lg">{data.org.name}</h3>
              <p className="text-sm text-muted-foreground">{data.org.slug}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  Created {format(new Date(data.org.createdAt), 'MMM d, yyyy')}
                </span>
                {data.owner && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      Owner: {data.owner.name || data.owner.email}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatBlock label="Members" value={data.stats.members} />
              <StatBlock label="Studies" value={data.stats.studies} />
              <StatBlock label="Participants" value={data.stats.participants} />
              <StatBlock label="Active Studies" value={data.stats.activeStudies} />
            </div>

            <Separator />

            {/* Plan editor (superadmin) */}
            <PlanEditor orgId={data.org.id} org={data.org} onSaved={() => mutate()} />

            {/* Members */}
            {data.members.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Members</h4>
                  <div className="space-y-2">
                    {data.members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.image ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {member.name?.[0]?.toUpperCase() ?? member.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Studies */}
            {data.studies.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Studies</h4>
                  <div className="space-y-2">
                    {data.studies.map((study: any) => (
                      <div key={study.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{study.title || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{study.study_type}</Badge>
                            <Badge variant={study.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {study.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {study.participantCount} participants
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(study.created_at), 'MMM d')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

const SELECT_CLASS = 'mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm'

function PlanEditor({ orgId, org, onSaved }: { orgId: string; org: any; onSaved: () => void }) {
  const [plan, setPlan] = useState<string>(org.plan ?? 'starter')
  const [planStatus, setPlanStatus] = useState<string>(org.planStatus ?? 'active')
  const [extraSeats, setExtraSeats] = useState<number>(org.extraSeats ?? 0)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const authFetch = getAuthFetchInstance()
      const res = await authFetch('/api/admin/organizations/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, plan, plan_status: planStatus, extra_seats: Number(extraSeats) || 0 }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to update plan')
      }
      toast.success('Plan updated')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Plan</h4>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Plan</label>
          <select className={SELECT_CLASS} value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
            <option value="legacy">Legacy (unlimited)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select className={SELECT_CLASS} value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}>
            <option value="trialing">Trialing</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Extra seats</label>
          <input
            type="number"
            min={0}
            className={SELECT_CLASS}
            value={extraSeats}
            onChange={(e) => setExtraSeats(Number(e.target.value))}
          />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save plan'}
        </Button>
        {org.trialEndsAt && (
          <p className="text-xs text-muted-foreground">
            Trial ends {format(new Date(org.trialEndsAt), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  )
}
