'use client'

import { Loader2, Sparkles } from 'lucide-react'

export function WorkspaceInitializing() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Setting up</span>
      </div>

      <h3 className="text-xl font-semibold mb-2">Creating your workspace</h3>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        We&apos;re setting up your personal workspace and first project.
        This only takes a moment...
      </p>
    </div>
  )
}
