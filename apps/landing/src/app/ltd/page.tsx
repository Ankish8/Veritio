import type { Metadata } from 'next'
import LTDPage from '@/components/LTDPage'

export const metadata: Metadata = {
  title: 'Veritio Lifetime Deal: Pay Once, Research Forever',
  description:
    'Own Veritio for life with a one-time payment. Run usability tests, card sorts, tree tests, and surveys with AI insights, no subscription and no per-response fees. Lifetime tiers from $49.',
}

export default function Page() {
  return <LTDPage />
}
