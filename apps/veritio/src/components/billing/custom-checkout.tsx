'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Lock, Tag, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'
import { SWR_KEYS } from '@/lib/swr'
import { formatCurrency } from '@/lib/utils'
import { celebrate } from '@/lib/confetti'
import { createMetaEventId, sendMetaConversion, trackMetaEvent } from '@/lib/analytics/meta-client'
import type { PlanId } from '@/lib/plans'

export interface CheckoutInfo {
  clientSecret: string
  publishableKey: string | null
  amount: number | null
  totalAmount: number | null
  discountAmount?: number | null
  currency: string
  recurringInterval: string | null
  isPaymentRequired: boolean
  seats?: number | null
  productName: string | null
  customerEmail: string | null
  metaPurchaseEventId?: string | null
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      <span className={bold ? 'font-semibold' : muted ? 'text-muted-foreground' : 'text-foreground'}>{value}</span>
    </div>
  )
}

/**
 * Custom 2-column checkout in our design system. Left = order summary + discount
 * code; right = email + Stripe PaymentElement (the only PCI-safe card field).
 * Confirms via our /confirm route (Polar clientConfirm) + handles 3-D Secure.
 *
 * Applying a discount hits /discount (Polar clientUpdate), refreshes the totals,
 * and — when a code drops the total to $0 — flips the Elements into setup mode.
 * Elements is keyed on (mode, total) so it remounts cleanly when either changes.
 */
