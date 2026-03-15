/**
 * Stat card component for displaying individual statistics.
 * Used by: numerical-visualization, slider-visualization
 */

interface StatCardProps {
  label: string
  value: string
  variant?: 'default' | 'warning' | 'highlight'
}

export function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  const valueClassName = variant === 'warning' && value !== '0'
    ? 'text-orange-600'
    : variant === 'highlight'
      ? 'text-primary'
      : ''

  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueClassName}`}>{value}</p>
    </div>
  )
}
