export interface ComparisonSource {
  label: string
  url: `https://${string}`
}

export interface ComparisonRow {
  criterion: string
  veritio: string
  competitor: string
}

export interface CompetitorComparisonDefinition {
  slug: 'maze' | 'optimal-workshop'
  name: string
  reviewedAt: '2026-09-13'
  summary: string
  rows: readonly ComparisonRow[]
  sources: readonly ComparisonSource[]
}

export const competitorComparisons: readonly CompetitorComparisonDefinition[] = [
  {
    slug: 'maze',
    name: 'Maze',
    reviewedAt: '2026-09-13',
    summary:
      'Compare deployment control, information-architecture methods, live testing, and MCP access without treating either product as a universal replacement.',
    rows: [
      {
        criterion: 'Deployment and source access',
        veritio: 'AGPL-3.0 application source with hosted and self-hosted operating paths.',
        competitor: 'Maze documents its platform on AWS us-east-1 and describes its website-testing script as closed-source.',
      },
      {
        criterion: 'Card sorting',
        veritio: 'Open, closed, and hybrid card sorts.',
        competitor: 'Maze documents open and closed card sorts and says hybrid is not currently supported.',
      },
      {
        criterion: 'Research breadth',
        veritio: 'Seven unmoderated methods in the same repository and workflow.',
        competitor: 'Maze lists moderated interviews, participant recruitment, mobile testing, and AI research capabilities beyond Veritio’s current scope.',
      },
      {
        criterion: 'MCP',
        veritio: 'Read and write tools share the REST authorization core; launch remains an explicit confirmed operation.',
        competitor: 'Maze documents a hosted, read-only MCP connection governed by workspace permissions.',
      },
    ],
    sources: [
      { label: 'Maze pricing and feature comparison', url: 'https://maze.co/pricing/' },
      { label: 'Maze card sorting documentation', url: 'https://help.maze.co/articles/2331219613-have-testers-categorize-information-using-card-sorting' },
      { label: 'Maze data hosting documentation', url: 'https://help.maze.co/articles/7525747599-where-does-maze-store-data' },
      { label: 'Maze website-test security FAQ', url: 'https://help.maze.co/articles/3136380208-website-test-security-and-performance-faqs' },
      { label: 'Maze MCP data and privacy', url: 'https://help.maze.co/articles/5736723999-maze-mcp-data-privacy' },
    ],
  },
  {
    slug: 'optimal-workshop',
    name: 'Optimal Workshop',
    reviewedAt: '2026-09-13',
    summary:
      'Compare infrastructure control and current method coverage while recognizing Optimal’s managed security, recruitment, and research-service capabilities.',
    rows: [
      {
        criterion: 'Deployment and source access',
        veritio: 'AGPL-3.0 application source with hosted and self-hosted operating paths.',
        competitor: 'Optimal describes a multi-tenant cloud service and data hosted on AWS in the United States.',
      },
      {
        criterion: 'Research methods',
        veritio: 'Card sorting, tree testing, surveys, prototype, first-click, first-impression, and live website testing.',
        competitor: 'Optimal lists overlapping IA and usability methods plus interviews, recruitment, recordings, and qualitative capabilities.',
      },
      {
        criterion: 'Operational responsibility',
        veritio: 'Self-hosters manage Supabase, secrets, updates, backups, monitoring, and optional providers.',
        competitor: 'Optimal publishes managed-service controls including ISO certifications, SOC 2 Type II, encryption, and annual penetration testing.',
      },
      {
        criterion: 'Best fit',
        veritio: 'Teams prioritizing inspectable code, infrastructure choice, and avoiding a single hosted-only path.',
        competitor: 'Teams prioritizing a managed vendor, formal assurance material, participant recruitment, and broader research services.',
      },
    ],
    sources: [
      { label: 'Optimal pricing and features', url: 'https://www.optimalworkshop.com/pricing' },
      { label: 'Optimal plan comparison', url: 'https://support.optimalworkshop.com/en/articles/2626911-the-difference-between-optimal-s-paid-subscription-plans' },
      { label: 'Optimal Security Center', url: 'https://www.optimalworkshop.com/security-center' },
    ],
  },
] as const

export function findCompetitorComparison(slug: string) {
  return competitorComparisons.find((comparison) => comparison.slug === slug)
}
