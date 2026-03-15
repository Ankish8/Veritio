'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/dashboard/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type TeamSettingsTabId = 'members' | 'general'

export interface TeamSettingsTab {
  id: TeamSettingsTabId
  label: string
  component: ReactNode
  disabled?: boolean
  hidden?: boolean
}

interface TeamSettingsShellProps {
  tabs: TeamSettingsTab[]
  activeTab: TeamSettingsTabId
  onTabChange: (tab: TeamSettingsTabId) => void
}

export function TeamSettingsShell({
  tabs,
  activeTab,
  onTabChange,
}: TeamSettingsShellProps) {
  const visibleTabs = tabs.filter(tab => !tab.hidden)

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as TeamSettingsTabId)}
      className="flex flex-1 flex-col min-h-0"
    >
      {/* Sticky header section - Header + Tabs */}
      <div className="sticky top-0 z-10 bg-background">
        <Header
          leftContent={
            <Link
              href="/"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
          title="Team Settings"
        />

        <div className="px-6 border-b">
          <TabsList variant="underline">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                variant="underline"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex flex-1 flex-col min-h-0 p-6 overflow-y-auto">
        {visibleTabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex-1 mt-0 flex flex-col min-h-0"
          >
            {tab.component}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}

export function getTeamSettingsTabs(
  components: {
    members: ReactNode
    general: ReactNode
  },
): TeamSettingsTab[] {
  return [
    {
      id: 'members',
      label: 'Members',
      component: components.members,
    },
    {
      id: 'general',
      label: 'General',
      component: components.general,
    },
  ]
}
