'use client'

import { memo, useCallback, useEffect, useRef } from 'react'
import { TabsTrigger } from '@/components/ui/tabs'
import { useYjs } from './yjs-provider'
import { useTabPresence } from '@veritio/yjs'
import { prefetchTabBundle } from '@/lib/prefetch/tab-prefetch'

const TAB_SYNC_DEBOUNCE_MS = 150

export function TabPresenceSync({ activeTab }: { activeTab: string }) {
  const { setTab } = useYjs()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedTab = useRef<string | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (lastSyncedTab.current !== activeTab) {
        lastSyncedTab.current = activeTab
        setTab(activeTab)
      }
    }, TAB_SYNC_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [activeTab, setTab])

  useEffect(() => {
    return () => {
      // Clear tab when unmounting (e.g., leaving the page)
      setTab(null)
    }
  }, [setTab])

  return null
}

type TabTriggerWithPresenceProps = {
  tabId: string
  activeTab: string
  icon?: React.ReactNode
  label: string
  badge?: number | string
  disabled?: boolean
  onPrefetch?: (tabId: string) => void
}

const TabTriggerWithPresenceComponent = ({
  tabId,
  activeTab,
  icon,
  label,
  badge,
  disabled,
  onPrefetch,
}: TabTriggerWithPresenceProps) => {
  const { getUsersOnTab } = useTabPresence()

  // Only show presence on tabs that aren't the current user's tab
  const usersOnTab = tabId === activeTab ? [] : getUsersOnTab(tabId)

  // Show up to 2 avatars, then "+N" for overflow
  const visibleUsers = usersOnTab.slice(0, 2)
  const overflowCount = usersOnTab.length - 2
  const handleMouseEnter = useCallback(() => {
    // Use custom prefetch function if provided, otherwise default to builder prefetch
    if (onPrefetch) {
      onPrefetch(tabId)
    } else {
      prefetchTabBundle(tabId)
    }
  }, [tabId, onPrefetch])

  return (
    <TabsTrigger
      value={tabId}
      disabled={disabled}
      variant="underline"
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal">
          {badge}
        </span>
      )}
      {/* Presence badges */}
      {usersOnTab.length > 0 && (
        <span className="ml-2 flex items-center -space-x-1">
          {visibleUsers.map((user) => (
            <div
              key={user.clientId}
              className="h-[18px] w-[18px] rounded-full flex items-center justify-center text-[8px] font-bold text-white border-[1.5px] border-white outline outline-1 outline-gray-300"
              style={{ backgroundColor: user.color }}
              title={`${user.name} is viewing this tab`}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user.initials
              )}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="h-[18px] w-[18px] rounded-full flex items-center justify-center text-[8px] font-medium bg-muted text-muted-foreground border-[1.5px] border-white outline outline-1 outline-gray-300">
              +{overflowCount}
            </div>
          )}
        </span>
      )}
    </TabsTrigger>
  )
}

export const TabTriggerWithPresence = memo(
  TabTriggerWithPresenceComponent,
  (prev, next) =>
    prev.tabId === next.tabId &&
    prev.activeTab === next.activeTab &&
    prev.icon === next.icon &&
    prev.label === next.label &&
    prev.badge === next.badge &&
    prev.disabled === next.disabled &&
    prev.onPrefetch === next.onPrefetch
)
