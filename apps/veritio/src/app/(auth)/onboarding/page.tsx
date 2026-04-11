"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthContext } from "@/components/providers/auth-provider"
import { getAuthFetchInstance } from "@/lib/swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Loader2,
  Microscope,
  BarChart3,
  Palette,
  GraduationCap,
  MoreHorizontal,
  User,
  Users,
  Building2,
  Globe,
  Layers3,
  GitBranch,
  ClipboardList,
  Frame,
  Compass,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react"
import type { OnboardingRole, TeamSize } from "@/lib/supabase/user-preferences-types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Goal = "card_sort" | "tree_test" | "survey" | "prototype_test" | "exploring"

interface RoleOption {
  value: OnboardingRole
  label: string
  icon: typeof Microscope
}

interface TeamSizeOption {
  value: TeamSize
  label: string
  description: string
  icon: typeof User
}

interface GoalOption {
  value: Goal
  label: string
  icon: typeof Layers3
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS: RoleOption[] = [
  { value: "ux_researcher", label: "UX Researcher", icon: Microscope },
  { value: "product_manager", label: "Product Manager", icon: BarChart3 },
  { value: "designer", label: "Designer", icon: Palette },
  { value: "student_academic", label: "Student / Academic", icon: GraduationCap },
  { value: "other", label: "Other", icon: MoreHorizontal },
]

const TEAM_SIZE_OPTIONS: TeamSizeOption[] = [
  { value: "solo", label: "Just me", description: "Working solo", icon: User },
  { value: "2-5", label: "2-5 people", description: "Small team", icon: Users },
  { value: "6-20", label: "6-20 people", description: "Growing team", icon: Building2 },
  { value: "20+", label: "20+ people", description: "Large organization", icon: Globe },
]

const GOAL_OPTIONS: GoalOption[] = [
  { value: "card_sort", label: "Run a card sort", icon: Layers3 },
  { value: "tree_test", label: "Test information architecture", icon: GitBranch },
  { value: "survey", label: "Get survey feedback", icon: ClipboardList },
  { value: "prototype_test", label: "Test a prototype", icon: Frame },
  { value: "exploring", label: "Just exploring", icon: Compass },
]

const TOTAL_STEPS = 3

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuthContext()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [role, setRole] = useState<OnboardingRole | null>(null)
  const [company, setCompany] = useState("")
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if user needs onboarding
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace("/sign-in")
      return
    }

    const checkOnboarding = async () => {
      try {
        const authFetch = getAuthFetchInstance()
        const res = await authFetch("/api/user/preferences")
        if (res.ok) {
          const prefs = await res.json()
          if (prefs.onboarding?.completed) {
            router.replace("/")
            return
          }
        }
      } catch {
        // If preferences fetch fails, continue with onboarding
      }
      setCheckingStatus(false)
    }

    checkOnboarding()
  }, [isLoaded, isSignedIn, router])

  const saveAndRedirect = useCallback(async () => {
    setSaving(true)
    try {
      const authFetch = getAuthFetchInstance()
      await authFetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding: {
            role,
            company: company.trim() || null,
            teamSize,
            completed: true,
          },
        }),
      })
    } catch {
      // Non-blocking — redirect even if save fails
    }
    router.replace("/")
  }, [role, company, teamSize, router])

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      saveAndRedirect()
    }
  }

  const handleBack = () => {
    setDirection(-1)
    setStep((s) => s - 1)
  }

  const handleSkip = () => {
    saveAndRedirect()
  }

  // Loading states
  if (!isLoaded || checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-black.png" alt="Veritio" className="mb-8 h-10 object-contain" />

      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 pb-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-zinc-900 dark:bg-zinc-100"
                    : i < step
                      ? "w-2 bg-zinc-400 dark:bg-zinc-500"
                      : "w-2 bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {/* Step content with animation */}
          <div className="relative overflow-hidden min-h-[340px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {step === 0 && (
                  <StepRole
                    role={role}
                    company={company}
                    onRoleChange={setRole}
                    onCompanyChange={setCompany}
                  />
                )}
                {step === 1 && (
                  <StepTeamSize teamSize={teamSize} onChange={setTeamSize} />
                )}
                {step === 2 && (
                  <StepGoal goal={goal} onChange={setGoal} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div>
              {step > 0 ? (
                <Button variant="ghost" size="sm" onClick={handleBack} disabled={saving}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving} className="text-muted-foreground">
                Skip
              </Button>
              <Button size="sm" onClick={handleNext} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : step === TOTAL_STEPS - 1 ? (
                  <Check className="mr-1.5 h-4 w-4" />
                ) : (
                  <ArrowRight className="mr-1.5 h-4 w-4" />
                )}
                {step === TOTAL_STEPS - 1 ? "Get started" : "Continue"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function StepRole({
  role,
  company,
  onRoleChange,
  onCompanyChange,
}: {
  role: OnboardingRole | null
  company: string
  onRoleChange: (r: OnboardingRole) => void
  onCompanyChange: (c: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">What describes you best?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us tailor your experience
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon
          const selected = role === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onRoleChange(option.value)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{option.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company" className="text-sm text-muted-foreground">
          Company name (optional)
        </Label>
        <Input
          id="company"
          type="text"
          placeholder="e.g. Acme Inc."
          value={company}
          onChange={(e) => onCompanyChange(e.target.value)}
          maxLength={200}
        />
      </div>
    </div>
  )
}

function StepTeamSize({
  teamSize,
  onChange,
}: {
  teamSize: TeamSize | null
  onChange: (t: TeamSize) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">How big is your team?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll set up your workspace accordingly
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEAM_SIZE_OPTIONS.map((option) => {
          const Icon = option.icon
          const selected = teamSize === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex flex-col items-center gap-2 rounded-lg border px-4 py-5 text-center transition-all ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <div>
                <div className="text-sm font-medium">{option.label}</div>
                <div className={`text-xs mt-0.5 ${selected ? "text-zinc-300 dark:text-zinc-500" : "text-muted-foreground"}`}>
                  {option.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepGoal({
  goal,
  onChange,
}: {
  goal: Goal | null
  onChange: (g: Goal) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">What would you like to do first?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You can always explore other study types later
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {GOAL_OPTIONS.map((option) => {
          const Icon = option.icon
          const selected = goal === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
