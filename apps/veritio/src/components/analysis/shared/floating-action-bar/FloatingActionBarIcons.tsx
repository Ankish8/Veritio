'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BookOpen, Keyboard } from 'lucide-react'
import { useFloatingActionBar, type ActionButton } from './FloatingActionBarContext'
import { cn } from '@/lib/utils'

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

/**
 * Badge component for action buttons
 * Shows a dot for boolean true, or a count for numbers
 */
function ActionBadge({ badge }: { badge: number | boolean }) {
  if (!badge) return null

  if (badge === true) {
    return (
      <span className="absolute top-1 -right-0.5 size-2.5 bg-red-500 rounded-full ring-2 ring-background" />
    )
  }

  return (
    <span className="absolute top-0.5 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[12px] font-medium rounded-full flex items-center justify-center ring-2 ring-background">
      {badge > 99 ? '99+' : badge}
    </span>
  )
}

function AIActionButton({
  button,
  isActive,
  onToggle,
}: {
  button: ActionButton
  isActive: boolean
  onToggle: () => void
}) {
  const Icon = button.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative group my-0.5">
          <div
            className="absolute -inset-[4px] rounded-[14px] opacity-20 blur-xl group-hover:opacity-45 transition-opacity duration-300"
            style={{ background: 'conic-gradient(from 0deg at 50% 50%, #7c3aed, #2563eb, #06b6d4, #10b981, #f59e0b, #ec4899, #7c3aed)' }}
          />
          <div
            className="relative rounded-[11px] p-px z-10"
            style={{ background: 'conic-gradient(from 0deg at 50% 50%, #7c3aed, #2563eb, #06b6d4, #10b981, #f59e0b, #ec4899, #7c3aed)' }}
          >
            <button
              className={cn(
                'group/btn relative overflow-hidden size-9 rounded-[10px] flex items-center justify-center transition-colors duration-200',
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-sidebar hover:bg-sidebar-accent text-sidebar-foreground'
              )}
              onClick={onToggle}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover/btn:animate-[btn-shimmer_0.65s_ease-out_forwards]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)' }}
              />
              <Icon className="size-4 relative z-10" />
              {button.badge && <ActionBadge badge={button.badge} />}
            </button>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{button.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function FloatingActionBarIcons() {
  const { activePanel, togglePanel, pageActions } = useFloatingActionBar()

  const sortedPageActions = [...pageActions].sort((a, b) => (a.order ?? 10) - (b.order ?? 10))

  const aiAction = sortedPageActions.find((b) => b.id === 'ai-assistant')
  const otherPageActions = sortedPageActions.filter((b) => b.id !== 'ai-assistant' && !b.hidden)

  return (
    <div className="h-full flex flex-col items-center">
      {/* AI assistant pinned to very top */}
      {aiAction && (
        <AIActionButton
          button={aiAction}
          isActive={activePanel === aiAction.id}
          onToggle={() => togglePanel(aiAction.id)}
        />
      )}

      {/* Spacer + remaining icons at their original visual position */}
      <div className="mt-[52px] flex flex-col items-center">
        {otherPageActions.map((button) => {
          const Icon = button.icon
          const isActive = activePanel === button.id
          return (
            <Tooltip key={button.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    iconButtonStyles.base,
                    isActive && iconButtonStyles.active,
                    'relative'
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

        {otherPageActions.length > 0 && (
          <div className="w-7 h-px bg-stone-300 dark:bg-stone-600 my-2" />
        )}

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
    </div>
  )
}
