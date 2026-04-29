interface SidebarItem {
  icon: React.ReactNode
  label: string
  active?: boolean
  count?: number
}

interface AppSidebarProps {
  items?: SidebarItem[]
  sectionLabel?: string
  resultsItems?: SidebarItem[]
}

export default function AppSidebar({ items, sectionLabel, resultsItems }: AppSidebarProps) {
  // If custom items provided, use the old rendering
  if (items) {
    return (
      <div className="hm-sidebar">
        <div className="hms-section">
          <div className="hms-label">{sectionLabel || 'Study'}</div>
          {items.map((item, i) => (
            <div key={i} className={`hms-item${item.active ? ' active' : ''}`}>
              {item.icon}
              {item.label}
              {item.count !== undefined && <span className="hms-count">{item.count}</span>}
            </div>
          ))}
        </div>
        {resultsItems && (
          <div className="hms-section">
            <div className="hms-label">Results</div>
            {resultsItems.map((item, i) => (
              <div key={i} className={`hms-item${item.active ? ' active' : ''}`}>
                {item.icon}
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Default: realistic app sidebar
  return (
    <div className="hm-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="hs-logo" style={{ marginBottom: '14px' }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M4 20c3-6 5-14 8-14s5 8 8 14" /></svg>
        <div className="hs-logo-text">
          <span className="hs-logo-name">Veritio</span>
          <span className="hs-logo-sub">Research Tools</span>
        </div>
      </div>
      <div className="hs-org" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid #E4DFF0', borderRadius: '8px', fontSize: '12px', color: 'var(--gray-600)', marginBottom: '14px', background: 'var(--white)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        <span>acme</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginLeft: 'auto', opacity: 0.4 }}><path d="M6 9l6 6 6-6" /></svg>
      </div>
      <div className="hms-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        Home
      </div>
      <div className="hms-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Projects
      </div>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '14px 0 8px', padding: '0 10px' }}>Panel</div>
      <div className="hms-item" style={{ paddingLeft: '20px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" /></svg>
        Participants
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #E4DFF0' }}>
        <div className="hms-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>
          Archive
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', fontSize: '12px', color: 'var(--gray-600)' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--white)', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
          <span>Ankish K.</span>
        </div>
      </div>
    </div>
  )
}
