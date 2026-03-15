'use client'

import useSWR from 'swr'
import { format, formatDistanceToNow } from 'date-fns'
import { FlaskConical, LogIn, Rocket, Ban, UserCog } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface UserDetailSheetProps {
  userId: string | null
  onClose: () => void
}

export function UserDetailSheet({ userId, onClose }: UserDetailSheetProps) {
  const { data, isLoading } = useSWR(userId ? `/api/admin/users/${userId}` : null)

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-6 px-4 pb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6 px-4 pb-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={data.profile.image ?? undefined} />
                <AvatarFallback className="text-lg">
                  {data.profile.name?.[0]?.toUpperCase() ?? data.profile.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg">{data.profile.name || 'No name'}</h3>
                  <Badge variant={data.profile.emailVerified ? 'default' : 'secondary'}>
                    {data.profile.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{data.profile.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Joined {format(new Date(data.profile.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <StatBlock label="Last Active" value={data.activity.lastActive ? formatDistanceToNow(new Date(data.activity.lastActive), { addSuffix: true }) : 'Never'} />
              <StatBlock label="Sessions" value={data.activity.totalSessions} />
              <StatBlock label="AI Today" value={data.activity.aiMessagesToday} />
              <StatBlock label="AI Total" value={data.activity.aiMessagesTotal} />
              <StatBlock label="Studies Created" value={data.activity.studiesCreated} />
              <StatBlock label="Studies Launched" value={data.activity.studiesLaunched} />
            </div>

            {/* Organizations */}
            {data.organizations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Organizations</h4>
                  <div className="space-y-2">
                    {data.organizations.map((org: any) => (
                      <div key={org.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{org.role}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(org.joinedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Recent Studies */}
            {data.recentStudies.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Studies</h4>
                  <div className="space-y-2">
                    {data.recentStudies.map((study: any) => (
                      <div key={study.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{study.title || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{study.study_type}</Badge>
                            <Badge variant={study.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {study.status}
                            </Badge>
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

            {/* Activity Timeline */}
            {data.timeline.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Activity Timeline</h4>
                  <div className="space-y-3">
                    {data.timeline.map((entry: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 text-muted-foreground">
                          {entry.type === 'study' && <FlaskConical className="h-4 w-4" />}
                          {entry.type === 'launch' && <Rocket className="h-4 w-4" />}
                          {entry.type === 'session' && <LogIn className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{entry.detail}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Quick Actions */}
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled>
                        <Ban className="h-4 w-4 mr-1.5" />
                        Disable Account
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled>
                        <UserCog className="h-4 w-4 mr-1.5" />
                        Impersonate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
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
