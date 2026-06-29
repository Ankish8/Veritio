// AI follow-up questions — sparkle
export function SmartAssistIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" strokeLinejoin="round" className="animated-icon">
      <path d="M12 3l2.1 6.4L20.5 11.5 14.1 13.6 12 20 9.9 13.6 3.5 11.5 9.9 9.4z" className="icon-rotate" />
      <circle cx="19" cy="5" r="1.4" className="icon-accent" />
    </svg>
  )
}

// 13 question types — varied option list
export function AutoTasksIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animated-icon">
      <circle cx="4.5" cy="5.5" r="1.5" className="icon-rect" style={{ animationDelay: '0s' }} />
      <path d="M9 5.5h12" />
      <rect x="3" y="10.5" width="3" height="3" rx="0.6" className="icon-rect" style={{ animationDelay: '.25s' }} />
      <path d="M9 12h12" />
      <path d="M3 18l1.2 1.2 2.2-2.4" className="icon-rect" style={{ animationDelay: '.5s' }} />
      <path d="M9 18.5h12" />
    </svg>
  )
}

// Screen, quota, auto-close — funnel
export function InstantAnswersIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animated-icon">
      <path d="M3 4h18l-7 8.2V20l-4-2.2v-5.6z" className="icon-bolt" />
    </svg>
  )
}

// Cross-tab with significance — cross-tabulation table
export function AIInsightsIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" strokeLinejoin="round" className="animated-icon">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" className="icon-line" style={{ animationDelay: '0s' }} />
      <path d="M9 3v18" className="icon-line" style={{ animationDelay: '.3s' }} />
      <rect x="14" y="14" width="3" height="3" rx="0.6" className="icon-accent" />
    </svg>
  )
}

// Branching, logic and scoring — git branch
export function WorkflowEngineIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animated-icon">
      <path d="M6 4v16" />
      <circle cx="6" cy="4" r="2" />
      <circle cx="6" cy="20" r="2" />
      <circle cx="18" cy="9" r="2" className="icon-accent" />
      <path d="M6 13a7 7 0 0 0 7-7h3" className="icon-line" />
    </svg>
  )
}

// Session recording and clips — play in circle
export function AnalyticsHubIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" strokeLinejoin="round" className="animated-icon">
      <circle cx="12" cy="12" r="9" className="icon-circle" />
      <path d="M10 8.5l6 3.5-6 3.5z" className="icon-accent" />
    </svg>
  )
}
