import { Header } from '@/components/dashboard/header'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectsLoading() {
  return (
    <>
      <Header title="Projects">
        <Skeleton className="h-9 w-32" />
      </Header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg border p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
