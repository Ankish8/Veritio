'use client'

import { PIETREE_RENDER_COLORS as COLORS } from './pietree-utils'

export interface TooltipData {
  nodeName: string
  totalVisits: number
  correctPathCount: number
  incorrectPathCount: number
  wentBackCount: number
  nominatedCount: number
  skippedCount: number
}

interface PietreeTooltipProps {
  data: TooltipData
  position: { x: number; y: number }
  visible: boolean
}

export function PietreeTooltip({ data, position, visible }: PietreeTooltipProps) {
  if (!visible) return null

  // Calculate total actions for percentages
  const totalActions =
    data.correctPathCount +
    data.incorrectPathCount +
    data.wentBackCount +
    data.nominatedCount +
    data.skippedCount

  // Format percentage
  const formatPercent = (count: number) => {
    if (totalActions === 0) return '0.0%'
    return ((count / totalActions) * 100).toFixed(1) + '%'
  }

  const rows = [
    { color: COLORS.correctPath, label: 'Correct path', count: data.correctPathCount },
    { color: COLORS.incorrectPath, label: 'Incorrect path', count: data.incorrectPathCount },
    { color: COLORS.wentBack, label: 'Back from here', count: data.wentBackCount },
    { color: COLORS.nominated, label: 'Nominated destination', count: data.nominatedCount },
    { color: COLORS.skipped, label: 'Skip task', count: data.skippedCount },
  ]

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 12,
        top: position.y - 10,
        transform: 'translateY(-50%)',
      }}
    >
      <div className="bg-white rounded-lg shadow-lg border border-stone-200 py-2 px-3 min-w-[200px]">
        {/* Node name header */}
        <div className="font-medium text-stone-900 mb-1">
          {data.nodeName}
        </div>

        {/* Visits summary */}
        <div className="text-xs text-stone-500 mb-2">
          Participants came here {data.totalVisits} {data.totalVisits === 1 ? 'time' : 'times'} and clicked:
        </div>

        {/* Stats table */}
        <table className="w-full text-xs">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-stone-600">{row.label}</span>
                  </div>
                </td>
                <td className="py-0.5 text-right text-stone-700 font-medium w-8">
                  {row.count}
                </td>
                <td className="py-0.5 text-right text-stone-500 w-12">
                  {formatPercent(row.count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
