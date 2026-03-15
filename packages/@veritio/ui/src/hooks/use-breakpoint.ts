'use client'

import * as React from 'react'
const BREAKPOINTS = {
  sm: 640,       // Mobile boundary
  md: 768,       // Keep for compatibility
  lg: 1024,      // Small Desktop boundary
  xl: 1280,      // Desktop boundary
  wide: 1440,    // Wide Desktop boundary
  '2xl': 1536,   // Keep for compatibility
} as const

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'wide' | '2xl'

export interface BreakpointState {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isSmallDesktop: boolean
  isDesktop: boolean
  isWideDesktop: boolean
  width: number | undefined
}
export function useBreakpoint(): BreakpointState {
  const [state, setState] = React.useState<BreakpointState>({
    breakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isSmallDesktop: false,
    isDesktop: true,
    isWideDesktop: false,
    width: undefined,
  })

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth

      let breakpoint: Breakpoint
      if (width >= BREAKPOINTS['2xl']) {
        breakpoint = '2xl'
      } else if (width >= BREAKPOINTS.wide) {
        breakpoint = 'wide'
      } else if (width >= BREAKPOINTS.xl) {
        breakpoint = 'xl'
      } else if (width >= BREAKPOINTS.lg) {
        breakpoint = 'lg'
      } else if (width >= BREAKPOINTS.md) {
        breakpoint = 'md'
      } else if (width >= BREAKPOINTS.sm) {
        breakpoint = 'sm'
      } else {
        breakpoint = 'xs'
      }

      setState({
        breakpoint,
        isMobile: width < BREAKPOINTS.sm,                                    // < 640px
        isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg,         // 640-1023px
        isSmallDesktop: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,   // 1024-1279px
        isDesktop: width >= BREAKPOINTS.xl,                                  // >= 1280px
        isWideDesktop: width >= BREAKPOINTS.wide,                            // >= 1440px
        width,
      })
    }

    // Initial call
    updateBreakpoint()

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return state
}
