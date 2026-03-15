'use client'

import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "../utils/cn"

export interface BrowserFrameProps extends HTMLAttributes<HTMLDivElement> {
  url?: string
  children?: ReactNode
  showPreviewBadge?: boolean
}
export function BrowserFrame({
  url = "veritio.io",
  children,
  className,
  showPreviewBadge = false,
  ...props
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white shadow-lg overflow-hidden flex flex-col",
        className
      )}
      {...props}
    >
      {/* Browser Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-100 border-b border-border">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-md border border-border text-xs text-muted-foreground">
            <svg
              className="w-3 h-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>{url}</span>
          </div>
        </div>

        {/* Right slot: preview badge or spacer */}
        {showPreviewBadge ? (
          <div className="px-1.5 py-0.5 rounded text-[12px] font-medium tracking-wide bg-stone-200 text-stone-500 uppercase select-none">
            Preview
          </div>
        ) : (
          <div className="w-[52px]" />
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-stone-50">
        {children}
      </div>
    </div>
  )
}
