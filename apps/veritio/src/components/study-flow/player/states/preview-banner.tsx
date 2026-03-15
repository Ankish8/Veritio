'use client'

import { memo } from 'react'
import { Eye } from 'lucide-react'

export const PreviewBanner = memo(function PreviewBanner() {
  return (
    <div className="bg-slate-100 border-b border-slate-200 text-slate-700 px-4 py-2.5 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <Eye className="h-4 w-4 text-slate-500" />
        <span>This is a study preview. No data will be saved.</span>
      </div>
    </div>
  )
})
