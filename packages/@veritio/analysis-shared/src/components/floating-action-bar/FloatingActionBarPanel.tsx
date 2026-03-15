'use client'

import { PanelContainer, type PanelWidth } from './PanelContainer'
import { KeyboardShortcutsPanel } from './panels/KeyboardShortcutsPanel'
// TEMPORARILY DISABLED - KnowledgeBasePanel has @/ imports
// import { KnowledgeBasePanel } from './panels/KnowledgeBasePanel'
import { useFloatingActionBar } from './FloatingActionBarContext'

export function FloatingActionBarPanel() {
  const { activePanel, closePanel, getCustomPanel, shortcutsContext, shortcutSections, shortcutActiveContext, studyType: _studyType, dynamicPanel } = useFloatingActionBar()

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
    if (activePanel === 'knowledge' || activePanel === 'shortcuts') {
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
        // TEMPORARILY DISABLED - KnowledgeBasePanel has @/ imports
        return (
          <div className="p-4 text-center text-muted-foreground">
            <p>Knowledge Base is not available in this view.</p>
          </div>
        )
      case 'shortcuts':
        return <KeyboardShortcutsPanel onClose={closePanel} context={shortcutsContext} shortcutSections={shortcutSections} activeContext={shortcutActiveContext} />
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
