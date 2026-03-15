'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorState: 'none' | 'loading' | 'slow' | 'error'
}

export class ProgressiveErrorBoundary extends Component<Props, State> {
  private slowTimer: NodeJS.Timeout | null = null
  private errorTimer: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorState: 'none',
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorState: 'loading',
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)

    this.slowTimer = setTimeout(() => {
      this.setState({ errorState: 'slow' })
    }, 1000)

    this.errorTimer = setTimeout(() => {
      this.setState({ errorState: 'error' })
    }, 3000)
  }

  componentWillUnmount() {
    if (this.slowTimer) clearTimeout(this.slowTimer)
    if (this.errorTimer) clearTimeout(this.errorTimer)
  }

  handleRetry = () => {
    if (this.slowTimer) clearTimeout(this.slowTimer)
    if (this.errorTimer) clearTimeout(this.errorTimer)

    this.setState({
      hasError: false,
      error: null,
      errorState: 'none',
    })
  }

  render() {
    const { hasError, errorState, error } = this.state
    const { children, fallback } = this.props

    if (!hasError) {
      return children
    }

    return (
      <div className="error-boundary-container">
        {errorState === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error?.message || 'Failed to load this section'}
              </p>
            </div>
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              Try again
            </Button>
          </div>
        )}

        {errorState !== 'error' && (
          <>
            {fallback}
            {errorState === 'slow' && (
              <div className="flex items-center justify-center p-2">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Still loading...
                </p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }
}
