export const CHART_DATA = [
  { month: 'Jan', bars: [0.28, 0.22, 0.18, 0.25] },
  { month: 'Feb', bars: [0.15, 0.35, 0.12, 0.30] },
  { month: 'Mar', bars: [0.32, 0.18, 0.28, 0.15] },
  { month: 'Apr', bars: [0.20, 0.30, 0.15, 0.22] },
  { month: 'May', bars: [0.38, 0.12, 0.25, 0.18] },
  { month: 'Jun', bars: [0.25, 0.28, 0.20, 0.28] },
]

export const TABS = [
  { id: 'web-app', label: 'Web App Test', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg> },
  { id: 'website-prototype', label: 'Prototype Test', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="9" x2="22" y2="9" /><circle cx="5" cy="6.5" r="0.6" fill="currentColor" /></svg> },
  { id: 'survey', label: 'Survey', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg> },
  { id: 'card-sort', label: 'Card Sort', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
  { id: 'tree-test', label: 'Tree Test', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="12" y1="11" x2="6" y2="15" /><line x1="12" y1="11" x2="18" y2="15" /><circle cx="6" cy="17" r="2" /><circle cx="18" cy="17" r="2" /></svg> },
  { id: 'first-click', label: 'First-Click', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" strokeDasharray="4 3" /></svg> },
  { id: 'first-impression', label: 'First Impression', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg> },
] as const
