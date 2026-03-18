'use client'

import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** SSR-safe hook to detect mobile viewport. Returns undefined during SSR/hydration. */
export function useIsMobile() {
  // Start as undefined to indicate "not yet determined" state
  // This allows components to render a consistent tree during SSR/hydration
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Set initial value after mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
