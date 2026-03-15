'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BookOpen, Keyboard } from 'lucide-react'
import { PanelContainer } from './PanelContainer'
import { KeyboardShortcutsPanel } from './panels/KeyboardShortcutsPanel'
import { KnowledgeBasePanel } from './panels/KnowledgeBasePanel'

export type PanelType = 'knowledge' | 'shortcuts' | null

interface FloatingActionBarProps {
  className?: string
}

const actionButtons = [
  {
    id: 'knowledge' as PanelType,
    icon: BookOpen,
    tooltip: 'Knowledge Base',
    className: 'hover:bg-accent hover:text-accent-foreground',
  },
  {
    id: 'shortcuts' as PanelType,
    icon: Keyboard,
    tooltip: 'Keyboard Shortcuts',
    className: 'hover:bg-accent hover:text-accent-foreground',
  },
]

export function FloatingActionBar({ className }: FloatingActionBarProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null)

  const handleActionClick = (panelType: PanelType) => {
    setActivePanel(activePanel === panelType ? null : panelType)
  }

  const handleClosePanel = () => {
    setActivePanel(null)
  }

  return (
    <TooltipProvider>
      <div className={`flex flex-row h-full border-l ${className || ''}`}>
        {/* Action Buttons Column - Fixed width */}
        <div className="flex flex-col items-center justify-start py-4 gap-1 w-12 flex-shrink-0">
          {actionButtons.map((button) => {
            const Icon = button.icon
            const isActive = activePanel === button.id

            return (
              <Tooltip key={button.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`
                      w-9 h-9 p-0 rounded-lg transition-all duration-200 text-muted-foreground flex items-center justify-center
                      ${button.className}
                      ${isActive ? 'bg-accent text-accent-foreground' : ''}
                    `}
                    onClick={() => handleActionClick(button.id)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{button.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Panel Container - Expandable width */}
        <PanelContainer
          isOpen={activePanel !== null}
          onClose={handleClosePanel}
          title={
            activePanel === 'knowledge'
              ? 'Knowledge Base'
              : activePanel === 'shortcuts'
                ? 'Keyboard Shortcuts'
                : ''
          }
        >
          {activePanel === 'knowledge' && <KnowledgeBasePanel />}
          {activePanel === 'shortcuts' && <KeyboardShortcutsPanel />}
        </PanelContainer>
      </div>
    </TooltipProvider>
  )
}
