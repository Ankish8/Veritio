'use client'

import { useEffect, useMemo, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from '@/components/analysis/shared/floating-action-bar'
import { AssistantPanel } from '@/components/analysis/shared/assistant/assistant-panel'
import { useComposioOAuthReturn } from '@/hooks/use-composio-oauth-return'
import type { AssistantContext } from '@/services/assistant/context'

/**
 * Hook that registers the AI assistant panel on the dashboard page.
 */
export function useDashboardPanels() {
  const { addPageAction, removePageAction, closePanel } = useFloatingActionBar()

  const assistantContext: AssistantContext = useMemo(
    () => ({ mode: 'dashboard' }),
    []
  )

  const handleClose = useCallback(() => closePanel(), [closePanel])

  const assistantPanelContent = useMemo(
    () => (
      <AssistantPanel
        context={assistantContext}
        onClose={handleClose}
      />
    ),
    [assistantContext, handleClose]
  )

  useEffect(() => {
    const assistantAction: ActionButton = {
      id: 'ai-assistant',
      icon: Sparkles,
      tooltip: 'Veritio AI',
      panelWidth: 'wide',
      panelContent: assistantPanelContent,
      hidden: false,
    }

    addPageAction(assistantAction)

    return () => {
      removePageAction('ai-assistant')
    }
  }, [assistantPanelContent, addPageAction, removePageAction])

  // Check for OAuth return and auto-open AI panel
  useComposioOAuthReturn()
}
