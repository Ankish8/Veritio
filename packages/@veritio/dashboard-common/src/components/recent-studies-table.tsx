"use client";

import { memo } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Users, ArrowRight } from "lucide-react";
import { Badge, Skeleton, cn } from "@veritio/ui";

export interface RecentStudy {
  id: string;
  title: string;
  status: string;
  participant_count: number;
  created_at: string;
  project_id?: string;
  study_type?: string;
  /** Study settings blob. Some study types need it to resolve a display label. */
  settings?: unknown;
}

export interface StudyTypeConfig {
  icon: LucideIcon;
  label: string;
}

interface RecentStudiesTableProps {
  studies: RecentStudy[];
  isLoading?: boolean;
  /**
   * The row is passed alongside the type because one study_type can back more
   * than one product (live website: Auto Mode vs Snippet Mode), and only the
   * row's settings say which.
   */
  getStudyTypeConfig: (studyType: string, study?: RecentStudy) => StudyTypeConfig;
  getStudyUrl: (study: RecentStudy) => string;
  viewAllUrl?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export const RecentStudiesTable = memo(function RecentStudiesTable({
  studies,
  isLoading = false,
  getStudyTypeConfig,
  getStudyUrl,
  viewAllUrl = "/projects",
}: RecentStudiesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-4 md:rounded-2xl md:p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (studies.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 md:rounded-2xl md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground">
          Recently Opened
        </h4>
        <Link
          href={viewAllUrl}
          className="-mr-2 flex min-h-10 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div>
        {studies.map((study, index) => {
          const config = getStudyTypeConfig(study.study_type || "card_sort", study);
          const Icon = config.icon;
          const isLast = index === studies.length - 1;

          return (
            <Link
              key={study.id}
              href={getStudyUrl(study)}
              className={cn(
                "group flex min-h-14 flex-col justify-between gap-2 rounded-lg px-2.5 py-3 transition-colors hover:bg-accent md:flex-row md:items-center md:gap-3",
                !isLast && "border-b border-border",
              )}
            >
              <div className="flex min-w-0 items-start gap-3 md:flex-1">
                <div className="flex-shrink-0 pt-0.5 md:pt-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {study.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {config.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-8 md:pl-0">
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0",
                    statusColors[study.status ?? "draft"],
                  )}
                >
                  {study.status ?? "draft"}
                </Badge>

                <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium tabular-nums">
                    {study.participant_count}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});
