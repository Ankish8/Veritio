'use client'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useYjsOptional } from './yjs-provider'
import { useYjsText, useCollaborativePresence, getUserInitials } from '@veritio/yjs'
import { Textarea } from '@veritio/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui'
import { cn } from '@veritio/ui'

interface CollaborativeTextareaProps {
  fieldPath: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number
  rows?: number
  'aria-describedby'?: string
  id?: string
  initialValue?: string
  showPresence?: boolean
}

export function CollaborativeTextarea({
  fieldPath,
  onChange,
  placeholder,
  className,
  disabled = false,
  maxLength,
  rows = 3,
  'aria-describedby': ariaDescribedby,
  id,
  initialValue,
  showPresence = true,
}: CollaborativeTextareaProps) {
  const yjs = useYjsOptional()

  // Extract values safely - all will be null/false/no-op if context not available
  const doc = yjs?.doc ?? null
  const setLocation = yjs?.setLocation ?? (() => {})
  const setTyping = yjs?.setTyping ?? (() => {})
  const isConnected = yjs?.isConnected ?? false
  const isSynced = yjs?.isSynced ?? false
  const { value, setValue, isReady } = useYjsText({ doc, fieldPath })
  const { primaryUser, usersAtLocation } = useCollaborativePresence(fieldPath)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const hasInitializedRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize initials for badge
  const presenceInfo = useMemo(() => {
    if (!primaryUser) return null
    return {
      initials: getUserInitials(primaryUser.name, primaryUser.email),
      otherCount: usersAtLocation.length - 1,
    }
  }, [primaryUser, usersAtLocation.length])

  // Store onChange in a ref to avoid infinite loops
  // (parent may pass new function reference on each render)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Sync local value with Yjs value
  useEffect(() => {
    setLocalValue(value)
    // Use ref to call onChange without it being a dependency
    onChangeRef.current?.(value)
  }, [value])

  // Initialize ONLY if document is truly empty after sync
  // This prevents duplication when Yjs loads from IndexedDB
  useEffect(() => {
    if (isReady && isSynced && initialValue && !value && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      setValue(initialValue)
    }
  }, [isReady, isSynced, initialValue, value, setValue])

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (maxLength && newValue.length > maxLength) return

      setLocalValue(newValue)
      setValue(newValue)
    },
    [setValue, maxLength]
  )

  // Track focus for presence
  const handleFocus = useCallback(() => {
    setLocation(fieldPath)
  }, [setLocation, fieldPath])

  const handleBlur = useCallback(() => {
    setLocation(null)
    setTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [setLocation, setTyping])

  // Debounced typing indicator
  const handleKeyDown = useCallback(() => {
    setTyping(true)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
      typingTimeoutRef.current = null
    }, 1000)
  }, [setTyping])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Loading state - also check clientID to detect destroyed docs
  if (!doc || !isReady || doc.clientID === 0) {
    return (
      <div
        className={cn('h-20 rounded-xl animate-pulse bg-muted', className)}
      />
    )
  }

  const hasPresence = showPresence && primaryUser

  return (
    <div className="relative">
      {/* Presence ring overlay - separate element to avoid clipping */}
      {hasPresence && (
        <div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{
            border: `2px solid ${primaryUser.color}`,
          }}
        />
      )}
      <Textarea
        ref={textareaRef}
        id={id}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        aria-describedby={ariaDescribedby}
        className={cn(
          !isConnected && 'ring-1 ring-yellow-500/50',
          className
        )}
      />

      {/* Presence badge with typing indicator - positioned at top-right corner */}
      {hasPresence && presenceInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-2 -right-2 flex items-center gap-1 z-10">
                {/* Avatar badge */}
                <div
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm border-2 border-white cursor-default transition-transform hover:scale-110',
                    primaryUser.typing && 'animate-pulse'
                  )}
                  style={{ backgroundColor: primaryUser.color }}
                >
                  {primaryUser.avatarUrl ? (
                    <img
                      src={primaryUser.avatarUrl}
                      alt={primaryUser.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    presenceInfo.initials
                  )}
                </div>
                {/* Typing indicator */}
                {primaryUser.typing && (
                  <span
                    className="text-[12px] font-medium px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap animate-pulse"
                    style={{ backgroundColor: primaryUser.color, color: 'white' }}
                  >
                    typing...
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">
                {primaryUser.name || primaryUser.email} {primaryUser.typing ? 'is typing...' : 'is editing'}
              </p>
              {presenceInfo.otherCount > 0 && (
                <p className="text-muted-foreground">
                  +{presenceInfo.otherCount} other{presenceInfo.otherCount > 1 ? 's' : ''}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
