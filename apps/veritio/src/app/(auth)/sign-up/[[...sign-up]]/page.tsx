"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp, signIn, resetSessionRedirectGuard, clearAuthToken } from "@veritio/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, X } from "lucide-react"

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" }
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-orange-500" }
  if (score <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" }
  if (score <= 4) return { score: 4, label: "Strong", color: "bg-emerald-500" }
  return { score: 5, label: "Very strong", color: "bg-emerald-600" }
}

export default function SignUpPage() {
  const router = useRouter()

  // Carry the marketing-selected plan (?plan=) into a cookie so the workspace-init
  // step can start the trial on that plan. Survives the signup → verify-email → init chain.
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan')
    if (plan && ['starter', 'pro', 'team'].includes(plan)) {
      document.cookie = `__signup_plan=${plan}; path=/; max-age=3600; samesite=lax`
    }
  }, [])

  // Invite code state
  const [inviteCode, setInviteCode] = useState("")
  const [inviteCodeValidated, setInviteCodeValidated] = useState(false)
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false)
  const [inviteCodeError, setInviteCodeError] = useState("")

  // Sign-up form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Clear any stale auth tokens and reset redirect guard on mount
  useEffect(() => {
    clearAuthToken()
    resetSessionRedirectGuard()
  }, [])

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    if (touched.name && !name.trim()) errors.name = "Name is required"
    if (touched.email && !email.trim()) errors.email = "Email is required"
    if (touched.password && password.length > 0 && password.length < 8)
      errors.password = "Must be at least 8 characters"
    if (touched.confirmPassword && confirmPassword && confirmPassword !== password)
      errors.confirmPassword = "Passwords don't match"
    return errors
  }, [name, email, password, confirmPassword, touched])

  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword === password

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleVerifyInviteCode = async () => {
    const trimmed = inviteCode.trim()
    if (!trimmed) {
      setInviteCodeError("Please enter an invite code")
      return
    }

    setInviteCodeError("")
    setInviteCodeLoading(true)

    try {
      const response = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      })

      const result = await response.json()

      if (result.valid) {
        setInviteCodeValidated(true)
        setInviteCodeError("")
      } else {
        setInviteCodeError(result.error || "Invalid invite code")
      }
    } catch {
      setInviteCodeError("Failed to verify code. Please try again.")
    } finally {
      setInviteCodeLoading(false)
    }
  }

  const handleClearInviteCode = () => {
    setInviteCode("")
    setInviteCodeValidated(false)
    setInviteCodeError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setTouched({ name: true, email: true, password: true, confirmPassword: true })

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setLoading(true)

    try {
      // Re-validate invite code before sign-up
      const validateRes = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      })
      const validateResult = await validateRes.json()

      if (!validateResult.valid) {
        setError(validateResult.error || "Invite code is no longer valid")
        setLoading(false)
        return
      }

      const result = await signUp.email({
        email: trimmedEmail,
        password,
        name: trimmedName,
        callbackURL: "/onboarding",
      })

      if (result.error) {
        const msg = result.error.message || "Failed to create account"
        // Detect "user already exists" errors
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
          setError("__user_exists__")
        } else {
          setError(msg)
        }
        setLoading(false)
        return
      }

      // Redeem the invite code after successful sign-up
      try {
        const token = result.data?.token || ""
        await fetch("/api/invite-codes/redeem", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            code: inviteCode.trim(),
            email: trimmedEmail,
            signupMethod: "email",
          }),
        })
      } catch {
        // Don't block sign-up if redemption fails
      }

      // Reset the session redirect guard so future expirations can trigger redirects
      resetSessionRedirectGuard()
      // Redirect to email verification page (workspace init happens after verification)
      router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`)
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError("")
    setGoogleLoading(true)

    try {
      // Set invite code cookie before OAuth redirect
      await fetch("/api/auth/set-invite-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      })

      const result = await signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      })

      if (result?.error) {
        setError(result.error.message || "Failed to sign up with Google")
        setGoogleLoading(false)
      }
    } catch {
      setError("Failed to sign up with Google")
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" aria-label="Veritio home" className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-black.png" alt="Veritio" className="h-12 object-contain" />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold">Create an account</CardTitle>
          <CardDescription>
            Get started with Veritio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Code Gate */}
          {!inviteCodeValidated ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code</Label>
                <div className="flex gap-2">
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="Enter your invite code"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase())
                      setInviteCodeError("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleVerifyInviteCode()
                      }
                    }}
                    disabled={inviteCodeLoading}
                    className={`font-mono tracking-wider ${inviteCodeError ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                  />
                  <Button
                    onClick={handleVerifyInviteCode}
                    disabled={inviteCodeLoading || !inviteCode.trim()}
                  >
                    {inviteCodeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
                {inviteCodeError && <FieldError message={inviteCodeError} />}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                You need an invite code to create an account.
              </p>
            </div>
          ) : (
            <>
              {/* Validated invite code badge */}
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                    Invite code: <code className="font-mono font-medium">{inviteCode.trim().toUpperCase()}</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearInviteCode}
                  className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Google Sign Up */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignUp}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    required
                    disabled={loading}
                    className={fieldErrors.name ? "border-red-300 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.name && <FieldError message={fieldErrors.name} />}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    required
                    disabled={loading}
                    className={fieldErrors.email ? "border-red-300 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.email && <FieldError message={fieldErrors.email} />}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur("password")}
                      required
                      minLength={8}
                      disabled={loading}
                      className={`pr-10 ${fieldErrors.password ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <FieldError message={fieldErrors.password} />}
                  {/* Password strength bar */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : "bg-zinc-200 dark:bg-zinc-800"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${
                        passwordStrength.score <= 1 ? "text-red-500" :
                        passwordStrength.score <= 2 ? "text-orange-500" :
                        passwordStrength.score <= 3 ? "text-yellow-600 dark:text-yellow-500" :
                        "text-emerald-600 dark:text-emerald-500"
                      }`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => handleBlur("confirmPassword")}
                      required
                      disabled={loading}
                      className={`pr-10 ${fieldErrors.confirmPassword ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <FieldError message={fieldErrors.confirmPassword} />}
                </div>

                {/* Form-level error */}
                {error && error !== "__user_exists__" && (
                  <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* User exists error with sign-in link */}
                {error === "__user_exists__" && (
                  <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      An account with this email already exists.{" "}
                      <Link href="/sign-in" className="font-medium underline hover:text-red-700 dark:hover:text-red-300">
                        Sign in instead
                      </Link>
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || googleLoading || !isFormValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  )
}
