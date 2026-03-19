'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input, type InputProps } from '@/components/ui/input'

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  containerClassName?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ containerClassName, className, placeholder = 'Search...', ...props }, ref) => {
    return (
      <div className={cn('relative', containerClassName)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn('pl-9', className)}
          {...props}
        />
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'

export { SearchInput }
