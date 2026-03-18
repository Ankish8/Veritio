'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { ApiErrorResponse, ErrorCode } from '@veritio/core/errors'
import { ErrorCodes } from '@veritio/core/errors'

interface ErrorState {
  id: string
  error: ApiErrorResponse | Error
  timestamp: Date
  dismissed: boolean
}

interface ErrorContextValue {
  errors: ErrorState[]
  lastError: ErrorState | null
  addError: (error: ApiErrorResponse | Error) => string
  dismissError: (id: string) => void
  clearErrors: () => void
  getErrorsByCode: (code: ErrorCode) => ErrorState[]
  hasAuthError: boolean
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

export function useErrorContext(): ErrorContextValue {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider')
  }
  return context
}

const MAX_ERRORS = 10

function isAuthError(error: ApiErrorResponse | Error): boolean {
  if ('code' in error) {
    return (
      error.code === ErrorCodes.AUTH_SESSION_EXPIRED ||
      error.code === ErrorCodes.AUTH_SESSION_INVALID ||
      error.code === ErrorCodes.AUTH_TOKEN_MISSING ||
      error.code === ErrorCodes.AUTH_TOKEN_INVALID
    )
  }
  return false
}

function getErrorCode(error: ApiErrorResponse | Error): ErrorCode | undefined {
  if ('code' in error) {
    return error.code
  }
  return undefined
}

interface ErrorProviderProps {
  children: ReactNode
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errors, setErrors] = useState<ErrorState[]>([])

  const addError = useCallback((error: ApiErrorResponse | Error): string => {
    const id = crypto.randomUUID()
    const errorState: ErrorState = {
      id,
      error,
      timestamp: new Date(),
      dismissed: false,
    }

    setErrors((prev) => {
      // Keep only the last MAX_ERRORS - 1, then add new one
      const trimmed = prev.slice(-(MAX_ERRORS - 1))
      return [...trimmed, errorState]
    })

    return id
  }, [])

  const dismissError = useCallback((id: string) => {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, dismissed: true } : e))
    )
  }, [])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const getErrorsByCode = useCallback(
    (code: ErrorCode): ErrorState[] => {
      return errors.filter((e) => !e.dismissed && getErrorCode(e.error) === code)
    },
    [errors]
  )

  const hasAuthError = useMemo(() => {
    return errors.some((e) => !e.dismissed && isAuthError(e.error))
  }, [errors])

  const lastError = useMemo(() => {
    const active = errors.filter((e) => !e.dismissed)
    return active.length > 0 ? active[active.length - 1] : null
  }, [errors])

  const value = useMemo(
    (): ErrorContextValue => ({
      errors,
      lastError,
      addError,
      dismissError,
      clearErrors,
      getErrorsByCode,
      hasAuthError,
    }),
    [errors, lastError, addError, dismissError, clearErrors, getErrorsByCode, hasAuthError]
  )

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
}
