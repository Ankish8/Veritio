'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  UserCheck,
  Activity,
  BarChart3,
  ScrollText,
  ToggleLeft,
  Bot,
  Shield,
  ArrowLeft,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { UserButton } from '@/components/auth/user-button'

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: Users, label: 'Users & Orgs', path: '/admin/users' },
  { icon: FlaskConical, label: 'Studies', path: '/admin/studies' },
  { icon: UserCheck, label: 'Participants', path: '/admin/participants' },
  { icon: Activity, label: 'System Health', path: '/admin/system-health' },
  { icon: BarChart3, label: 'Usage & Limits', path: '/admin/usage' },
  { icon: ScrollText, label: 'Audit Log', path: '/admin/audit-log' },
  { icon: ToggleLeft, label: 'Feature Flags', path: '/admin/feature-flags' },
  { icon: Bot, label: 'AI Settings', path: '/admin/ai-settings' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-1">
          <Shield className="h-8 w-8 text-primary shrink-0" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">Admin Panel</span>
            <span className="text-xs text-sidebar-foreground/60">System Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path)}
                    tooltip={item.label}
                  >
                    <Link href={item.path}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <Separator className="my-2 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Dashboard">
              <Link href="/">
                <ArrowLeft />
                <span>Back to Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserButton afterSignOutUrl="/sign-in" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
