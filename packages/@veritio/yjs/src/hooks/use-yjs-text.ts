'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import * as Y from 'yjs'

interface UseYjsTextOptions {
  doc: Y.Doc | null
  fieldPath: string
}

interface UseYjsTextReturn {
  value: string
  setValue: (value: string) => void
  ytext: Y.Text | null
  isReady: boolean
}

export function useYjsText({ doc, fieldPath }: UseYjsTextOptions): UseYjsTextReturn {
  const [value, setValue] = useState('')
  const [isReady, setIsReady] = useState(false)
  const ytextRef = useRef<Y.Text | null>(null)

  // Initialize Y.Text and subscribe to changes
  useEffect(() => {
    // Check doc exists and isn't destroyed (destroyed docs have clientID 0)
    if (!doc || doc.clientID === 0) {
      setValue('')
      setIsReady(false)
      ytextRef.current = null
      return
    }

    // Get or create the Y.Text at the field path
    const ytext = doc.getText(fieldPath)
    ytextRef.current = ytext

    // Set initial value
    setValue(ytext.toString())
    setIsReady(true)

    // Observer for remote changes
    const observer = () => {
      setValue(ytext.toString())
    }

    ytext.observe(observer)

    return () => {
      ytext.unobserve(observer)
    }
  }, [doc, fieldPath])

  // Set value (replaces entire text content)
  const setTextValue = useCallback((newValue: string) => {
    const ytext = ytextRef.current
    if (!ytext) return

    // Use a transaction for atomic update
    ytext.doc?.transact(() => {
      ytext.delete(0, ytext.length)
      ytext.insert(0, newValue)
    })
  }, [])

  return {
    value,
    setValue: setTextValue,
    ytext: ytextRef.current,
    isReady,
  }
}
