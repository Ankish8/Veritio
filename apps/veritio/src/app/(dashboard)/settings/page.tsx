'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@veritio/auth/client'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  SettingsShell,
  getSettingsTabs,
  ProfileTab,
  AccountTab,
  PlanUsageTab,
  StudyDefaultsTab,
  IntegrationsTab,
  AiModelsTab,
  type SettingsTabId,
} from '@/components/settings'
import { SettingsSkeleton } from '@/components/dashboard/skeletons'

/**
 * Settings page with horizontal tabs for managing user preferences.
 *
 * Tabs:
 * - Profile: Avatar, name, display preferences
 * - Account: Password, connected accounts, danger zone
 * - Study Defaults: Default branding, language, notifications for new studies
 * - Integrations: Connected third-party services
 */
export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile')
  const [redirectAttempts, setRedirectAttempts] = useState(0)

  // Deep-link to a specific tab via ?tab= (e.g. "View plan" upgrade toasts → ?tab=plan-usage)
  useEffect(() => {
    const tab = searchParams.get('tab')
    const valid: SettingsTabId[] = ['profile', 'account', 'plan-usage', 'study-defaults', 'integrations', 'ai-models']
    if (tab && (valid as string[]).includes(tab)) setActiveTab(tab as SettingsTabId)
  }, [searchParams])

  // Handle redirect with retry logic to account for temporary session unavailability
  // Only redirect after multiple failed attempts to avoid false positives from cookie issues
  useEffect(() => {
    if (!isPending && !session?.user) {
      // Wait 1 second and retry before redirecting
      const timeout = setTimeout(() => {
        setRedirectAttempts(prev => prev + 1)

        // After 3 failed attempts (3 seconds total), redirect to sign-in
        if (redirectAttempts >= 2) {
          router.push('/sign-in')
        }
      }, 1000)

      return () => clearTimeout(timeout)
    } else if (session?.user) {
      // Reset retry counter if session becomes available
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRedirectAttempts(0)
    }
  }, [isPending, session?.user, router, redirectAttempts])

  // Show loading state while checking auth or during retry attempts
  if (isPending || (!session?.user && redirectAttempts < 3)) {
    return <SettingsSkeleton />
  }

  const tabs = getSettingsTabs({
    profile: <ProfileTab />,
    account: <AccountTab />,
    planUsage: <PlanUsageTab />,
    studyDefaults: <StudyDefaultsTab />,
    integrations: <IntegrationsTab />,
    aiModels: <AiModelsTab />,
  })

  return (
    <SettingsShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  )
}
