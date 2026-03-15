"use client"

import Link from "next/link"
import { ArrowRight, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RecentStudyCard } from "./recent-study-card"
import type { RecentStudy } from "@/hooks/use-dashboard-stats"

interface RecentStudiesGridProps {
  studies: RecentStudy[]
  isLoading: boolean
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card p-4 dashboard-card-shadow">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3 mt-1.5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/50">
      <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground/50" />
      <h3 className="font-semibold text-foreground mt-3">No studies yet</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Create your first study to see it here. Choose between card sorting, tree testing, or surveys.
      </p>
      <Button asChild className="mt-4">
        <Link href="/projects">Go to Projects</Link>
      </Button>
    </div>
  )
}

export function RecentStudiesGrid({ studies, isLoading }: RecentStudiesGridProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Studies</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/studies">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : studies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {studies.map((study) => (
            <RecentStudyCard key={study.id} study={study} />
          ))}
        </div>
      )}
    </div>
  )
}
