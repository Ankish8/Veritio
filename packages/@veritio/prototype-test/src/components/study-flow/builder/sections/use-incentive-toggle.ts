'use client'

import { useState, useCallback } from 'react'
import { useStudyIncentiveConfig } from '@/hooks/panel/use-panel-incentives'
import { shouldShowIncentive } from '@/lib/utils/format-incentive'

interface UseIncentiveToggleProps {
  studyId: string
  updateSettings: (settings: { showIncentive: boolean }) => void
}
export function useIncentiveToggle({ studyId, updateSettings }: UseIncentiveToggleProps) {
  const { config: incentiveConfig, updateConfig: updateIncentiveConfig } = useStudyIncentiveConfig(studyId)
  const hasValidIncentive = shouldShowIncentive(incentiveConfig)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleShowIncentiveChange = useCallback((checked: boolean) => {
    if (checked && !hasValidIncentive) {
      setShowConfirmDialog(true)
    } else {
      updateSettings({ showIncentive: checked })
    }
  }, [hasValidIncentive, updateSettings])

  const handleConfirmEnable = useCallback(async () => {
    setShowConfirmDialog(false)
    updateSettings({ showIncentive: true })
    try {
      await updateIncentiveConfig({ enabled: true })
    } catch {
      // Silently fail - the flow setting is what matters for now
    }
  }, [updateSettings, updateIncentiveConfig])

  return {
    hasValidIncentive,
    showConfirmDialog,
    setShowConfirmDialog,
    handleShowIncentiveChange,
    handleConfirmEnable,
  }
}
