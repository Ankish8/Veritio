'use client'

import { ReactNode } from 'react'
import { Header } from '@/components/dashboard/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type SettingsTabId = 'profile' | 'account' | 'study-defaults' | 'integrations'

export interface SettingsTab {
  id: SettingsTabId
  label: string
  component: ReactNode
  disabled?: boolean
}

interface SettingsShellProps {
  tabs: SettingsTab[]
  activeTab: SettingsTabId
  onTabChange: (tab: SettingsTabId) => void
}

export function SettingsShell({
  tabs,
  activeTab,
  onTabChange,
}: SettingsShellProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as SettingsTabId)}
    >
      {/* Sticky header section - Header + Tabs */}
      <div className="sticky top-0 z-10 bg-background">
        <Header title="Settings" />

        <div className="px-6 border-b">
          <TabsList variant="underline" className="w-full overflow-x-auto flex-nowrap">
            {tabs.map((tab) => (
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

      {/* Content area */}
      <div className="p-4 sm:p-6">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-0"
          >
            {tab.component}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}

export function getSettingsTabs(components: {
  profile: ReactNode
  account: ReactNode
  studyDefaults: ReactNode
  integrations: ReactNode
}): SettingsTab[] {
  return [
    {
      id: 'profile',
      label: 'Profile',
      component: components.profile,
    },
    {
      id: 'account',
      label: 'Account',
      component: components.account,
    },
    {
      id: 'study-defaults',
      label: 'Study Defaults',
      component: components.studyDefaults,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      component: components.integrations,
    },
  ]
}
