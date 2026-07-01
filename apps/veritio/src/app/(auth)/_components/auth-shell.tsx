"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  Check,
  Home,
  FolderKanban,
  UsersRound,
  ChevronRight,
  UserCircle,
  Megaphone,
  Gift,
  Archive,
  Newspaper,
  FlaskConical,
  Play,
  Users,
  Plus,
  Layers3,
  GitBranch,
  ClipboardList,
  Frame,
  ArrowRight,
  AppWindow,
  Globe,
  MousePointerClick,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthShellProps {
  /**
   * "split" (default): two-column brand panel + form, for high-intent flows
   * (sign-up, onboarding). "single": compact centered card with no brand
   * panel, for returning users (sign-in).
   */
  variant?: "split" | "single"
  /** Headline shown on the dark brand panel. Required for the split variant. */
  panelTitle?: string
  /** Optional supporting line under the headline. */
  panelSubtitle?: string
  /** Checkmark benefit bullets rendered on the brand panel. */
  points?: string[]
  /** Small footer text at the bottom of the brand panel. */
  panelFooter?: ReactNode
  /** Form / step content rendered in the right column. */
  children: ReactNode
  /** Widen the modal for content-heavier flows (e.g. onboarding). */
  wide?: boolean
  /** Extra classes for the right content column. */
  contentClassName?: string
}

/**
 * Auth surface floating over a blurred, decorative dashboard backdrop. Shared
 * by sign-up, sign-in, and onboarding so every entry point feels like one
 * product. Renders a two-column brand+form modal by default, or a lean
 * single-column card when `variant="single"`.
 */
