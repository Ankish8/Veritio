'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DEFAULT_THINK_ALOUD_PROMPTS } from '../types/player-types'

export interface UseThinkAloudPromptsOptions {
  enabled: boolean
  isSilent: boolean
  customPrompts?: string[]
  debounceSeconds?: number
  captureCustomEvent?: (eventType: string, data: Record<string, unknown>) => void
  silenceDuration?: number
}

export interface UseThinkAloudPromptsReturn {
  showPrompt: boolean
  currentPrompt: string
  dismissPrompt: () => void
  promptCount: number
}

function getNextPromptIndex(prompts: string[], lastIndex: number): number {
  if (prompts.length <= 1) return 0

  // Pick a random index that's different from the last one
  let newIndex: number
  do {
    newIndex = Math.floor(Math.random() * prompts.length)
  } while (newIndex === lastIndex)

  return newIndex
}

export function useThinkAloudPrompts(
  options: UseThinkAloudPromptsOptions
): UseThinkAloudPromptsReturn {
  const {
    enabled,
    isSilent,
    customPrompts,
    debounceSeconds = 30,
    captureCustomEvent,
    silenceDuration = 0,
  } = options

  const prompts = useMemo(() => {
    if (customPrompts && customPrompts.length > 0) {
      return customPrompts
    }
    return DEFAULT_THINK_ALOUD_PROMPTS
  }, [customPrompts])

  const [showPrompt, setShowPrompt] = useState(false)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [promptCount, setPromptCount] = useState(0)

  const lastPromptTimeRef = useRef<number>(0)
  const promptShownTimeRef = useRef<number>(0)

  const captureCustomEventRef = useRef(captureCustomEvent)
  useEffect(() => {
    captureCustomEventRef.current = captureCustomEvent
  }, [captureCustomEvent])

  useEffect(() => {
    if (!enabled || !isSilent || showPrompt) return

    const now = Date.now()
    const timeSinceLastPrompt = (now - lastPromptTimeRef.current) / 1000

    if (timeSinceLastPrompt < debounceSeconds) {
      return
    }

    setShowPrompt(true)
    setPromptCount((prev) => prev + 1)
    lastPromptTimeRef.current = now
    promptShownTimeRef.current = now

    captureCustomEventRef.current?.('prompt_shown', {
      prompt_text: prompts[currentPromptIndex],
      prompt_index: currentPromptIndex,
      silence_duration_seconds: silenceDuration,
    })
  }, [enabled, isSilent, showPrompt, debounceSeconds, currentPromptIndex, prompts, silenceDuration])

  useEffect(() => {
    if (!isSilent && showPrompt) {
      const timeShown = (Date.now() - promptShownTimeRef.current) / 1000

      captureCustomEventRef.current?.('prompt_dismissed', {
        prompt_text: prompts[currentPromptIndex],
        prompt_index: currentPromptIndex,
        time_shown_seconds: timeShown,
        dismissed_by: 'speech_resumed',
      })

      setShowPrompt(false)
      setCurrentPromptIndex(getNextPromptIndex(prompts, currentPromptIndex))
    }
  }, [isSilent, showPrompt, currentPromptIndex, prompts])

  const dismissPrompt = useCallback(() => {
    if (!showPrompt) return

    const timeShown = (Date.now() - promptShownTimeRef.current) / 1000

    captureCustomEventRef.current?.('prompt_dismissed', {
      prompt_text: prompts[currentPromptIndex],
      prompt_index: currentPromptIndex,
      time_shown_seconds: timeShown,
      dismissed_by: 'user_click',
    })

    setShowPrompt(false)
    setCurrentPromptIndex(getNextPromptIndex(prompts, currentPromptIndex))
  }, [showPrompt, currentPromptIndex, prompts])

  return {
    showPrompt,
    currentPrompt: prompts[currentPromptIndex],
    dismissPrompt,
    promptCount,
  }
}
