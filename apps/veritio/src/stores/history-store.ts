'use client'

/**
 * History Store
 *
 * Manages undo/redo functionality using the Command Pattern.
 * All editing operations are executed through this store for
 * automatic history tracking.
 */

import { create } from 'zustand'
import type { ICommand } from '@/lib/video-editor/commands/command-types'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HISTORY_SIZE = 100

// ─────────────────────────────────────────────────────────────────────────────
// State Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HistoryStoreState {
  /** Undo stack (most recent at end) */
  undoStack: ICommand[]
  /** Redo stack (most recent at end) */
  redoStack: ICommand[]
  /** Maximum history size */
  maxSize: number
  /** Whether currently executing a command (prevents re-entry) */
  isExecuting: boolean
  /** Last saved command index (for dirty state) */
  savedIndex: number

  // ─── Actions ─────────────────────────────────────

  /**
   * Execute a command and add it to history
   */
  execute: (command: ICommand) => Promise<void>

  /**
   * Undo the last command
   */
  undo: () => Promise<boolean>

  /**
   * Redo the last undone command
   */
  redo: () => Promise<boolean>

  /**
   * Clear all history
   */
  clear: () => void

  /**
   * Mark current state as saved
   */
  markSaved: () => void

  /**
   * Check if there are unsaved changes
   */
  isDirty: () => boolean

  /**
   * Get the last executed command
   */
  getLastCommand: () => ICommand | undefined

  /**
   * Get undo stack length
   */
  getUndoCount: () => number

  /**
   * Get redo stack length
   */
  getRedoCount: () => number

  // ─── Computed ────────────────────────────────────

  /** Can undo? */
  canUndo: boolean
  /** Can redo? */
  canRedo: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryStoreState>()((set, get) => ({
  // ─── Initial State ───────────────────────────────
  undoStack: [],
  redoStack: [],
  maxSize: MAX_HISTORY_SIZE,
  isExecuting: false,
  savedIndex: 0,
  canUndo: false,
  canRedo: false,

  // ─── Execute ─────────────────────────────────────

  execute: async (command) => {
    const { isExecuting, undoStack, maxSize } = get()

    // Prevent re-entry
    if (isExecuting) {
      return
    }

    set({ isExecuting: true })

    try {
      await command.execute()

      let newUndoStack = [...undoStack]

      // Try to merge with last command if possible
      const lastCommand = newUndoStack[newUndoStack.length - 1]
      if (lastCommand?.canMergeWith?.(command)) {
        newUndoStack[newUndoStack.length - 1] = lastCommand.mergeWith!(command)
      } else {
        newUndoStack.push(command)
      }

      // Enforce max size
      if (newUndoStack.length > maxSize) {
        newUndoStack = newUndoStack.slice(-maxSize)
      }

      set({
        undoStack: newUndoStack,
        redoStack: [],
        canUndo: newUndoStack.length > 0,
        canRedo: false,
      })
    } finally {
      set({ isExecuting: false })
    }
  },

  // ─── Undo ────────────────────────────────────────

  undo: async () => {
    const { undoStack, redoStack, isExecuting } = get()

    if (isExecuting || undoStack.length === 0) {
      return false
    }

    set({ isExecuting: true })

    try {
      // Pop command from undo stack
      const command = undoStack[undoStack.length - 1]
      const newUndoStack = undoStack.slice(0, -1)

      // Undo the command
      await command.undo()

      // Push to redo stack
      const newRedoStack = [...redoStack, command]

      set({
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        canUndo: newUndoStack.length > 0,
        canRedo: true,
      })

      return true
    } catch {
      return false
    } finally {
      set({ isExecuting: false })
    }
  },

  // ─── Redo ────────────────────────────────────────

  redo: async () => {
    const { undoStack, redoStack, isExecuting } = get()

    if (isExecuting || redoStack.length === 0) {
      return false
    }

    set({ isExecuting: true })

    try {
      // Pop command from redo stack
      const command = redoStack[redoStack.length - 1]
      const newRedoStack = redoStack.slice(0, -1)

      // Re-execute the command
      await command.execute()

      // Push to undo stack
      const newUndoStack = [...undoStack, command]

      set({
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        canUndo: true,
        canRedo: newRedoStack.length > 0,
      })

      return true
    } catch {
      return false
    } finally {
      set({ isExecuting: false })
    }
  },

  // ─── Clear ───────────────────────────────────────

  clear: () => {
    set({
      undoStack: [],
      redoStack: [],
      savedIndex: 0,
      canUndo: false,
      canRedo: false,
    })
  },

  // ─── Save State ──────────────────────────────────

  markSaved: () => {
    const { undoStack } = get()
    set({ savedIndex: undoStack.length })
  },

  isDirty: () => {
    const { undoStack, savedIndex } = get()
    return undoStack.length !== savedIndex
  },

  // ─── Getters ─────────────────────────────────────

  getLastCommand: () => {
    const { undoStack } = get()
    return undoStack[undoStack.length - 1]
  },

  getUndoCount: () => {
    return get().undoStack.length
  },

  getRedoCount: () => {
    return get().redoStack.length
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useCanUndo = () => useHistoryStore((state) => state.canUndo)

export const useCanRedo = () => useHistoryStore((state) => state.canRedo)

export const useUndoStack = () => useHistoryStore((state) => state.undoStack)

export const useRedoStack = () => useHistoryStore((state) => state.redoStack)

export const useHistoryActions = () =>
  useHistoryStore((state) => ({
    execute: state.execute,
    undo: state.undo,
    redo: state.redo,
    clear: state.clear,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  }))
