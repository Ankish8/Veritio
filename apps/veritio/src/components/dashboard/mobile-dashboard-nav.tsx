'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FlaskConical, FolderKanban, Home, Settings, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileTabBar } from './mobile-tab-bar-context'

const NAV_SHELL =
  'fixed inset-x-0 bottom-0 z-[90] border-t border-border/70 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden'

const mobileNavItems = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Projects', href: '/projects', icon: FolderKanban },
  { title: 'Studies', href: '/studies', icon: FlaskConical },
  { title: 'Panel', href: '/panel', icon: UsersRound },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function MobileDashboardNav() {
  const pathname = usePathname()
  const tabBar = useMobileTabBar()?.config

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // A page can claim the bar for its own tabs (see MobileTabBarProvider).
  // Items keep a comfortable tap width and scroll sideways rather than
  // shrinking labels to the point of being unreadable.
  if (tabBar && tabBar.items.length > 0) {
    return (
      <nav className={NAV_SHELL}>
        <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto">
          {tabBar.items.map((item) => {
            const Icon = item.icon
            const active = item.id === tabBar.activeId
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => tabBar.onSelect(item.id)}
                className={cn(
                  'flex w-[76px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground active:bg-muted',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <nav className={NAV_SHELL}>
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground active:bg-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
