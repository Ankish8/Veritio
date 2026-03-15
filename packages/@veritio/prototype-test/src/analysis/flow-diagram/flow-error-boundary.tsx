'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { Card, CardContent } from '@veritio/ui/components/card'
// Types

interface FlowErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface FlowErrorBoundaryState {
  hasError: boolean
  error: Error | null
}
// Component
export class FlowErrorBoundary extends Component<FlowErrorBoundaryProps, FlowErrorBoundaryState> {
  constructor(props: FlowErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FlowErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('FlowDiagram Error:', error)
    console.error('Component Stack:', errorInfo.componentStack)

    // Notify parent
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
              <h3 className="font-medium text-lg mb-1">
                Unable to render flow diagram
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                There was an issue processing the participant path data.
                This can happen with incomplete or malformed navigation data.
              </p>

              {/* Error details (collapsed by default in production) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full max-w-md mb-4 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
// Functional Wrapper (for hooks compatibility)

interface WithFlowErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error) => void
}
export function WithFlowErrorBoundary({
  children,
  onError,
}: WithFlowErrorBoundaryProps): ReactNode {
  return (
    <FlowErrorBoundary onError={onError}>
      {children}
    </FlowErrorBoundary>
  )
}

export default FlowErrorBoundary
