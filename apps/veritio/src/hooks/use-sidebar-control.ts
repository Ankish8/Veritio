"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"

/** Controls sidebar expanded/collapsed state based on current route. */
export function useSidebarControl() {
  const pathname = usePathname()
  const { setOpen } = useSidebar()

  useEffect(() => {
    const shouldExpand = isSidebarExpandedRoute(pathname)
    setOpen(shouldExpand)
  }, [pathname, setOpen])
}

function isSidebarExpandedRoute(pathname: string): boolean {
  // Routes where sidebar should be COLLAPSED
  const collapsedPatterns = [
    /\/builder$/,      // Study builder/editor
    /\/results/,       // Results and analysis pages
    /\/preview$/,      // Study preview
    /\/new$/,          // Creating new project/study
  ]

  // If pathname matches any collapsed pattern, return false (collapsed)
  const shouldCollapse = collapsedPatterns.some(pattern => pattern.test(pathname))

  return !shouldCollapse
}
