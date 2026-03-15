'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@veritio/ui/components/tooltip'
import { BookOpen, Keyboard } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from './FloatingActionBarContext'
import { cn } from '@veritio/ui'

// Global actions that appear on every page
const globalActions: ActionButton[] = [
  {
    id: 'knowledge',
    icon: BookOpen,
    tooltip: 'Knowledge Base',
  },
  {
    id: 'shortcuts',
    icon: Keyboard,
    tooltip: 'Keyboard Shortcuts',
  },
]

// Shared button styles matching left sidebar
const iconButtonStyles = {
  base: 'size-10 rounded-lg transition-colors duration-200 flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-accent-foreground',
  active: 'bg-sidebar-primary/15 text-sidebar-accent-foreground',
}
function ActionBadge({ badge }: { badge: number | boolean }) {
  if (!badge) return null

  // Just a dot for boolean true
  if (badge === true) {
    return (
      <span className="absolute top-1 -right-0.5 size-2.5 bg-red-500 rounded-full ring-2 ring-background" />
    )
  }

  // Count badge for numbers
  return (
    <span className="absolute top-0.5 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[12px] font-medium rounded-full flex items-center justify-center ring-2 ring-background">
      {badge > 99 ? '99+' : badge}
    </span>
  )
}

export function FloatingActionBarIcons() {
  const { activePanel, togglePanel, pageActions } = useFloatingActionBar()

  const sortedPageActions = [...pageActions].sort((a, b) => (a.order ?? 10) - (b.order ?? 10))

  return (
    <div className="flex flex-col items-center justify-start">
      {/* Page-specific actions first */}
      {sortedPageActions.length > 0 &&
        sortedPageActions.map((button) => {
          const Icon = button.icon
          const isActive = activePanel === button.id

          return (
            <Tooltip key={button.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    iconButtonStyles.base,
                    isActive && iconButtonStyles.active,
                    'relative' // For badge positioning
                  )}
                  onClick={() => togglePanel(button.id)}
                >
                  <Icon className="size-4" />
                  {button.badge && <ActionBadge badge={button.badge} />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{button.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}

      {/* Separator above global actions (always visible when there are page actions) */}
      {sortedPageActions.length > 0 && <div className="w-7 h-px bg-stone-300 dark:bg-stone-600 my-2" />}

      {/* Global actions */}
      {globalActions.map((button) => {
        const Icon = button.icon
        const isActive = activePanel === button.id

        return (
          <Tooltip key={button.id}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  iconButtonStyles.base,
                  isActive && iconButtonStyles.active
                )}
                onClick={() => togglePanel(button.id)}
              >
                <Icon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{button.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
