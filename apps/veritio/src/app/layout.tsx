import type { Metadata, Viewport } from "next"
import { Public_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ProgressBarProvider } from "@/components/providers/progress-bar"
import "./globals.css"

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: "Veritio - UX Research Platform",
  description: "Professional UX research tools for information architecture testing",
  icons: {
    icon: [
      { url: '/icon.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={publicSans.variable} suppressHydrationWarning>
      <head />
      <body className="font-sans antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <ProgressBarProvider>
          {children}
        </ProgressBarProvider>
        <Toaster />
      </body>
    </html>
  )
}
