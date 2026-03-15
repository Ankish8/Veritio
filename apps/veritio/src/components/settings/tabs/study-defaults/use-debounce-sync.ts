import { useCallback, useRef, useState, useEffect } from 'react'
import { toast } from '@/components/ui/sonner'

export type SaveStatus = 'idle' | 'saving' | 'saved'

interface UseDebouceSyncOptions<TData, TPartial> {
  serverData: TData | undefined
  defaults: TData
  mergeIntoState: (current: TData, updates: TPartial) => TData
  mergePartials: (target: TPartial | null, source: TPartial) => TPartial
  saveToApi: (updates: TPartial) => Promise<void>
  debounceMs?: number
}

interface UseDebouceSyncReturn<TData, TPartial> {
  localState: TData
  saveStatus: SaveStatus
  handleUpdate: (updates: TPartial) => void
}

export function useDebounceSync<TData, TPartial>({
  serverData,
  defaults,
  mergeIntoState,
  mergePartials,
  saveToApi,
  debounceMs = 500,
}: UseDebouceSyncOptions<TData, TPartial>): UseDebouceSyncReturn<TData, TPartial> {
  // Local state for instant UI updates
  const [localState, setLocalState] = useState<TData>(defaults)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Refs for debounce management
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<TPartial | null>(null)
  const isInitializedRef = useRef(false)

  // Sync local state with server data on initial load only
  useEffect(() => {
    if (serverData && !isInitializedRef.current) {
      setLocalState(mergeIntoState(defaults, serverData as TPartial)) // eslint-disable-line react-hooks/set-state-in-effect
      isInitializedRef.current = true
    }
  }, [serverData, defaults, mergeIntoState])

  // Auto-clear "saved" status after 2 seconds
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Update handler - updates local state immediately, debounces API call
  const handleUpdate = useCallback(
    (updates: TPartial) => {
      // 1. Update local state immediately for instant UI feedback
      setLocalState((prev) => mergeIntoState(prev, updates))

      // 2. Merge with pending updates for the API call
      pendingUpdatesRef.current = mergePartials(pendingUpdatesRef.current, updates)

      // 3. Show saving status
      setSaveStatus('saving')

      // 4. Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // 5. Schedule the actual API call after debounce period
      debounceTimerRef.current = setTimeout(async () => {
        const updatesToSend = pendingUpdatesRef.current
        pendingUpdatesRef.current = null

        if (!updatesToSend) return

        try {
          await saveToApi(updatesToSend)
          setSaveStatus('saved')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          // On error, revert local state to server state
          if (serverData) {
            setLocalState(mergeIntoState(defaults, serverData as TPartial))
          }
          setSaveStatus('idle')
          toast.error(`Failed to save: ${errorMessage}`)
        }
      }, debounceMs)
    },
    [mergeIntoState, mergePartials, saveToApi, serverData, defaults, debounceMs]
  )

  return {
    localState,
    saveStatus,
    handleUpdate,
  }
}
