"use client"

import { useMemo } from "react"
import { FolderKanban, FlaskConical, Play, Users, Layers3, GitBranch, ClipboardList, MousePointerClick, Frame, Eye, Globe, Scale } from "lucide-react"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useWorkspaceInitialization } from "@/hooks/use-workspace-initialization"
import { WelcomeBanner } from "@veritio/dashboard-common/welcome-banner"
import { StatsRow } from "@veritio/dashboard-common/stats-row"
import { RecentStudiesTable, type RecentStudy as DashboardRecentStudy } from "@veritio/dashboard-common/recent-studies-table"
import { StudyTypeSection } from "@/components/dashboard/study-type-section"
import { WorkspaceInitializing } from "@/components/dashboard/workspace-initializing"
import { NewStudyDropdown } from "@/components/dashboard/new-study-dropdown"

interface DashboardClientProps {
  userName: string | null
  organizationId?: string
}

export function DashboardClient({ userName, organizationId }: DashboardClientProps) {
  const { isInitializing } = useWorkspaceInitialization()

  const { stats, recentStudies, isLoading } = useDashboardStats(true, organizationId)

  const statItems = useMemo(() => [
    { key: "totalProjects", label: "Projects", icon: FolderKanban, value: stats.totalProjects },
    { key: "totalStudies", label: "Studies", icon: FlaskConical, value: stats.totalStudies },
    { key: "activeStudies", label: "Active", icon: Play, value: stats.activeStudies },
    { key: "totalParticipants", label: "Responses", icon: Users, value: stats.totalParticipants },
  ], [stats])

  const getStudyTypeConfig = (studyType: string) => {
    const configs = {
      card_sort: { icon: Layers3, label: "Card Sort" },
      tree_test: { icon: GitBranch, label: "Tree Test" },
      survey: { icon: ClipboardList, label: "Survey" },
      first_click: { icon: MousePointerClick, label: "First-Click Test" },
      prototype_test: { icon: Frame, label: "Figma Prototype Test" },
      first_impression: { icon: Eye, label: "First Impression Test" },
      live_website_test: { icon: Globe, label: "Web App Test" },
      preference_test: { icon: Scale, label: "Preference Test" },
    }
    return configs[studyType as keyof typeof configs] || configs.card_sort
  }

  if (isInitializing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background">
        <WorkspaceInitializing />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-background relative overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage: `
               radial-gradient(circle at 100% 0%, rgba(216, 180, 254, 0.15) 0%, rgba(233, 213, 255, 0.08) 30%, transparent 60%),
               url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
             `,
             backgroundBlendMode: 'overlay'
           }}
      />
      <div className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6 relative z-10">
        <WelcomeBanner
          userName={userName}
          activeCount={stats.activeStudies}
          entityName="study"
          entityNamePlural="studies"
        />

        <StatsRow
          stats={statItems}
          isLoading={isLoading}
          actionButton={<NewStudyDropdown />}
        />

        <RecentStudiesTable
          studies={recentStudies.slice(0, 4) as unknown as DashboardRecentStudy[]}
          isLoading={isLoading}
          getStudyTypeConfig={getStudyTypeConfig}
          getStudyUrl={(study) => `/projects/${study.project_id}/studies/${study.id}`}
          viewAllUrl="/projects"
        />

        <StudyTypeSection />
      </div>
    </div>
  )
}
