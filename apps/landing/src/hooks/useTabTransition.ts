'use client'

import { useRef, useCallback } from 'react'
import gsap from 'gsap'

export default function useTabTransition() {
  const ref = useRef<HTMLDivElement>(null)
  const animate = useCallback(() => {
    const el = ref.current
    if (!el) return
    gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
  }, [])
  return { ref, animate }
}