export function AuthShell({
  variant = "split",
  panelTitle,
  panelSubtitle,
  points = [],
  panelFooter,
  children,
  wide = false,
  contentClassName,
}: AuthShellProps) {
  if (variant === "single") {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <PlainBackdrop />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
          <div
            className={cn(
              "w-full max-w-md overflow-hidden rounded-2xl border border-black/5 bg-card px-6 py-9 shadow-2xl shadow-primary/10 dark:border-white/10 sm:px-10",
              contentClassName,
            )}
          >
            <Link
              href="/"
              aria-label="Veritio home"
              className="mb-7 flex justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-black.png"
                alt="Veritio"
                className="h-9 w-auto object-contain dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-white.png"
                alt="Veritio"
                className="hidden h-9 w-auto object-contain dark:block"
              />
            </Link>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <DashboardBackdrop />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className={cn(
            "grid w-full overflow-hidden rounded-2xl border border-black/5 bg-card shadow-2xl shadow-primary/10 dark:border-white/10",
            "md:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]",
            wide ? "max-w-4xl" : "max-w-3xl",
          )}
        >
          <BrandPanel
            title={panelTitle ?? ""}
            subtitle={panelSubtitle}
            points={points}
            footer={panelFooter}
          />

          <div
            className={cn(
              "flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10",
              contentClassName,
            )}
          >
            {/* Mobile-only logo (brand panel is hidden below md) */}
            <Link href="/" aria-label="Veritio home" className="mb-6 md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-black.png"
                alt="Veritio"
                className="h-9 w-auto object-contain dark:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-white.png"
                alt="Veritio"
                className="hidden h-9 w-auto object-contain dark:block"
              />
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function BrandPanel({
  title,
  subtitle,
  points,
  footer,
}: {
  title: string
  subtitle?: string
  points: string[]
  footer?: ReactNode
}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden p-8 text-white md:flex lg:p-10 bg-[linear-gradient(157deg,#3a1d6d_0%,#5a2ea3_48%,#2c1653_100%)]">
      {/* Soft brand glows */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <Link href="/" aria-label="Veritio home" className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-white.png"
          alt="Veritio"
          className="h-8 w-auto object-contain"
        />
      </Link>

      <div className="relative space-y-7 py-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold leading-tight lg:text-[28px]">
            {title}
          </h2>
          {subtitle && (
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              {subtitle}
            </p>
          )}
        </div>

        {points.length > 0 && (
          <ul className="space-y-3.5">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-white/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative text-xs leading-relaxed text-white/45">
        {footer}
      </div>
    </div>
  )
}

/**
 * Decorative, blurred dashboard mock behind the modal. Purely cosmetic
 * (aria-hidden), no assets required.
 */
/**
 * Subtle, light background for returning-user flows (sign-in). A gentle
 * lavender gradient gives quiet depth so the white card still floats, without
 * the busy dashboard mock or a bold color wash.
 */
function PlainBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-app-background dark:bg-app-background"
    >
      <div className="absolute inset-0 bg-[linear-gradient(150deg,#f5f1fb_0%,#ece6f6_55%,#e4ddf0_100%)] dark:hidden" />
    </div>
  )
}

// Mirrors the real dashboard sidebar (app-sidebar.tsx) and home page
// (dashboard-client.tsx) so the modal floats over an authentic-looking product.
const NAV_ITEMS = [
  { icon: Home, label: "Home", active: true },
  { icon: FolderKanban, label: "Projects" },
]

const PANEL_SUBS = [
  { icon: UserCircle, label: "Participants", badge: "12" },
  { icon: Megaphone, label: "Widget" },
  { icon: Gift, label: "Incentives" },
  { icon: Users, label: "Segments" },
]

const FOOTER_ITEMS = [
  { icon: Archive, label: "Archive" },
  { icon: Newspaper, label: "What's New" },
]

const STAT_ITEMS = [
  { icon: FolderKanban, label: "Projects", value: "8" },
  { icon: FlaskConical, label: "Studies", value: "24" },
  { icon: Play, label: "Active", value: "4" },
  { icon: Users, label: "Responses", value: "1,284" },
]

const RECENT_STUDIES = [
  { title: "Homepage navigation sort", type: "Card Sort", icon: Layers3, status: "active", count: 48 },
  { title: "Mobile app IA test", type: "Tree Test", icon: GitBranch, status: "active", count: 31 },
  { title: "Onboarding feedback survey", type: "Survey", icon: ClipboardList, status: "completed", count: 126 },
  { title: "Checkout prototype", type: "Figma Prototype Test", icon: Frame, status: "draft", count: 0 },
]

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

const CATEGORY_TABS = ["All", "Information Architecture", "Usability Testing", "Design Validation", "Feedback"]

const STUDY_TYPES = [
  { name: "Card Sort", description: "Discover how users naturally organize and categorize your content", subtitle: "Organize content into groups", icon: Layers3, icon_c: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "Tree Test", description: "Validate your navigation structure and information architecture", subtitle: "Test your navigation hierarchy", icon: GitBranch, icon_c: "text-indigo-500", bg: "bg-indigo-500/10" },
  { name: "Figma Prototype Test", description: "Test interactive Figma prototypes with real users to validate designs", subtitle: "Test clickable Figma prototypes", icon: Frame, icon_c: "text-violet-500", bg: "bg-violet-500/10" },
  { name: "Website Prototype Test", description: "Test any landing page or prototype from Lovable, v0, Bolt, Replit, or any URL", subtitle: "Just paste a URL, no code needed", icon: AppWindow, icon_c: "text-purple-500", bg: "bg-purple-500/10" },
  { name: "Web App Test", description: "Add a lightweight script to your production site for on-site testing with real users", subtitle: "Install a snippet on your domain", icon: Globe, icon_c: "text-cyan-500", bg: "bg-cyan-500/10" },
  { name: "First Click Test", description: "Measure where users click first on your designs to complete tasks", subtitle: "Test where users click first", icon: MousePointerClick, icon_c: "text-orange-500", bg: "bg-orange-500/10" },
  { name: "First Impression Test", description: "Capture immediate reactions by showing designs for a brief moment", subtitle: "Capture reactions to brief exposure", icon: Eye, icon_c: "text-amber-500", bg: "bg-amber-500/10" },
  { name: "Survey", description: "Collect feedback and insights with customizable questionnaires", subtitle: "Collect feedback with custom questions", icon: ClipboardList, icon_c: "text-emerald-500", bg: "bg-emerald-500/10" },
]

function DashboardBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden bg-app-background text-foreground"
    >
      <div className="absolute inset-0 flex scale-[1.02] blur-[1.5px]">
        {/* Sidebar */}
        <aside className="hidden h-full w-64 shrink-0 flex-col bg-sidebar px-3 pb-3 pt-4 text-sidebar-foreground sm:flex">
          {/* Header: logo + org switcher */}
          <div className="border-b border-sidebar-border pb-3">
            <div className="flex items-center gap-3 px-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/favicon-black.png" alt="" className="h-9 w-9 rounded-lg object-contain dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/favicon-white.png" alt="" className="hidden h-9 w-9 rounded-lg object-contain dark:block" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Veritio</span>
                <span className="text-xs text-sidebar-foreground/70">Research Tools</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">A</div>
              <span className="text-sm font-medium">Acme Research</span>
              <ChevronRight className="ml-auto h-4 w-4 text-sidebar-foreground/50" />
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-3 space-y-1">
            {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  active ? "bg-sidebar-accent font-medium" : "text-sidebar-foreground/80",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}

            {/* Panel group (expanded) */}
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80">
              <UsersRound className="h-4 w-4" />
              Panel
              <ChevronRight className="ml-auto h-4 w-4 rotate-90 text-sidebar-foreground/50" />
            </div>
            <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
              {PANEL_SUBS.map(({ icon: Icon, label, badge }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/80">
                  <Icon className="h-4 w-4" />
                  {label}
                  {badge && (
                    <span className="ml-auto rounded-full bg-sidebar-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-sidebar-primary">
                      {badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="mt-auto border-t border-sidebar-border pt-3">
            <div className="mb-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-3">
              <div className="text-xs font-semibold">Starter trial</div>
              <div className="mt-1 text-[11px] text-sidebar-foreground/60">9 days left</div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
            </div>
            {FOOTER_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80">
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
            <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/80 text-xs font-semibold text-white">JR</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">Jamie Rivera</div>
                <div className="truncate text-xs text-sidebar-foreground/60">jamie@acme.co</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main area: floating rounded card on the app background */}
        <div className="flex h-full flex-1 flex-col bg-app-background p-3">
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-background shadow-lg">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 100% 0%, rgba(216, 180, 254, 0.15) 0%, rgba(233, 213, 255, 0.08) 30%, transparent 60%)",
              }}
            />
            <div className="relative flex flex-col gap-6 p-8">
              {/* Welcome banner */}
              <div className="px-1">
                <h1 className="text-3xl font-bold">Welcome back, Jamie!</h1>
                <p className="mt-1.5 text-base text-muted-foreground">
                  You have 4 active studies collecting responses.
                </p>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 lg:gap-8">
                  {STAT_ITEMS.map((stat, i) => (
                    <div key={stat.label} className="flex items-center gap-3">
                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stat.value}</span>
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                      </div>
                      {i < STAT_ITEMS.length - 1 && <div className="ml-5 h-6 w-px bg-border" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background shadow-sm">
                  <Plus className="h-4 w-4" />
                  New Study
                </div>
              </div>

              {/* Recently Opened */}
              <div className="rounded-2xl border border-border bg-muted/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Recently Opened</h4>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    View All
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div>
                  {RECENT_STUDIES.map((study, i) => (
                    <div
                      key={study.title}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-3",
                        i < RECENT_STUDIES.length - 1 && "border-b border-border",
                      )}
                    >
                      <study.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{study.title}</div>
                        <div className="text-xs text-muted-foreground">{study.type}</div>
                      </div>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium capitalize", STATUS_COLORS[study.status])}>
                        {study.status}
                      </span>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{study.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create a new study */}
              <div>
                <h2 className="mb-5 text-xl font-semibold">Create a new study</h2>
                <div className="mb-4 flex items-center gap-1.5">
                  {CATEGORY_TABS.map((tab, i) => (
                    <span
                      key={tab}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium",
                        i === 0 ? "bg-foreground text-background" : "text-muted-foreground",
                      )}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {STUDY_TYPES.map((s) => (
                    <div key={s.name} className="flex flex-col gap-3 rounded-xl border border-border/60 p-4">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                        <s.icon className={cn("h-4 w-4", s.icon_c)} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{s.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground/50">{s.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrim so the modal stays the focal point: a light base plus a soft gray
          wash that mutes the app's lavender tint without hiding the content. */}
      <div className="absolute inset-0 bg-app-background/40 dark:bg-app-background/55" />
      <div className="absolute inset-0 bg-zinc-900/[0.22] dark:bg-zinc-950/35" />
    </div>
  )
}
