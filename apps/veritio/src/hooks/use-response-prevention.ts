'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import type { ResponsePreventionLevel } from '@/components/builders/shared/types'

// Cookie name for tracking
const COOKIE_NAME = 'opt_pid'
const COOKIE_EXPIRY_DAYS = 365

export interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export interface DuplicateCheckResult {
  canParticipate: boolean
  reason?: 'cookie' | 'ip' | 'fingerprint' | 'cookie_and_ip'
  message?: string
  preventionLevel: ResponsePreventionLevel
}

function getOrCreateCookie(): string {
  if (typeof document === 'undefined') return ''

  // Try to read existing cookie
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === COOKIE_NAME && value) {
      return value
    }
  }

  // Create new cookie with 32-char ID
  const newId = nanoid(32)
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS)
  document.cookie = `${COOKIE_NAME}=${newId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`

  return newId
}

let fpPromise: Promise<unknown> | null = null

async function loadFingerprintJS(): Promise<unknown> {
  if (!fpPromise) {
    const FingerprintJS = await import('@fingerprintjs/fingerprintjs')
    fpPromise = FingerprintJS.load()
  }
  return fpPromise
}

/** Hook for managing response prevention data collection and duplicate checking. */
export function useResponsePrevention(
  studyCode: string,
  preventionLevel: ResponsePreventionLevel = 'none'
) {
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<DuplicateCheckResult | null>(null)
  const [preventionData, setPreventionData] = useState<ResponsePreventionData>({
    cookieId: null,
    fingerprintHash: null,
    fingerprintConfidence: null,
  })
  const hasChecked = useRef(false)
  const cookieCollected = useRef(false)
  const fingerprintCollected = useRef(false)
  const preventionDataRef = useRef<ResponsePreventionData>(preventionData)

  useEffect(() => {
    if (cookieCollected.current) return
    cookieCollected.current = true

    const cookieId = getOrCreateCookie()
    const newData = {
      ...preventionDataRef.current,
      cookieId,
    }
    setPreventionData(newData)
    preventionDataRef.current = newData
  }, [])

  useEffect(() => {
    if (preventionLevel !== 'strict' || fingerprintCollected.current) return

    const collectFingerprint = async () => {
      try {
        const fp = await loadFingerprintJS() as { get: () => Promise<{ visitorId: string; confidence: { score: number } }> }
        const result = await fp.get()

        const newData = {
          ...preventionDataRef.current,
          fingerprintHash: result.visitorId,
          fingerprintConfidence: result.confidence.score,
        }

        setPreventionData(newData)
        preventionDataRef.current = newData
        fingerprintCollected.current = true
      } catch {
        fingerprintCollected.current = true
      }
    }

    collectFingerprint()
  }, [preventionLevel])

  const checkDuplicate = useCallback(async (): Promise<DuplicateCheckResult> => {
    if (hasChecked.current || preventionLevel === 'none') {
      return { canParticipate: true, preventionLevel }
    }

    const maxWaitMs = 2000
    const pollIntervalMs = 50
    let waitedMs = 0

    const needsFingerprint = preventionLevel === 'strict'
    while (waitedMs < maxWaitMs) {
      const cookieReady = cookieCollected.current
      const fingerprintReady = !needsFingerprint || fingerprintCollected.current
      if (cookieReady && fingerprintReady) break
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      waitedMs += pollIntervalMs
    }

    setIsChecking(true)
    hasChecked.current = true

    try {
      const currentData = preventionDataRef.current

      const response = await fetch(`/api/participate/${studyCode}/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentData),
      })

      const result = await response.json()
      setCheckResult(result)
      return result
    } catch {
      const fallback: DuplicateCheckResult = { canParticipate: true, preventionLevel }
      setCheckResult(fallback)
      return fallback
    } finally {
      setIsChecking(false)
    }
  }, [studyCode, preventionLevel])

  const resetCheck = useCallback(() => {
    hasChecked.current = false
    setCheckResult(null)
  }, [])

  return {
    preventionData,
    isChecking,
    checkResult,
    checkDuplicate,
    resetCheck,
  }
}
