'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface UseStepTransitionOptions {
  onTransitionEnd: () => void
  preDelay?: number
  animationDuration?: number
}

export function useStepTransition({
  onTransitionEnd,
  preDelay = 100,
  animationDuration = 300,
}: UseStepTransitionOptions) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

  const triggerTransition = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)

    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)
      animationTimeoutRef.current = setTimeout(() => {
        onTransitionEnd()
      }, animationDuration)
    }, preDelay)
  }, [isAnimating, onTransitionEnd, preDelay, animationDuration])

  const resetTransition = useCallback(() => {
    setIsTransitioning(false)
    setIsAnimating(false)
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }
  }, [])

  return {
    isTransitioning,
    isAnimating,
    triggerTransition,
    resetTransition,
  }
}
