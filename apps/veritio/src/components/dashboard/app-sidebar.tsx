"use client"

import { useCallback, useRef } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const OrgSwitcher = dynamic(
  () => import("@/components/collaboration/OrgSwitcher").then((m) => ({ default: m.OrgSwitcher })),
  {
    ssr: false,
    loading: () => <div className="h-9 w-full rounded-md bg-sidebar-accent animate-pulse" />,
  }
)

const UserButton = dynamic(
  () => import("@/components/auth/user-button").then((m) => ({ default: m.UserButton })),
  {
    ssr: false,
    loading: () => <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />,
  }
)

import {
  Home,
  FolderKanban,
  UsersRound,
  Users,
  UserCircle,
  Megaphone,
  Gift,
  Archive,
  Newspaper,
  ChevronRight,
  Shield,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useSidebarControl } from "@/hooks/use-sidebar-control"
import { useRecentParticipantsCount } from "@/hooks/panel/use-recent-participants-count"
import {
  prefetchDashboard,
  prefetchProjects,
} from "@/lib/swr"
import { useCurrentOrganizationId } from "@/stores/collaboration-store"

const topNav = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
]

const mainNav = [
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    prefetch: prefetchProjects,
  },
]

const panelSubItems = [
  {
    title: "Participants",
    url: "/panel/participants",
    icon: UserCircle,
  },
  {
    title: "Widget",
    url: "/panel/widget",
    icon: Megaphone,
  },
  {
    title: "Incentives",
    url: "/panel/incentives",
    icon: Gift,
  },
  {
    title: "Segments",
    url: "/panel/segments",
    icon: Users,
  },
]

/** Formats the participant count for display in badges */
function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state: sidebarState } = useSidebar()
  const isExpanded = sidebarState === "expanded"

  const { user: currentUser } = useCurrentUser()
  const currentOrgId = useCurrentOrganizationId()

  // Skip sidebar data fetching on builder/results/recruit pages
  const isBuilderOrDeepPage = pathname.includes('/builder') || pathname.includes('/results') || pathname.includes('/recruit')
  const { count: recentParticipantsCount } = useRecentParticipantsCount(!isBuilderOrDeepPage)

  const prefetchedRef = useRef<Set<string>>(new Set())

  const handlePrefetch = useCallback((url: string, prefetchFn?: () => void) => {
    if (prefetchFn && !prefetchedRef.current.has(url)) {
      prefetchedRef.current.add(url)
      prefetchFn()
    }
  }, [])

  useSidebarControl()

  const isActive = (url: string) => {
    if (url === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/favicon-black.png" alt="Veritio" className="h-10 w-10 rounded-lg" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">Veritio</span>
            <span className="text-xs text-sidebar-foreground/70">Research Tools</span>
          </div>
        </div>
        <div className="mt-3 -mx-4 group-data-[collapsible=icon]:hidden">
          <OrgSwitcher className="px-4" showSettingsLink={true} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {topNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    onMouseEnter={() => handlePrefetch(item.url, () => prefetchDashboard(currentOrgId))}
                  >
                    <Link href={item.url} prefetch={true}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    onMouseEnter={() => handlePrefetch(item.url, item.prefetch)}
                  >
                    <Link href={item.url} prefetch={true}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Panel section — always expanded */}
              {!isExpanded ? (
                <div className="relative mt-2 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
                  {panelSubItems.map((subItem) => (
                    <SidebarMenuItem key={subItem.title} className="relative">
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(subItem.url)}
                        tooltip={subItem.title === "Participants" && recentParticipantsCount > 0
                          ? `${subItem.title} (${recentParticipantsCount} new)`
                          : subItem.title}
                      >
                        <Link href={subItem.url} prefetch={true}>
                          <subItem.icon />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {subItem.title === "Participants" && recentParticipantsCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[12px] font-medium bg-sidebar-primary text-sidebar-primary-foreground rounded-full px-1">
                          {formatBadgeCount(recentParticipantsCount)}
                        </span>
                      )}
                    </SidebarMenuItem>
                  ))}
                </div>
              ) : (
                <SidebarMenuItem>
                  <Collapsible defaultOpen className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isActive('/panel')}
                        tooltip="Panel"
                      >
                        <UsersRound />
                        <span>Panel</span>
                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="gap-2 py-1.5">
                        {panelSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                              <Link href={subItem.url} prefetch={true} className="flex items-center w-full">
                                <subItem.icon className="size-4" />
                                <span>{subItem.title}</span>
                                {subItem.title === "Participants" && recentParticipantsCount > 0 && (
                                  <span className="ml-auto text-[12px] font-medium bg-sidebar-primary/15 text-sidebar-primary px-1.5 py-0.5 rounded-full">
                                    {formatBadgeCount(recentParticipantsCount)}
                                  </span>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {process.env.NEXT_PUBLIC_SUPERADMIN_USER_ID && currentUser?.id === process.env.NEXT_PUBLIC_SUPERADMIN_USER_ID && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/admin')} tooltip="Admin Panel">
                <Link href="/admin" prefetch={false}>
                  <Shield />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/archive')} tooltip="Archive">
              <Link href="/archive" prefetch={true}>
                <Archive />
                <span>Archive</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="What's New">
              <Link href="/updates" prefetch={true}>
                <Newspaper />
                <span>What's New</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {isExpanded ? (
              <UserButton afterSignOutUrl="/sign-in" expanded />
            ) : (
              <div className="flex items-center justify-center py-2">
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
