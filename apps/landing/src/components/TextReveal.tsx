'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function TextReveal({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const words = el.querySelectorAll('.reveal-word')
    if (window.matchMedia('(max-width: 640px), (prefers-reduced-motion: reduce)').matches) {
      gsap.set(words, { opacity: 1 })
      return
    }
    gsap.set(words, { opacity: 0.2 })
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'bottom 50%',
        scrub: true,
      },
    })
    words.forEach((word, i) => {
      tl.to(word, { opacity: 1, duration: 1 }, i * 0.5)
    })
    return () => { tl.scrollTrigger?.kill(); tl.kill() }
  }, [text])

  return (
    <span ref={containerRef}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="reveal-word" style={{ display: 'inline-block', marginRight: '0.25em' }}>
          {word}
        </span>
      ))}
    </span>
  )
}
