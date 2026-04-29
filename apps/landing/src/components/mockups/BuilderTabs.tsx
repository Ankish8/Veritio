interface BuilderTabsProps {
  tabs?: string[]
  activeTab?: string
}

export default function BuilderTabs({
  tabs = ['Details', 'Content', 'Study Flow', 'Settings', 'Branding'],
  activeTab = 'Content',
}: BuilderTabsProps) {
  return (
    <div className="hm-tabs-bar">
      {tabs.map((tab) => (
        <div key={tab} className={`hm-tab${tab === activeTab ? ' active' : ''}`}>{tab}</div>
      ))}
    </div>
  )
}
