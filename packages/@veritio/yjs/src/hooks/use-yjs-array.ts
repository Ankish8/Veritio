'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import * as Y from 'yjs'

interface UseYjsArrayOptions<T> {
  doc: Y.Doc | null
  fieldPath: string
  isSynced?: boolean
  initialItems?: T[]
}

interface UseYjsArrayReturn<T> {
  items: T[]
  addItem: (item: T, index?: number) => void
  updateItem: (id: string, updates: Partial<T>) => void
  removeItem: (id: string) => void
  setItems: (items: T[]) => void
  moveItem: (fromIndex: number, toIndex: number) => void
  yarray: Y.Array<Y.Map<unknown>> | null
  isReady: boolean
}
function ymapToObject<T>(ymap: Y.Map<unknown>): T {
  const obj: Record<string, unknown> = {}
  ymap.forEach((value, key) => {
    obj[key] = value
  })
  return obj as T
}
function objectToYMapEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.entries(obj).filter(([_key, value]) => value !== undefined)
}

export function useYjsArray<T extends { id: string }>({
  doc,
  fieldPath,
  isSynced = true,
  initialItems,
}: UseYjsArrayOptions<T>): UseYjsArrayReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [isReady, setIsReady] = useState(false)
  const yarrayRef = useRef<Y.Array<Y.Map<unknown>> | null>(null)
  const hasInitializedRef = useRef(false)

  // Initialize Y.Array and subscribe to changes
  useEffect(() => {
    if (!doc) {
      setItems([])
      setIsReady(false)
      yarrayRef.current = null
      return
    }

    // Get or create the Y.Array at the field path
    const yarray = doc.getArray<Y.Map<unknown>>(fieldPath)
    yarrayRef.current = yarray

    // Function to sync Y.Array to React state
    const syncToState = () => {
      const newItems: T[] = []
      yarray.forEach((ymap) => {
        newItems.push(ymapToObject<T>(ymap))
      })
      setItems(newItems)
    }

    // Set initial value
    syncToState()
    setIsReady(true)

    // Observer for deep changes (handles both array and nested map changes)
    const observer = (_events: Y.YArrayEvent<Y.Map<unknown>>) => {
      syncToState()
    }

    // Also observe each Y.Map item for property changes
    const mapObservers = new Map<Y.Map<unknown>, () => void>()

    const setupMapObservers = () => {
      // Clear old observers
      mapObservers.forEach((unobserve, ymap) => {
        ymap.unobserve(unobserve)
      })
      mapObservers.clear()

      // Set up new observers
      yarray.forEach((ymap) => {
        const mapObserver = () => syncToState()
        ymap.observe(mapObserver)
        mapObservers.set(ymap, mapObserver)
      })
    }

    setupMapObservers()
    yarray.observe(observer)

    // Re-setup map observers when array changes
    const arrayChangeObserver = () => {
      setupMapObservers()
    }
    yarray.observe(arrayChangeObserver)

    return () => {
      yarray.unobserve(observer)
      yarray.unobserve(arrayChangeObserver)
      mapObservers.forEach((unobserve, ymap) => {
        ymap.unobserve(unobserve)
      })
    }
  }, [doc, fieldPath])

  // Initialize with initial items ONLY if array is empty after sync
  useEffect(() => {
    const yarray = yarrayRef.current
    if (
      isReady &&
      isSynced &&
      initialItems &&
      initialItems.length > 0 &&
      yarray &&
      yarray.length === 0 &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true
      doc?.transact(() => {
        initialItems.forEach((item) => {
          const ymap = new Y.Map<unknown>()
          objectToYMapEntries(item as Record<string, unknown>).forEach(([key, value]) => {
            ymap.set(key, value)
          })
          yarray.push([ymap])
        })
      })
    }
  }, [isReady, isSynced, initialItems, doc])

  // Add an item to the array
  const addItem = useCallback((item: T, index?: number) => {
    const yarray = yarrayRef.current
    if (!yarray) return

    const ymap = new Y.Map<unknown>()
    objectToYMapEntries(item as Record<string, unknown>).forEach(([key, value]) => {
      ymap.set(key, value)
    })

    if (index !== undefined && index >= 0 && index <= yarray.length) {
      yarray.insert(index, [ymap])
    } else {
      yarray.push([ymap])
    }
  }, [])

  // Update an item by its id
  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    const yarray = yarrayRef.current
    if (!yarray) return

    // Find the Y.Map with matching id
    let targetIndex = -1
    yarray.forEach((ymap, index) => {
      if (ymap.get('id') === id) {
        targetIndex = index
      }
    })

    if (targetIndex === -1) return

    const ymap = yarray.get(targetIndex)
    if (!ymap) return

    // Update properties in a transaction
    yarray.doc?.transact(() => {
      objectToYMapEntries(updates as Record<string, unknown>).forEach(([key, value]) => {
        ymap.set(key, value)
      })
    })
  }, [])

  // Remove an item by its id
  const removeItem = useCallback((id: string) => {
    const yarray = yarrayRef.current
    if (!yarray) return

    // Find the index of the item with matching id
    let targetIndex = -1
    yarray.forEach((ymap, index) => {
      if (ymap.get('id') === id) {
        targetIndex = index
      }
    })

    if (targetIndex !== -1) {
      yarray.delete(targetIndex, 1)
    }
  }, [])

  // Replace all items (use sparingly)
  const setAllItems = useCallback((newItems: T[]) => {
    const yarray = yarrayRef.current
    if (!yarray) return

    yarray.doc?.transact(() => {
      // Clear existing items
      yarray.delete(0, yarray.length)

      // Add new items
      newItems.forEach((item) => {
        const ymap = new Y.Map<unknown>()
        objectToYMapEntries(item as Record<string, unknown>).forEach(([key, value]) => {
          ymap.set(key, value)
        })
        yarray.push([ymap])
      })
    })
  }, [])

  // Move an item to a new index
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    const yarray = yarrayRef.current
    if (!yarray || fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= yarray.length) return
    if (toIndex < 0 || toIndex >= yarray.length) return

    yarray.doc?.transact(() => {
      // Get the item at fromIndex
      const item = yarray.get(fromIndex)
      if (!item) return

      // Clone the Y.Map data
      const itemData: Record<string, unknown> = {}
      item.forEach((value, key) => {
        itemData[key] = value
      })

      // Delete from old position
      yarray.delete(fromIndex, 1)

      // Create new Y.Map and insert at new position
      const newYmap = new Y.Map<unknown>()
      Object.entries(itemData).forEach(([key, value]) => {
        newYmap.set(key, value)
      })

      // Adjust toIndex if we deleted an item before it
      const adjustedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
      yarray.insert(adjustedIndex, [newYmap])
    })
  }, [])

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    setItems: setAllItems,
    moveItem,
    yarray: yarrayRef.current,
    isReady,
  }
}
