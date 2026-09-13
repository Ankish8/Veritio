import ArrowIcon from '@/components/ArrowIcon'
import {
  findMarketingRoute,
  isRepositoryPublic,
  marketingCtas,
  type MarketingRoute,
} from '@veritio/marketing-routes'

export default function OpenSourceCtas({ path }: { path: MarketingRoute['path'] }) {
  const repositoryPublic = isRepositoryPublic()
  const ctas = marketingCtas(findMarketingRoute(path), repositoryPublic)

  return (
    <div className="security-actions">
      {ctas.map((cta) => (
        <a
          key={cta.kind}
          href={cta.href}
          className={`security-button ${
            cta.kind === 'hosted' ? 'security-button-primary' : 'security-button-secondary'
          }`}
        >
          {cta.label} {cta.kind === 'hosted' ? <ArrowIcon size={17} /> : null}
        </a>
      ))}
      {!repositoryPublic && (
        <span className="security-button security-button-secondary" aria-disabled="true">
          Repository access opens at launch
        </span>
      )}
    </div>
  )
}
