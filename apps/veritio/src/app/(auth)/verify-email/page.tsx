"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@veritio/auth/client"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle2, RotateCw } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Envelope body */}
      <rect x="8" y="20" width="64" height="44" rx="6" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="1.5" />
      {/* Envelope flap */}
      <path d="M8 26L40 46L72 26" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#fafafa" />
      {/* Inner shadow line */}
      <path d="M8 26L40 46L72 26" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Mail badge circle */}
      <circle cx="60" cy="22" r="10" fill="#10b981" />
      {/* Checkmark in badge */}
      <path d="M55 22L58.5 25.5L65 18.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmailProviderLink({ name, href, icon }: { name: string; href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
    >
      {icon}
      {name}
    </a>
  )
}

function VerifyEmailContent() {
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

    // Check on tab focus and every 15s
    const interval = setInterval(check, 15000)
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

  const emailDomain = email?.split("@")[1]?.toLowerCase()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-black.png" alt="Veritio" className="mb-10 h-10 object-contain" />

      <div className="w-full max-w-sm text-center">
        {/* Animated mail icon */}
        <div className="mx-auto mb-6 w-20 h-20 animate-[bounce-gentle_2s_ease-in-out_infinite]">
          <MailIcon className="w-full h-full" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Check your inbox
        </h1>

        <p className="text-[15px] text-muted-foreground leading-relaxed">
          We sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{email}</span>
          ) : (
            "your email"
          )}
        </p>

        {/* Email provider quick links */}
        {emailDomain && (
          <div className="mt-6 flex justify-center gap-3">
            {(emailDomain === "gmail.com" || emailDomain === "googlemail.com") && (
              <EmailProviderLink
                name="Open Gmail"
                href="https://mail.google.com"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="#EA4335"/>
                  </svg>
                }
              />
            )}
            {(emailDomain === "outlook.com" || emailDomain === "hotmail.com" || emailDomain === "live.com") && (
              <EmailProviderLink
                name="Open Outlook"
                href="https://outlook.live.com"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#0078D4"/>
                  </svg>
                }
              />
            )}
            {emailDomain === "yahoo.com" && (
              <EmailProviderLink
                name="Open Yahoo Mail"
                href="https://mail.yahoo.com"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#6001D2"/>
                    <path d="M13 7h-2v6l5.25 3.15.75-1.23-4-2.42V7z" fill="#6001D2"/>
                  </svg>
                }
              />
            )}
          </div>
        )}

        {/* Resend section */}
        <div className="mt-8 flex flex-col items-center gap-2">
          {resent && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-bottom-1 duration-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Verification email sent</span>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              <>
                <RotateCw className="h-3.5 w-3.5" />
                Resend in {cooldown}s
              </>
            ) : (
              <>
                <RotateCw className="h-3.5 w-3.5" />
                Resend email
              </>
            )}
          </button>
        </div>

        {/* Back link */}
        <div className="mt-10">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign up
          </Link>
        </div>
      </div>

      {/* Keyframe for gentle bounce animation */}
      <style jsx>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
