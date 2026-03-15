'use client'

import * as React from 'react'
import { Input } from './input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  options: Array<{ value: string; label: string }>
  className?: string
  emptyText?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  options,
  className,
  emptyText = 'No results found',
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (listRef.current) {
      const highlightedItem = listRef.current.querySelector(
        `[data-highlighted-index="${highlightedIndex}"]`
      )
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Handle keyboard navigation in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        if (filteredOptions[highlightedIndex]) {
          onValueChange(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Home':
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex(0)
        break
      case 'End':
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex(filteredOptions.length - 1)
        break
      case 'Escape':
        // Let this propagate to close the dropdown
        break
      default:
        // Only stop propagation for character keys to allow typing
        // This prevents Radix's typeahead from interfering
        if (e.key.length === 1) {
          e.stopPropagation()
        }
    }
  }

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) {
          // Reset search and highlight when dropdown closes
          setSearchQuery('')
          setHighlightedIndex(0)
        } else {
          // Focus the search input when dropdown opens
          setTimeout(() => {
            searchInputRef.current?.focus()
          }, 0)
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        <div
          className="sticky top-0 z-10 p-2 border-b"
          style={{
            backgroundColor: 'var(--style-card-bg)',
            borderColor: 'var(--style-card-border)',
          }}
        >
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
            onClick={(e) => {
              e.stopPropagation()
            }}
            onKeyDown={handleSearchKeyDown}
            aria-label={searchPlaceholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="searchable-select-listbox"
            aria-activedescendant={
              filteredOptions[highlightedIndex]
                ? `option-${filteredOptions[highlightedIndex].value}`
                : undefined
            }
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto"
          role="listbox"
          id="searchable-select-listbox"
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <SelectItem
                key={option.value}
                value={option.value}
                data-highlighted-index={index}
                id={`option-${option.value}`}
                className={
                  index === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : ''
                }
              >
                {option.label}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  )
}
