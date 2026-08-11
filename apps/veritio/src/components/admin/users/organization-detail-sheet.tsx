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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { toast } from '@/components/ui/sonner'
import { getAuthFetchInstance } from '@/lib/swr'
import { PLAN_ENTITLEMENTS, isEducationPlan } from '@/lib/plans'

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

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'team', label: 'Team' },
  { value: 'legacy', label: 'Legacy (unlimited)' },
  { value: 'edu_classroom', label: 'Education — Classroom' },
  { value: 'edu_department', label: 'Education — Department' },
  { value: 'edu_campus', label: 'Education — Campus' },
]

const STATUS_OPTIONS = [
  { value: 'trialing', label: 'Trialing' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'canceled', label: 'Canceled' },
]

/** `datetime-local` value (no timezone) from an ISO string. */
function toDateInput(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'yyyy-MM-dd') : ''
}

function PlanEditor({ orgId, org, onSaved }: { orgId: string; org: any; onSaved: () => void }) {
  const [plan, setPlan] = useState<string>(org.plan ?? 'starter')
  const [planStatus, setPlanStatus] = useState<string>(org.planStatus ?? 'active')
  const [extraSeats, setExtraSeats] = useState<number>(org.extraSeats ?? 0)
  const [accessEndsAt, setAccessEndsAt] = useState<string>(toDateInput(org.accessEndsAt))
  const [saving, setSaving] = useState(false)

  const isEdu = isEducationPlan(plan)
  const baseSeats = PLAN_ENTITLEMENTS[plan as keyof typeof PLAN_ENTITLEMENTS]?.seats
  const cohortSize =
    baseSeats === undefined || baseSeats === Infinity ? null : baseSeats + (Number(extraSeats) || 0)

  const save = async () => {
    setSaving(true)
    try {
      const authFetch = getAuthFetchInstance()
      const res = await authFetch('/api/admin/organizations/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          plan,
          plan_status: planStatus,
          extra_seats: Number(extraSeats) || 0,
          // End of day, so the last day of term is still usable.
          access_ends_at: accessEndsAt ? new Date(`${accessEndsAt}T23:59:59`).toISOString() : null,
        }),
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
        <LabeledSelect label="Plan" value={plan} onValueChange={setPlan} options={PLAN_OPTIONS} />
        <LabeledSelect
          label="Status"
          value={planStatus}
          onValueChange={setPlanStatus}
          options={STATUS_OPTIONS}
        />
        <div className="space-y-2">
          <Label className="text-xs">{isEdu ? 'Extra seats (beyond cohort base)' : 'Extra seats'}</Label>
          <Input
            type="number"
            min={0}
            value={extraSeats}
            onChange={(e) => setExtraSeats(Number(e.target.value))}
          />
          {isEdu && (
            <p className="text-xs text-muted-foreground">
              {cohortSize === null
                ? 'Unlimited student accounts on this tier.'
                : `Cohort size: ${cohortSize} accounts.`}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Access period ends</Label>
          <Input
            type="date"
            value={accessEndsAt}
            onChange={(e) => setAccessEndsAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {isEdu
              ? 'End of the semester or academic year. Leave empty for no end date.'
              : 'Optional fixed end date. Normally only set on education licenses.'}
          </p>
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
