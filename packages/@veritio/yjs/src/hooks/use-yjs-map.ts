'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import * as Y from 'yjs'

interface UseYjsMapOptions<T> {
  doc: Y.Doc | null
  fieldPath: string
  isSynced?: boolean
  initialValue?: T
}

interface UseYjsMapReturn<T> {
  value: T | null
  setValue: (updates: Partial<T>) => void
  setProperty: <K extends keyof T>(key: K, value: T[K]) => void
  getProperty: <K extends keyof T>(key: K) => T[K] | undefined
  ymap: Y.Map<unknown> | null
  isReady: boolean
}
function ymapToObject<T>(ymap: Y.Map<unknown>): T {
  const obj: Record<string, unknown> = {}
  ymap.forEach((value, key) => {
    obj[key] = value
  })
  return obj as T
}

export function useYjsMap<T extends Record<string, unknown>>({
  doc,
  fieldPath,
  isSynced = true,
  initialValue,
}: UseYjsMapOptions<T>): UseYjsMapReturn<T> {
  const [value, setValue] = useState<T | null>(null)
  const [isReady, setIsReady] = useState(false)
  const ymapRef = useRef<Y.Map<unknown> | null>(null)
  const hasInitializedRef = useRef(false)

  // Initialize Y.Map and subscribe to changes
  useEffect(() => {
    if (!doc) {
      setValue(null)
      setIsReady(false)
      ymapRef.current = null
      return
    }

    // Get or create the Y.Map at the field path
    const ymap = doc.getMap(fieldPath)
    ymapRef.current = ymap

    // Function to sync Y.Map to React state
    const syncToState = () => {
      if (ymap.size === 0) {
        setValue(null)
      } else {
        setValue(ymapToObject<T>(ymap))
      }
    }

    // Set initial value
    syncToState()
    setIsReady(true)

    // Observer for changes
    const observer = () => {
      syncToState()
    }

    ymap.observe(observer)

    return () => {
      ymap.unobserve(observer)
    }
  }, [doc, fieldPath])

  // Initialize with initial value ONLY if map is empty after sync
  useEffect(() => {
    const ymap = ymapRef.current
    if (
      isReady &&
      isSynced &&
      initialValue &&
      ymap &&
      ymap.size === 0 &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true
      doc?.transact(() => {
        Object.entries(initialValue).forEach(([key, val]) => {
          if (val !== undefined) {
            ymap.set(key, val)
          }
        })
      })
    }
  }, [isReady, isSynced, initialValue, doc])

  // Update one or more properties
  const setMapValue = useCallback((updates: Partial<T>) => {
    const ymap = ymapRef.current
    if (!ymap) return

    ymap.doc?.transact(() => {
      Object.entries(updates).forEach(([key, val]) => {
        if (val !== undefined) {
          ymap.set(key, val)
        }
      })
    })
  }, [])

  // Set a single property
  const setProperty = useCallback(<K extends keyof T>(key: K, val: T[K]) => {
    const ymap = ymapRef.current
    if (!ymap) return

    ymap.set(key as string, val)
  }, [])

  // Get a single property
  const getProperty = useCallback(<K extends keyof T>(key: K): T[K] | undefined => {
    const ymap = ymapRef.current
    if (!ymap) return undefined

    return ymap.get(key as string) as T[K] | undefined
  }, [])

  return {
    value,
    setValue: setMapValue,
    setProperty,
    getProperty,
    ymap: ymapRef.current,
    isReady,
  }
}
