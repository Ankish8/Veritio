import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"
import { RouteProgressBar } from "@/components/providers/progress-bar"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <Toaster />
      <RouteProgressBar />
      <div className="min-h-screen bg-stone-50 dark:bg-background">
        {children}
      </div>
    </AuthProvider>
  )
}
