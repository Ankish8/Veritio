/**
 * Education page icon set.
 *
 * Follows the same rules as `AnimatedIcons.tsx`: bare 24x24 stroke geometry at
 * weight 1.5 in --text-primary, no container or chip, and the shared
 * `animated-icon` sub-part classes (`icon-accent`, `icon-line`, `icon-rect`) so
 * each icon inherits the global idle animation and the card-hover behaviour
 * defined in home.css.
 *
 * Where an icon represents a study type, the geometry is copied from the home
 * page tab icons in `home/constants.tsx` so a card sort looks like a card sort
 * everywhere on the site.
 */

const base = {
  width: 26,
  height: 27,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: '#210D02',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'animated-icon',
}

/* Survey: a response list with varied answer controls. */
export function SurveyIcon() {
  return (
    <svg {...base}>
      <circle cx="4.5" cy="5.5" r="1.5" className="icon-rect" style={{ animationDelay: '0s' }} />
      <path d="M9 5.5h12" />
      <rect x="3" y="10.5" width="3" height="3" rx="0.6" className="icon-rect" style={{ animationDelay: '.25s' }} />
      <path d="M9 12h12" />
      <path d="M3 18l1.2 1.2 2.2-2.4" className="icon-rect" style={{ animationDelay: '.5s' }} />
      <path d="M9 18.5h12" />
    </svg>
  )
}

/* Card sort: the four-square grid used by the home page tab. */
export function CardSortIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="3" width="7" height="7" rx="1" className="icon-rect" style={{ animationDelay: '0s' }} />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" className="icon-rect" style={{ animationDelay: '.4s' }} />
    </svg>
  )
}

/* Tree test: the node tree used by the home page tab. */
export function TreeTestIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4M12 11 6 15M12 11l6 4" className="icon-line" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" className="icon-accent" />
    </svg>
  )
}

/* Usability: the first-click target used by the home page tab. */
export function ClickIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" className="icon-accent" />
      <circle cx="12" cy="12" r="8" strokeDasharray="4 3" />
    </svg>
  )
}

/* First impression: the eye used by the home page tab. */
export function EyeIcon() {
  return (
    <svg {...base}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" className="icon-accent" />
    </svg>
  )
}

/* Results: a bar chart. */
export function ChartIcon() {
  return (
    <svg {...base}>
      <path d="M2.5 20.5h19" />
      <path d="M6 20.5V13" className="icon-line" style={{ animationDelay: '0s' }} />
      <path d="M11.5 20.5V4.5" className="icon-line" style={{ animationDelay: '.2s' }} />
      <path d="M17 20.5v-5.5" className="icon-line" style={{ animationDelay: '.4s' }} />
      <circle cx="11.5" cy="4.5" r="1.4" className="icon-accent" />
    </svg>
  )
}

/* Statistics: a sigma, for the "shows its working" argument. */
export function SigmaIcon() {
  return (
    <svg {...base}>
      <path d="M17.5 5.5H6.5l5.5 6.5-5.5 6.5h11" />
      <circle cx="19" cy="5" r="1.4" className="icon-accent" />
    </svg>
  )
}

/* A cohort of students. */
export function CohortIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1.4A5.6 5.6 0 0 1 8.6 13h.8a5.6 5.6 0 0 1 5.6 5.6V20" />
      <path d="M16.5 6.6a3 3 0 0 1 0 5.8M17.5 14.4A5 5 0 0 1 21 19v1" className="icon-line" />
    </svg>
  )
}

/* Budget and procurement. */
export function BudgetIcon() {
  return (
    <svg {...base}>
      <rect x="2.5" y="6.5" width="19" height="13" rx="1.6" />
      <path d="M2.5 11h19" className="icon-line" />
      <circle cx="17.5" cy="15.5" r="1.4" className="icon-accent" />
    </svg>
  )
}

/* Term dates. */
export function TermIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="1.6" />
      <path d="M3.5 10h17" className="icon-line" />
      <path d="M8 3.5v4M16 3.5v4" />
      <rect x="7" y="13" width="3" height="3" rx="0.6" className="icon-rect" />
    </svg>
  )
}

/* Open source: read the code. */
export function CodeIcon() {
  return (
    <svg {...base}>
      <path d="M8.5 8 4.5 12l4 4" />
      <path d="M15.5 8l4 4-4 4" />
      <path d="M13.2 5.5l-2.4 13" className="icon-line" />
    </svg>
  )
}

