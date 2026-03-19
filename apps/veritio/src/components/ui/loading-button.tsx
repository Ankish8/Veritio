'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
}

function LoadingButton({ loading = false, loadingText, disabled, children, className, ...props }: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
}

export { LoadingButton }
