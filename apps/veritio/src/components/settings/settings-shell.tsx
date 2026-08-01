"use client";

import { ReactNode } from "react";
import { Header } from "@/components/dashboard/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SettingsTabId =
  | "profile"
  | "account"
  | "plan-usage"
  | "study-defaults"
  | "api-keys"
  | "integrations"
  | "ai-models";

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  component: ReactNode;
  disabled?: boolean;
}

interface SettingsShellProps {
  tabs: SettingsTab[];
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
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

        <div className="border-b px-4 md:px-6">
          <TabsList
            variant="underline"
            className="-mx-4 w-[calc(100%+2rem)] flex-nowrap overflow-x-auto px-4 md:mx-0 md:w-full md:px-0"
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                variant="underline"
                className="shrink-0"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 md:p-6">
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            {tab.component}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

export function getSettingsTabs(components: {
  profile: ReactNode;
  account: ReactNode;
  planUsage: ReactNode;
  studyDefaults: ReactNode;
  integrations: ReactNode;
  aiModels: ReactNode;
  apiKeys: ReactNode;
}): SettingsTab[] {
  return [
    {
      id: "profile",
      label: "Profile",
      component: components.profile,
    },
    {
      id: "account",
      label: "Account",
      component: components.account,
    },
    {
      id: "plan-usage",
      label: "Plan & billing",
      component: components.planUsage,
    },
    {
      id: "study-defaults",
      label: "Study Defaults",
      component: components.studyDefaults,
    },
    {
      id: "integrations",
      label: "Integrations",
      component: components.integrations,
    },
    {
      id: "api-keys",
      label: "API keys",
      component: components.apiKeys,
    },
    {
      id: "ai-models",
      label: "AI Models",
      component: components.aiModels,
    },
  ];
}
