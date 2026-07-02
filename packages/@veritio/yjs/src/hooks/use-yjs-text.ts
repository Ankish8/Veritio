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
  const valueRef = useRef('')

  const publishValue = useCallback((nextValue: string) => {
    if (valueRef.current === nextValue) return
    valueRef.current = nextValue
    setValue(nextValue)
  }, [])

  // Initialize Y.Text and subscribe to changes
  useEffect(() => {
    // Check doc exists and isn't destroyed (destroyed docs have clientID 0)
    if (!doc || doc.clientID === 0) {
      publishValue('')
      setIsReady(false)
      ytextRef.current = null
      return
    }

    // Get or create the Y.Text at the field path
    const ytext = doc.getText(fieldPath)
    ytextRef.current = ytext

    // Set initial value
    publishValue(ytext.toString())
    setIsReady(true)

    // Observer for remote changes
    const observer = () => {
      publishValue(ytext.toString())
    }

    ytext.observe(observer)

    return () => {
      ytext.unobserve(observer)
    }
  }, [doc, fieldPath, publishValue])

  // Set value (replaces entire text content)
  const setTextValue = useCallback((newValue: string) => {
    const ytext = ytextRef.current
    if (!ytext) return

    if (ytext.toString() === newValue) {
      publishValue(newValue)
      return
    }

    // Use a transaction for atomic update
    ytext.doc?.transact(() => {
      if (ytext.length > 0) {
        ytext.delete(0, ytext.length)
      }
      if (newValue.length > 0) {
        ytext.insert(0, newValue)
      }
    })
  }, [publishValue])

  return {
    value,
    setValue: setTextValue,
    ytext: ytextRef.current,
    isReady,
  }
}
