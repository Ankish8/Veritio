interface BuilderHeaderProps {
  title?: string
  status?: string
  showPreview?: boolean
  showLaunch?: boolean
}

export default function BuilderHeader({
  title = 'Navigation Card Sort',
  status = 'All changes saved',
  showPreview = true,
  showLaunch = true,
}: BuilderHeaderProps) {
  return (
    <div className="builder-header">
      <div className="bh-left">
        <div className="bh-title">{title}</div>
      </div>
      <div className="bh-right">
        <div className="bh-status">{status}</div>
        {showPreview && <div className="bh-btn">Preview</div>}
        {showLaunch && <div className="bh-btn primary">Launch</div>}
      </div>
    </div>
  )
}
