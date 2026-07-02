'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { SWR_KEYS } from '@/lib/swr'
import { celebrate } from '@/lib/confetti'

export function RedeemForm({ prefill }: { prefill?: string }) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const [code, setCode] = useState(prefill ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/billing/redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; planLabel?: string; error?: string }
      if (!res.ok || !data.ok) {
        setErr(data?.error ?? 'Could not redeem this code.')
        setBusy(false)
        return
      }
      void mutate(SWR_KEYS.organizations)
      void celebrate()
      toast.success(`${data.planLabel ?? 'Lifetime'} unlocked`)
      setDone(data.planLabel ?? 'Lifetime')
    } catch {
      setErr('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {done} is now active on your workspace. Pay once, yours for life.
        </p>
        <Button className="w-full" onClick={() => router.replace('/')}>
          Go to dashboard
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="VRT-XXXXX-XXXXX-XXXXX"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="font-mono tracking-wide"
      />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={!code.trim() || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem code'}
      </Button>
    </form>
  )
}
