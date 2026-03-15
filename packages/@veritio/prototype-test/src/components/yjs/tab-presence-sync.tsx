'use client'
import { useEffect } from 'react'
import { TabsTrigger } from '@veritio/ui'
import { useYjs } from './yjs-provider'
import { useTabPresence } from '@veritio/yjs'
export function TabPresenceSync({ activeTab }: { activeTab: string }) {
  const { setTab } = useYjs()

  useEffect(() => {
    setTab(activeTab)
    return () => {
      // Clear tab when unmounting (e.g., leaving the page)
      setTab(null)
    }
  }, [activeTab, setTab])

  return null
}
export function TabTriggerWithPresence({
  tabId,
  activeTab,
  icon,
  label,
  badge,
  disabled,
}: {
  tabId: string
  activeTab: string
  icon?: React.ReactNode
  label: string
  badge?: number | string
  disabled?: boolean
}) {
  const { getUsersOnTab } = useTabPresence()

  // Only show presence on tabs that aren't the current user's tab
  const usersOnTab = tabId === activeTab ? [] : getUsersOnTab(tabId)

  // Show up to 2 avatars, then "+N" for overflow
  const visibleUsers = usersOnTab.slice(0, 2)
  const overflowCount = usersOnTab.length - 2

  return (
    <TabsTrigger
      value={tabId}
      disabled={disabled}
      variant="underline"
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
