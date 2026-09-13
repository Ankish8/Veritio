import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import { headers } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsGate } from "@/components/analytics/analytics-gate";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Veritio - UX Research Platform",
  description:
    "Professional UX research tools for information architecture testing",
  icons: {
    icon: [
      { url: "/icon.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A request-scoped nonce is supplied by middleware for authenticated and
  // public app pages. Reading it also prevents static HTML from reusing a nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

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
        {/* NOTE: <Toaster /> and <ProgressBarProvider /> are mounted per route
            group rather than here. Mounting them globally put react-hot-toast
            and next-nprogress-bar in the initial bundle of the participant
            player, which shows no toasts and performs no route navigation.
            Each group's layout mounts them; the one participant-side toast
            caller (LiveWebsitePlayer) mounts its own inside its lazy chunk. */}
        {children}
        <SpeedInsights />
        <AnalyticsGate
          pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
          nonce={nonce}
        />
      </body>
    </html>
  );
}
