'use client'

import useSWR from 'swr'
import type { BillingSummary, BillingInvoice } from '@/lib/billing/polar-data'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : Promise.reject(r)))

/**
 * Live billing data for an org from Polar (subscription, customer, payment method, invoices).
 * Separate from useCurrentPlan() which reads the locally-cached plan fields.
 */
export function useBillingDetails(orgId?: string | null) {
  const { data: summary, isLoading: loadingSummary, mutate: mutateSummary } = useSWR<BillingSummary>(
    orgId ? `/api/billing/polar/summary?orgId=${orgId}` : null,
    fetcher,
  )
  const { data: invoicesData, isLoading: loadingInvoices, mutate: mutateInvoices } = useSWR<{
    invoices: BillingInvoice[]
  }>(orgId ? `/api/billing/polar/invoices?orgId=${orgId}` : null, fetcher)

  return {
    summary: summary ?? null,
    invoices: invoicesData?.invoices ?? [],
    isLoading: loadingSummary || loadingInvoices,
    refresh: () => {
      void mutateSummary()
      void mutateInvoices()
    },
  }
}
