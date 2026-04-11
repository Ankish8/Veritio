"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@veritio/auth/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Poll session to detect verification (handles same-browser verify in another tab)
  useEffect(() => {
    const check = async () => {
      try {
        const session = await authClient.getSession()
        if (session.data?.user?.emailVerified) {
          fetch("/api/user/initialize-workspace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }).catch(() => {})
          router.replace("/onboarding")
        }
      } catch { /* ignore */ }
    }

    // Check on tab focus and every 5s
    const interval = setInterval(check, 5000)
    const onFocus = () => check()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [router])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return
    setResending(true)
    setResent(false)

    try {
      await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, callbackURL: "/onboarding" }),
      })
      setResent(true)
      setCooldown(60)
    } catch {
      // Silently fail — don't reveal if email exists
    } finally {
      setResending(false)
    }
  }, [email, cooldown])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-black.png" alt="Veritio" className="mb-8 h-10 object-contain" />

      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Mail className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>

          <h1 className="text-xl font-semibold mb-2">Check your email</h1>

          <p className="text-sm text-muted-foreground mb-1">
            We sent a verification link to
          </p>
          {email && (
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-6">
              {email}
            </p>
          )}

          <p className="text-sm text-muted-foreground mb-6">
            Click the link in the email to verify your account and get started.
          </p>

          {/* Resend button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="mb-4"
          >
            {resending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              "Resend verification email"
            )}
          </Button>

          {resent && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Email sent</span>
            </div>
          )}

          <div className="pt-4 border-t">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
