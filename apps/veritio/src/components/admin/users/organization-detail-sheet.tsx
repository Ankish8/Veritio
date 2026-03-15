'use client'

import useSWR from 'swr'
import { format } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface OrganizationDetailSheetProps {
  orgId: string | null
  onClose: () => void
}

export function OrganizationDetailSheet({ orgId, onClose }: OrganizationDetailSheetProps) {
  const { data, isLoading } = useSWR(orgId ? `/api/admin/organizations/${orgId}` : null)

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

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  )
}
