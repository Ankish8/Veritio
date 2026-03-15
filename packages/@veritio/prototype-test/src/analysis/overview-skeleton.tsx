import { Skeleton } from '@veritio/ui/components/skeleton'
import { Card, CardContent, CardHeader } from '@veritio/ui/components/card'
export function PrototypeTestOverviewSkeleton() {
  return (
    <div className="space-y-8">
      {/* Participants Section */}
      <div>
        <Skeleton className="h-8 w-32 mb-6" /> {/* "Participants" heading */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Completion Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 mx-auto mt-4" />
            </CardContent>
          </Card>

          {/* Time Taken Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-4 w-full" />
              <div className="mt-4 flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Metrics Section */}
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Task Performance Chart */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-6 w-64 mb-6" />
        <div className="flex gap-4 mb-4">
          {['Abandoned', 'Failure', 'Skipped', 'Success'].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[250px] w-full" />
      </div>

      {/* Task Overview Section */}
      <div>
        <Skeleton className="h-8 w-32 mb-6" />
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-24" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
