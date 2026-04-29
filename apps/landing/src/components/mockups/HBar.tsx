interface HBarProps {
  label: string
  percent: number
  color?: string
}

export default function HBar({ label, percent, color = 'var(--accent)' }: HBarProps) {
  return (
    <div className="rm-bar-row">
      <div className="rm-bar-label">{label}</div>
      <div className="rm-bar-track">
        <div className="rm-bar-fill" style={{ width: `${percent}%`, background: color }}></div>
      </div>
      <div className="rm-bar-val">{percent}%</div>
    </div>
  )
}
