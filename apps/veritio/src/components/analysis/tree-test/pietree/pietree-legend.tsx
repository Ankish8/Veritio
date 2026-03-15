'use client'

interface LegendItem {
  color: string
  label: string
}

const PIES_LEGEND: LegendItem[] = [
  { color: '#22c55e', label: 'Went down the correct path' },    // green-500
  { color: '#ef4444', label: 'Went down the incorrect path' },  // red-500
  { color: '#0ea5e9', label: 'Went back' },                     // sky-500
  { color: '#eab308', label: 'Nominated as the correct destination' }, // yellow-500
  { color: '#a8a29e', label: 'Skipped task' },                  // stone-400
]

const LINES_LEGEND: LegendItem[] = [
  { color: '#22c55e', label: 'Correct path' },   // green-500
  { color: '#d6d3d1', label: 'Incorrect path' }, // stone-300
]

interface PietreeLegendProps {
  className?: string
}

export function PietreeLegend({ className }: PietreeLegendProps) {
  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Pies Section */}
      <div>
        <h4 className="text-sm font-medium text-stone-700 mb-2">Pies</h4>
        <div className="space-y-1.5">
          {PIES_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-stone-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lines Section */}
      <div>
        <h4 className="text-sm font-medium text-stone-700 mb-2">Lines</h4>
        <div className="space-y-1.5">
          {LINES_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-stone-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
