export function SmartAssistIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" className="animated-icon">
      <circle cx="12" cy="12" r="3" className="icon-accent" />
      <g className="icon-rotate">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </g>
    </svg>
  )
}

export function AutoTasksIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" className="animated-icon">
      {[
        { x: 3, y: 3 }, { x: 14, y: 3 },
        { x: 3, y: 14 }, { x: 14, y: 14 }
      ].map((rect, i) => (
        <rect key={i} x={rect.x} y={rect.y} width="7" height="7" rx="1" className="icon-rect" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </svg>
  )
}

export function InstantAnswersIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" className="animated-icon">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" className="icon-bolt" />
    </svg>
  )
}

export function AIInsightsIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" className="animated-icon">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" className="icon-circle" />
      <path d="M22 4L12 14.01l-3-3" className="icon-check" />
    </svg>
  )
}

export function WorkflowEngineIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" className="animated-icon">
      <path d="M6 3v18" />
      <path d="M18 3v18" />
      {[8, 12, 16].map((y, i) => (
        <path key={i} d={`M6 ${y}h12`} className="icon-line" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </svg>
  )
}

export function AnalyticsHubIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 24 24" fill="none" stroke="#210D02" strokeWidth="1.5" className="animated-icon">
      <path d="M12 2L2 7l10 5 10-5-10-5z" className="icon-layer-top" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" className="icon-layer-bottom" />
    </svg>
  )
}
