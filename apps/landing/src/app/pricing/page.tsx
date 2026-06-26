import type { Metadata } from 'next'
import { Fragment } from 'react'
import GuideLines from '@/components/GuideLines'
import PricingCards from '@/components/home/PricingCards'

export const metadata: Metadata = {
  title: 'Pricing | Veritio',
  description:
    'Simple, transparent pricing with no per-response or per-participant fees. All study types on every plan. Compare Starter, Pro, and Team.',
}

const COLS = ['Starter', 'Pro', 'Team']

type Cell = boolean | string
type Row = { label: string; values: Cell[] }
type Group = { title: string; rows: Row[] }

const T = true
const F = false

const GROUPS: Group[] = [
  {
    title: 'Usage & limits',
    rows: [
      { label: 'Price', values: ['$19/mo', '$39/mo', '$89/mo'] },
      { label: 'Free trial', values: ['7 days', '7 days', '7 days'] },
      { label: 'Responses per study', values: ['50', '100', '100'] },
      { label: 'Active studies', values: ['5', 'Unlimited', 'Unlimited'] },
      { label: 'Team members', values: ['1', '1', '3 (+$39/seat)'] },
      { label: 'AI analysis — bring your own key (BYOK)', values: [F, T, T] },
      { label: 'Session recordings & clips', values: [F, T, T] },
    ],
  },
  {
    title: 'Study types — included on every plan',
    rows: [
      { label: 'Web app test', values: [T, T, T] },
      { label: 'Prototype test', values: [T, T, T] },
      { label: 'Survey', values: [T, T, T] },
      { label: 'Card sort', values: [T, T, T] },
      { label: 'Tree test', values: [T, T, T] },
      { label: 'First-click test', values: [T, T, T] },
      { label: 'First-impression test', values: [T, T, T] },
    ],
  },
  {
    title: 'Build',
    rows: [
      { label: '14+ question types', values: [T, T, T] },
      { label: 'Branching, logic & scoring', values: [T, T, T] },
      { label: 'Screening, quotas & auto-close', values: [T, T, T] },
      { label: 'Custom branding (logo & colors)', values: [T, T, T] },
    ],
  },
  {
    title: 'Analysis',
    rows: [
      { label: 'Method-specific analysis (matrices, click maps, pathways)', values: [T, T, T] },
      { label: 'Segmentation & saved segments', values: [T, T, T] },
      { label: 'Cross-tab significance testing', values: [T, T, T] },
      { label: 'Heatmaps & click maps', values: [T, T, T] },
      { label: 'AI insights, themes & summaries (BYOK)', values: [F, T, T] },
      { label: 'AI follow-up probing (BYOK)', values: [F, T, T] },
    ],
  },
  {
    title: 'Collaborate & share',
    rows: [
      { label: 'Share via link, PDF & CSV', values: [T, T, T] },
      { label: 'Password & expiry on shared links', values: [T, T, T] },
      { label: 'Real-time co-editing', values: [F, F, T] },
      { label: 'Roles & permissions', values: [F, F, T] },
      { label: 'Shared research repository', values: [F, F, T] },
      { label: 'Comments', values: [F, F, T] },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Email support', values: [T, T, T] },
      { label: 'Priority support', values: [F, F, T] },
    ],
  },
]

function Cell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="pr-check" aria-label="Included">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><path d="M5 12l5 5L20 6" /></svg>
      </span>
    )
  }
  if (value === false) return <span className="pr-dash" aria-label="Not included">–</span>
  return <span className="pr-val">{value}</span>
}

export default function PricingPage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> Pricing</div>
          <h1 className="page-title">Simple pricing, no per-response fees</h1>
          <p className="page-subtitle">
            Every plan includes all study types. You bring your own participants, so you
            never pay per response or per participant. Start with a 7-day free trial.
          </p>
        </div>
      </section>

      <section className="pricing-section">
        <GuideLines />
        <div className="pricing-container">
          <PricingCards />
        </div>
      </section>

      <section className="pr-compare" id="comparison">
        <div className="pr-compare-inner">
          <h2 className="pr-compare-heading">Compare every plan</h2>
          <div className="pr-table-scroll">
            <table className="pr-table">
              <thead>
                <tr>
                  <th className="pr-th-feature"></th>
                  {COLS.map((c) => (
                    <th key={c} className={`pr-th${c === 'Pro' ? ' pr-th-hl' : ''}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => (
                  <Fragment key={g.title}>
                    <tr className="pr-group-row">
                      <td colSpan={COLS.length + 1}>{g.title}</td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr className="pr-row" key={r.label}>
                        <td className="pr-feature">{r.label}</td>
                        {r.values.map((v, i) => (
                          <td key={i} className={`pr-cell${COLS[i] === 'Pro' ? ' pr-cell-hl' : ''}`}><Cell value={v} /></td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}
