'use client'

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar'

export function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ProgressBar
        height="2px"
        color="hsl(20 5.9% 30%)"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  )
}
