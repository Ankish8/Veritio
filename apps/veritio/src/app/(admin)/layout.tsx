import { AdminProviders } from '@/components/admin/admin-providers'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      <AdminGuard>
        <AdminSidebar />
        <SidebarInset className="bg-app-background min-h-screen overflow-x-hidden">
          <div className="flex flex-col h-screen p-2 sm:p-3 overflow-hidden">
            <div className="flex flex-1 overflow-hidden rounded-2xl bg-background shadow-lg dark:shadow-xl min-w-0">
              <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </AdminGuard>
    </AdminProviders>
  )
}
