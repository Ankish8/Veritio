'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export default function FadeIn({ children, className = '', delay = 0 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const d = delay >= 1 ? delay * 0.15 : delay

  useEffect(() => {
    const el = ref.current
    if (!el) return

    gsap.set(el, { opacity: 0, y: 24 })

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      delay: d,
      ease: 'back.out(1.4)',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [d])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
