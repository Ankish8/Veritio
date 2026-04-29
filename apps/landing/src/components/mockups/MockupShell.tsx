interface MockupShellProps {
  url?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export default function MockupShell({ url = 'app.veritio.com', children, actions, className = '' }: MockupShellProps) {
  return (
    <div className={`hero-mockup ${className}`}>
      <div className="hm-toolbar">
        <div className="dots"><span></span><span></span><span></span></div>
        <div className="url-bar">{url}</div>
        {actions && <div className="hm-toolbar-actions">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
