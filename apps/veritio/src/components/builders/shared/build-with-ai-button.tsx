'use client'

import { Sparkles } from 'lucide-react'

interface BuildWithAIButtonProps {
  studyType: string
}

export function BuildWithAIButton({ studyType }: BuildWithAIButtonProps) {
  return (
    <div className="relative group">
      <div
        className="absolute -inset-[4px] rounded-[12px] opacity-15 blur-xl group-hover:opacity-35 transition-opacity duration-300"
        style={{ background: 'conic-gradient(from 0deg at 50% 50%, #7c3aed, #2563eb, #06b6d4, #10b981, #f59e0b, #ec4899, #7c3aed)' }}
      />
      <div
        className="relative rounded-[8px] p-px z-10"
        style={{ background: 'conic-gradient(from 0deg at 50% 50%, #7c3aed, #2563eb, #06b6d4, #10b981, #f59e0b, #ec4899, #7c3aed)' }}
      >
        <button
          type="button"
          className="group/btn relative overflow-hidden flex h-[30px] items-center gap-1.5 bg-background hover:bg-zinc-900 hover:text-white rounded-[7px] px-3 text-sm font-medium transition-colors cursor-pointer"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-ai-build-content', { detail: { studyType } }))
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full group-hover/btn:animate-[btn-shimmer_0.65s_ease-out_forwards]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)' }}
          />
          <Sparkles className="h-3.5 w-3.5 text-violet-500 group-hover:text-white transition-colors" />
          Build with AI
        </button>
      </div>
    </div>
  )
}
