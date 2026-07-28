'use client'

import { memo } from 'react'
import { Eye } from 'lucide-react'
import { PreviewDeviceToggle } from '../preview-device-toggle'

export const PreviewBanner = memo(function PreviewBanner() {
  return (
    <div className="shrink-0 bg-slate-100 border-b border-slate-200 text-slate-700 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-slate-500" />
          <span>This is a study preview. No data will be saved.</span>
        </div>
        <PreviewDeviceToggle />
      </div>
    </div>
  )
})