export function CustomCheckout({
  open,
  onOpenChange,
  info,
  orgId,
  plan,
  planLabel,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: CheckoutInfo | null
  orgId: string
  plan: PlanId
  planLabel: string
  onSuccess?: () => void
}) {
  // Live copy of the checkout that discount updates mutate (info is the initial fetch).
  const [liveInfo, setLiveInfo] = useState<CheckoutInfo | null>(info)
  const [code, setCode] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [discountErr, setDiscountErr] = useState<string | null>(null)

  // Reset everything when a new checkout opens (new info reference).
  useEffect(() => {
    setLiveInfo(info)
    setCode('')
    setAppliedCode(null)
    setDiscountErr(null)
  }, [info])

  const publishableKey = liveInfo?.publishableKey ?? null
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey])
  const theme: 'stripe' | 'night' =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'night' : 'stripe'

  const amount = liveInfo?.totalAmount ?? liveInfo?.amount ?? 0
  const currency = liveInfo?.currency ?? 'usd'
  const discountAmount = liveInfo?.discountAmount ?? 0
  const checkoutTrackedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!liveInfo?.clientSecret || checkoutTrackedRef.current === liveInfo.clientSecret) return
    checkoutTrackedRef.current = liveInfo.clientSecret
    trackMetaEvent('InitiateCheckout', {
      content_name: liveInfo.productName ?? planLabel,
      content_category: plan,
      content_ids: [`veritio_${plan}_${liveInfo.recurringInterval ?? 'month'}`],
      content_type: 'subscription',
      value: amount / 100,
      currency: currency.toUpperCase(),
    })
  }, [amount, currency, liveInfo?.clientSecret, liveInfo?.productName, liveInfo?.recurringInterval, plan, planLabel])

  // Setup mode (SetupIntent) only when Polar requires no immediate charge —
  // e.g. a 100%-off discount. Paid subscriptions need 'subscription' mode.
  const setupOnly = liveInfo ? liveInfo.isPaymentRequired === false : false

  const elementsOptions = setupOnly
    ? ({ mode: 'setup', currency, paymentMethodCreation: 'manual', appearance: { theme } } as const)
    : ({ mode: 'subscription', amount, currency, paymentMethodCreation: 'manual', appearance: { theme } } as const)

  async function applyDiscount(next: string | null) {
    if (!liveInfo) return
    setApplying(true)
    setDiscountErr(null)
    try {
      const res = await fetch('/api/billing/polar/discount', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSecret: liveInfo.clientSecret, code: next }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        amount?: number
        discountAmount?: number
        totalAmount?: number
        currency?: string
        isPaymentRequired?: boolean
        discountApplied?: boolean
        error?: string
      }
      if (!res.ok) {
        setDiscountErr(data?.error ?? "Couldn't apply that code.")
        return
      }
      setLiveInfo({
        ...liveInfo,
        amount: data.amount ?? liveInfo.amount,
        discountAmount: data.discountAmount ?? 0,
        totalAmount: data.totalAmount ?? data.amount ?? liveInfo.totalAmount,
        currency: data.currency ?? liveInfo.currency,
        isPaymentRequired: data.isPaymentRequired ?? liveInfo.isPaymentRequired,
      })
      if (data.discountApplied) {
        setAppliedCode(next)
      } else {
        setAppliedCode(null)
        if (next) setDiscountErr("That code didn't apply to this plan.")
      }
      if (!next) setCode('')
    } catch {
      setDiscountErr("Couldn't apply that code. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 duration-300 ease-out data-open:slide-in-from-bottom-2 data-closed:slide-out-to-bottom-2">
        <DialogTitle className="sr-only">Checkout</DialogTitle>
        <div className="grid md:grid-cols-[1fr_1.15fr]">
          {/* Order summary */}
          <div className="border-b bg-muted/40 p-6 md:border-b-0 md:border-r">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subscribing to</p>
            <p className="mt-1 text-lg font-semibold">{liveInfo?.productName ?? planLabel ?? 'Plan'}</p>
            <div className="mt-6 space-y-2 text-sm">
              {liveInfo?.seats ? <Row label="Seats" value={String(liveInfo.seats)} /> : null}
              <Row label="Subtotal" value={formatCurrency(liveInfo?.amount ?? amount, currency)} />
              {discountAmount > 0 && (
                <Row
                  label={appliedCode ? `Discount (${appliedCode})` : 'Discount'}
                  value={`-${formatCurrency(discountAmount, currency)}`}
                />
              )}
              <Row label="Tax" value="Calculated at payment" muted />
              <Separator className="my-2" />
              <Row
                label="Total"
                value={`${formatCurrency(amount, currency)}${liveInfo?.recurringInterval ? `/${liveInfo.recurringInterval === 'year' ? 'yr' : 'mo'}` : ''}`}
                bold
              />
            </div>

            {/* Discount code */}
            <div className="mt-5">
              {appliedCode ? (
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Tag className="h-3.5 w-3.5 text-green-600" />
                    {appliedCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => applyDiscount(null)}
                    disabled={applying}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (code.trim()) applyDiscount(code.trim())
                      }
                    }}
                    placeholder="Discount code"
                    className="h-9"
                    disabled={applying || !liveInfo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => applyDiscount(code.trim())}
                    disabled={applying || !code.trim() || !liveInfo}
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}
              {discountErr && <p className="mt-1.5 text-xs text-destructive">{discountErr}</p>}
            </div>

            <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Secure payment · cancel anytime
            </p>
          </div>

          {/* Payment */}
          <div className="p-6">
            <h2 className="text-base font-semibold">Payment details</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {setupOnly ? 'Confirm your details to start your subscription.' : 'Enter your card to start your subscription.'}
            </p>
            {!liveInfo || !stripePromise ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-28 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ) : (
              <Elements
                stripe={stripePromise}
                options={elementsOptions}
                // Remount when the mode (setup vs subscription) or total changes,
                // so Stripe always sees a consistent amount/mode after a discount.
                key={`${setupOnly ? 'setup' : 'sub'}-${amount}`}
              >
                <PayForm
                  info={liveInfo}
                  amount={amount}
                  currency={currency}
                  orgId={orgId}
                  plan={plan}
                  onSuccess={() => {
                    onOpenChange(false)
                    onSuccess?.()
                  }}
                />
              </Elements>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PayForm({
  info,
  amount,
  currency,
  orgId,
  plan,
  onSuccess,
}: {
  info: CheckoutInfo
  amount: number
  currency: string
  orgId: string
  plan: PlanId
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { mutate } = useSWRConfig()
  const [email, setEmail] = useState(info.customerEmail ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setErr(null)
    try {
      const { error: subErr } = await elements.submit()
      if (subErr) {
        setErr(subErr.message ?? 'Please check your card details')
        setBusy(false)
        return
      }
      const { confirmationToken, error: tokErr } = await stripe.createConfirmationToken({ elements })
      if (tokErr || !confirmationToken) {
        setErr(tokErr?.message ?? 'Could not process your card')
        setBusy(false)
        return
      }
      // Polar requires the billing address (at least country) on confirm — pull it
      // from the billing details the PaymentElement captured.
      const billing = (confirmationToken as unknown as { payment_method_preview?: { billing_details?: { name?: string | null; address?: Record<string, string | null> } } })
        .payment_method_preview?.billing_details
      const a = billing?.address ?? {}
      if (!a.country) {
        setErr('Please select your country.')
        setBusy(false)
        return
      }
      const res = await fetch('/api/billing/polar/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSecret: info.clientSecret,
          confirmationTokenId: confirmationToken.id,
          email,
          billingName: billing?.name ?? null,
          billingAddress: {
            country: a.country,
            line1: a.line1 ?? null,
            line2: a.line2 ?? null,
            city: a.city ?? null,
            state: a.state ?? null,
            postalCode: a.postal_code ?? null,
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { status?: string; piClientSecret?: string; error?: string }
      if (!res.ok) {
        setErr(data?.error ?? 'Payment failed')
        setBusy(false)
        return
      }
      // Complete any required card authentication. This must run even when the
      // checkout status is already 'confirmed': the PaymentIntent can still need
      // client-side action (3-D Secure, or the RBI e-mandate for Indian cards) to
      // actually charge and create the subscription. handleNextAction is a no-op
      // when nothing is required.
      if (data.piClientSecret) {
        const { error: naErr } = await stripe.handleNextAction({ clientSecret: data.piClientSecret })
        if (naErr) {
          setErr(naErr.message ?? 'Card authentication failed')
          setBusy(false)
          return
        }
      } else if (data.status !== 'confirmed') {
        setErr(`Payment didn't complete (status: ${data.status ?? 'unknown'}). Please try again.`)
        setBusy(false)
        return
      }
      // Optimistically flip this org to the new active plan in the org-list cache so
      // the sidebar card + badge update instantly (no reload), then revalidate to
      // confirm against the server (which the confirm route already updated).
      void mutate(
        SWR_KEYS.organizations,
        (orgs: unknown) =>
          Array.isArray(orgs)
            ? orgs.map((o) =>
                (o as { id?: string })?.id === orgId
                  ? { ...(o as object), plan, plan_status: 'active', trial_ends_at: null }
                  : o,
              )
            : orgs,
        { revalidate: true },
      )
      void celebrate()
      const metaPurchaseEventId = info.metaPurchaseEventId || createMetaEventId('Purchase')
      const metaPurchaseData = {
        content_name: info.productName ?? plan,
        content_category: plan,
        content_ids: [`veritio_${plan}_${info.recurringInterval ?? 'month'}`],
        content_type: 'subscription',
        value: amount / 100,
        currency: currency.toUpperCase(),
      }
      trackMetaEvent('Purchase', metaPurchaseData, metaPurchaseEventId)
      void sendMetaConversion({
        eventName: 'Purchase',
        eventId: metaPurchaseEventId,
        email,
        externalId: orgId,
        eventSourceUrl: window.location.href,
        customData: metaPurchaseData,
      })
      toast.success('Subscription activated')
      onSuccess()
    } catch {
      setErr('Payment could not be completed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ck-email">Email</Label>
        <Input
          id="ck-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || busy}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : amount > 0 ? (
          `Subscribe · ${formatCurrency(amount, currency)}`
        ) : (
          'Start subscription'
        )}
      </Button>
    </form>
  )
}
