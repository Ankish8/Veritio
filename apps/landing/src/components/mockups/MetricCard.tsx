interface MetricCardProps {
  value: string
  label: string
  color?: string
  trend?: 'up' | 'down'
}

export default function MetricCard({ value, label, color, trend }: MetricCardProps) {
  return (
    <div className="mc-card">
      <div className="mc-value" style={color ? { color } : undefined}>
        {value}
        {trend && (
          <span className={`mc-trend ${trend}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {trend === 'up'
                ? <path d="M18 15l-6-6-6 6" />
                : <path d="M6 9l6 6 6-6" />}
            </svg>
          </span>
        )}
      </div>
      <div className="mc-label">{label}</div>
    </div>
  )
}
