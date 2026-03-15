import { AuthProvider } from "@/components/providers/auth-provider"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-stone-50 dark:bg-background">
        {children}
      </div>
    </AuthProvider>
  )
}
