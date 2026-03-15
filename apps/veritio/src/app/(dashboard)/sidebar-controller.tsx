'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/ui/sidebar'

export function SidebarController() {
  const pathname = usePathname()
  const { setOpen, open } = useSidebar()

  useEffect(() => {
    const shouldCollapse =
      pathname.includes('/builder') ||
      pathname.includes('/recruit') ||
      pathname.includes('/results') ||
      pathname.includes('/create-with-ai')

    if (shouldCollapse && open) {
      setOpen(false)
    }
  }, [pathname, setOpen, open])

  return null
}
