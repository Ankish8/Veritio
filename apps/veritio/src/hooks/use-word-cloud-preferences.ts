/**
 * useWordCloudPreferences Hook
 *
 * Persists word cloud filter preferences to localStorage.
 */

import { useState, useEffect, useCallback } from 'react'

const STOP_WORDS_ENABLED_KEY = 'fi-word-cloud-stop-words-enabled'
const CUSTOM_STOP_WORDS_KEY = 'fi-word-cloud-custom-stop-words'

interface WordCloudPreferences {
  stopWordsEnabled: boolean
  setStopWordsEnabled: (enabled: boolean) => void
  customStopWords: Set<string>
  addCustomStopWord: (word: string) => void
  removeCustomStopWord: (word: string) => void
  isHydrated: boolean
}

export function useWordCloudPreferences(): WordCloudPreferences {
  const [stopWordsEnabled, setStopWordsEnabledState] = useState(true)
  const [customStopWords, setCustomStopWords] = useState<Set<string>>(new Set())
  const [isHydrated, setIsHydrated] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedEnabled = localStorage.getItem(STOP_WORDS_ENABLED_KEY)
      if (savedEnabled !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStopWordsEnabledState(savedEnabled === 'true')
      }

      const savedCustomWords = localStorage.getItem(CUSTOM_STOP_WORDS_KEY)
      if (savedCustomWords) {
        const words = JSON.parse(savedCustomWords) as string[]
        setCustomStopWords(new Set(words))
      }
    } catch {
      // Silent fail - preferences are non-critical
    }

    setIsHydrated(true)
  }, [])

  // Save stop words enabled preference
  const setStopWordsEnabled = useCallback((enabled: boolean) => {
    setStopWordsEnabledState(enabled)
    try {
      localStorage.setItem(STOP_WORDS_ENABLED_KEY, String(enabled))
    } catch {
      // Silent fail
    }
  }, [])

  // Add custom stop word
  const addCustomStopWord = useCallback((word: string) => {
    const normalizedWord = word.trim().toLowerCase()
    if (!normalizedWord) return

    setCustomStopWords(prev => {
      const newSet = new Set([...prev, normalizedWord])
      try {
        localStorage.setItem(CUSTOM_STOP_WORDS_KEY, JSON.stringify(Array.from(newSet)))
      } catch {
        // Silent fail
      }
      return newSet
    })
  }, [])

  // Remove custom stop word
  const removeCustomStopWord = useCallback((word: string) => {
    setCustomStopWords(prev => {
      const newSet = new Set(prev)
      newSet.delete(word)
      try {
        localStorage.setItem(CUSTOM_STOP_WORDS_KEY, JSON.stringify(Array.from(newSet)))
      } catch {
        // Silent fail
      }
      return newSet
    })
  }, [])

  return {
    stopWordsEnabled,
    setStopWordsEnabled,
    customStopWords,
    addCustomStopWord,
    removeCustomStopWord,
    isHydrated,
  }
}
