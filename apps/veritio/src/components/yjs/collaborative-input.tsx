'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useYjsOptional } from './yjs-provider'
import { useYjsText, useCollaborativePresence, getUserInitials } from '@veritio/yjs'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CollaborativeInputProps {
  fieldPath: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number
  required?: boolean
  'aria-required'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
  id?: string
  initialValue?: string
  showPresence?: boolean
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  lockWhenOthersEditing?: boolean
}

export function CollaborativeInput({
  fieldPath,
  onChange,
  placeholder,
  className,
  disabled = false,
  maxLength,
  required,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedby,
  id,
  initialValue,
  showPresence = true,
  type,
  inputMode,
  lockWhenOthersEditing = true,
}: CollaborativeInputProps) {
  const yjs = useYjsOptional()

  // Extract values safely - all will be null/false/no-op if context not available
  const doc = yjs?.doc ?? null
  const setLocation = useMemo(() => yjs?.setLocation ?? (() => {}), [yjs?.setLocation])
  const setTyping = useMemo(() => yjs?.setTyping ?? (() => {}), [yjs?.setTyping])
  const isConnected = yjs?.isConnected ?? false
  const isSynced = yjs?.isSynced ?? false
  const { value, setValue, ytext, isReady } = useYjsText({ doc, fieldPath })
  const { primaryUser, usersAtLocation } = useCollaborativePresence(fieldPath)
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const hasInitializedRef = useRef(false)
  const shouldSyncToStoreRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latestValueRef = useRef(value)
  latestValueRef.current = value

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

  // Initialize Yjs FIRST if document is empty, BEFORE syncing to store
  // This prevents empty Yjs values from overwriting the store
  //
  // CRITICAL: Dependencies intentionally exclude `value` and `initialValue` to prevent
  // re-initialization during reconnection or when store updates. We ONLY want to initialize
  // once when the doc first becomes ready and synced.
  // NOTE: isSynced fires when EITHER IndexedDB or WS syncs (OR logic). This is safe
  // because the initialValue write only happens when the Yjs field is empty.
  useEffect(() => {
    if (isReady && isSynced && !hasInitializedRef.current) {
      hasInitializedRef.current = true

      // Read current Yjs content directly (not from React state which may lag behind observer)
      const currentYjsValue = ytext?.toString() || ''

      // If Yjs is empty and we have an initial value from the store, initialize Yjs
      if (!currentYjsValue && initialValue) {
        setValue(initialValue)
        // Don't sync to store yet - we're initializing FROM the store
      } else {
        // Yjs has data (from server/other clients) - enable syncing to store
        shouldSyncToStoreRef.current = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isSynced])

  // Detect external store changes (e.g., AI writes) and sync to Yjs.
  // When initialValue (from Zustand store) changes and differs from the Yjs value,
  // the change came from outside (not user typing) — push it to Yjs.
  // User typing: setValue() updates Yjs synchronously, so by the time the parent
  // re-renders with a new initialValue, Yjs `value` already matches → no-op.
  // Uses latestValueRef instead of `value` in closure to avoid stale comparisons.
  useEffect(() => {
    if (!isReady || !hasInitializedRef.current) return
    if (initialValue !== undefined && initialValue !== null && initialValue !== latestValueRef.current) {
      setValue(initialValue)
    }
  }, [initialValue, isReady, setValue])

  // Sync local value with Yjs value
  // Only sync to store AFTER initialization to prevent overwriting store with empty values
  useEffect(() => {
    setLocalValue(value)

    // Only sync to store if:
    // 1. We've completed initialization, AND
    // 2. Either we should sync (Yjs had data) OR value is non-empty (user typed something)
    //
    // CRITICAL: Only sync if hasInitializedRef is true to prevent race conditions during mount/reconnect
    if (hasInitializedRef.current && (shouldSyncToStoreRef.current || value)) {
      shouldSyncToStoreRef.current = true // Enable future syncing once we have any value
      onChangeRef.current?.(value)
    }
  }, [value])

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
  // If we have an initialValue, show a disabled input instead of a skeleton
  // to eliminate the visual flash during Yjs connection
  if (!doc || !isReady || doc.clientID === 0) {
    if (initialValue !== undefined && initialValue !== null) {
      return (
        <Input
          value={initialValue}
          placeholder={placeholder}
          disabled
          className={className}
        />
      )
    }
    return (
      <div
        className={cn('h-10 rounded-xl animate-pulse bg-muted', className)}
      />
    )
  }

  const hasPresence = showPresence && primaryUser
  // Lock the input when another user is editing (prevents conflicts)
  const isLockedByOther = lockWhenOthersEditing && !!primaryUser
  const isDisabled = disabled || isLockedByOther

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
      <Input
        ref={inputRef}
        id={id}
        type={type}
        inputMode={inputMode}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        maxLength={maxLength}
        required={required}
        aria-required={ariaRequired}
        aria-describedby={ariaDescribedby}
        className={cn(
          !isConnected && 'ring-1 ring-yellow-500/50',
          hasPresence && 'pr-8', // Make room for presence badge
          isLockedByOther && 'cursor-not-allowed opacity-70',
          className
        )}
      />

      {/* Presence badge with typing indicator */}
      {hasPresence && presenceInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1 z-10">
                {/* Avatar badge */}
                <div
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm cursor-default transition-transform hover:scale-110',
                    primaryUser.typing && 'animate-pulse'
                  )}
                  style={{ backgroundColor: primaryUser.color }}
                >
                  {primaryUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
              {isLockedByOther && (
                <p className="text-muted-foreground mt-1 text-[12px]">
                  Field locked until they finish
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
