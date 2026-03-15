import type { ErrorCode } from './codes'

export interface ValidationErrorDetail {
  field: string
  message: string
  code?: string
}

export interface ApiErrorResponse {
  code: ErrorCode
  message: string
  traceId: string
  timestamp: string
  status: number
  details?: ValidationErrorDetail[]
  context?: Record<string, unknown>
}

export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

export interface AppErrorOptions {
  details?: ValidationErrorDetail[]
  context?: Record<string, unknown>
  cause?: Error
}

export interface SerializedError {
  name: string
  message: string
  code?: ErrorCode
  status?: number
  stack?: string
  details?: ValidationErrorDetail[]
}
