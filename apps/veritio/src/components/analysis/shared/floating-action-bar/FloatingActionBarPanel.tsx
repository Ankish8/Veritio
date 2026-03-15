'use client'

import dynamic from 'next/dynamic'
import { PanelContainer, type PanelWidth } from './PanelContainer'
import { useFloatingActionBar } from './FloatingActionBarContext'

const KeyboardShortcutsPanel = dynamic(
  () => import('./panels/KeyboardShortcutsPanel').then((module) => ({ default: module.KeyboardShortcutsPanel })),
  { ssr: false }
)

const KnowledgeBasePanel = dynamic(
  () => import('./panels/KnowledgeBasePanel').then((module) => ({ default: module.KnowledgeBasePanel })),
  { ssr: false }
)

export function FloatingActionBarPanel() {
  const { activePanel, closePanel, getCustomPanel, shortcutsContext, studyType, dynamicPanel } = useFloatingActionBar()

  // Check if it's a custom page-specific panel
  const customPanel = activePanel ? getCustomPanel(activePanel) : undefined

  // Dynamic panel takes precedence
  const hasDynamicContent = dynamicPanel !== null

  const getPanelTitle = () => {
    // Dynamic panel title
    if (hasDynamicContent && dynamicPanel?.title) {
      return dynamicPanel.title
    }

    // Check for custom panel title
    if (customPanel?.panelTitle) {
      return customPanel.panelTitle
    }

    switch (activePanel) {
      case 'knowledge':
        return 'Knowledge Base'
      case 'shortcuts':
        return 'Keyboard Shortcuts'
      default:
        return ''
    }
  }

  const getPanelWidth = (): PanelWidth => {
    // Dynamic panel width
    if (hasDynamicContent && dynamicPanel?.width) {
      return dynamicPanel.width
    }

    if (customPanel?.panelWidth) {
      return customPanel.panelWidth
    }

    // Knowledge Base gets wider panel for better content readability
    if (activePanel === 'knowledge') {
      return 420
    }

    return 'default'
  }

  const getHeaderContent = () => {
    // Dynamic panel header
    if (hasDynamicContent && dynamicPanel?.headerContent) {
      return dynamicPanel.headerContent
    }

    return customPanel?.panelHeaderContent
  }

  const shouldHideHeader = () => {
    // Dynamic panel can request to hide the container header
    if (hasDynamicContent && dynamicPanel?.hideHeader) {
      return true
    }
    // Built-in panels have their own headers with additional content
    if (activePanel === 'knowledge' || activePanel === 'shortcuts' || activePanel === 'insight-detail' || activePanel === 'ai-assistant') {
      return true
    }
    return false
  }

  const renderPanelContent = () => {
    // Dynamic panel content takes priority
    if (hasDynamicContent && dynamicPanel?.content) {
      return dynamicPanel.content
    }

    // Custom page-specific panel
    if (customPanel?.panelContent) {
      return customPanel.panelContent
    }

    // Global panels
    switch (activePanel) {
      case 'knowledge':
        return <KnowledgeBasePanel studyType={studyType} />
      case 'shortcuts':
        return <KeyboardShortcutsPanel context={shortcutsContext} />
      default:
        return null
    }
  }

  return (
    <PanelContainer
      isOpen={activePanel !== null}
      onClose={closePanel}
      title={getPanelTitle()}
      headerContent={getHeaderContent()}
      width={getPanelWidth()}
      hideHeader={shouldHideHeader()}
    >
      {renderPanelContent()}
    </PanelContainer>
  )
}
