'use client'


import { Check } from 'lucide-react'
import { TAG_COLORS } from '@/types/response-tags'

interface TagColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function TagColorPicker({ value, onChange }: TagColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`
            w-7 h-7 rounded-full transition-all
            flex items-center justify-center
            hover:scale-110 hover:ring-2 hover:ring-offset-2
            ${value === color ? 'ring-2 ring-offset-2' : ''}
          `}
          style={{
            backgroundColor: color,
            '--tw-ring-color': color,
          } as React.CSSProperties}
          onClick={() => onChange(color)}
        >
          {value === color && (
            <Check className="h-4 w-4 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  )
}
