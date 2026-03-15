'use client'

import { useCallback } from 'react'

/** Manages array state with add, remove, update, and move operations. */
export function useArrayManager<T>(
  items: T[],
  setItems: (items: T[]) => void
) {
  const add = useCallback(
    (item: T, index?: number) => {
      if (index !== undefined) {
        const newItems = [...items]
        newItems.splice(index, 0, item)
        setItems(newItems)
      } else {
        setItems([...items, item])
      }
    },
    [items, setItems]
  )

  const remove = useCallback(
    (index: number) => {
      setItems(items.filter((_, i) => i !== index))
    },
    [items, setItems]
  )

  const update = useCallback(
    (index: number, updates: Partial<T>) => {
      setItems(
        items.map((item, i) =>
          i === index ? { ...item, ...updates } : item
        )
      )
    },
    [items, setItems]
  )

  const replace = useCallback(
    (index: number, item: T) => {
      setItems(items.map((existing, i) => (i === index ? item : existing)))
    },
    [items, setItems]
  )

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newItems = [...items]
      const [removed] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, removed)
      setItems(newItems)
    },
    [items, setItems]
  )

  const clear = useCallback(() => {
    setItems([])
  }, [setItems])

  return {
    items,
    add,
    remove,
    update,
    replace,
    move,
    clear,
    isEmpty: items.length === 0,
    count: items.length,
  }
}
