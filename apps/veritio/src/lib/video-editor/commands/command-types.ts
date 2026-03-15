/**
 * Command Types and Interfaces
 *
 * Implements the Command Pattern for undo/redo functionality.
 * All editing operations are encapsulated as commands.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Command Types
// ─────────────────────────────────────────────────────────────────────────────

/** Available command types */
export type CommandType =
  // Clip commands
  | 'split-clip'
  | 'trim-clip'
  | 'move-clip'
  | 'copy-clip'
  | 'delete-clip'
  | 'ripple-delete-clip'
  | 'create-clip'
  // Annotation commands
  | 'add-annotation'
  | 'update-annotation'
  | 'delete-annotation'
  | 'move-annotation'
  // Track commands
  | 'update-track'
  | 'reorder-tracks'
  // Batch commands
  | 'batch'

// ─────────────────────────────────────────────────────────────────────────────
// Command Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ICommand Interface
 *
 * All editing operations implement this interface.
 * Commands support execute/undo for the history stack.
 */
export interface ICommand {
  /** Unique command identifier */
  id: string
  /** Command type */
  type: CommandType
  /** Human-readable description for undo/redo menu */
  description: string
  /** Timestamp when command was created */
  timestamp: number

  /**
   * Execute the command
   * @returns Promise that resolves when command is complete
   */
  execute(): void | Promise<void>

  /**
   * Undo the command (reverse the operation)
   * @returns Promise that resolves when undo is complete
   */
  undo(): void | Promise<void>

  /**
   * Check if this command can be merged with another
   * Used for continuous operations (e.g., dragging)
   */
  canMergeWith?(other: ICommand): boolean

  /**
   * Merge this command with another
   * Returns a new merged command
   */
  mergeWith?(other: ICommand): ICommand

  /**
   * Serialize command for persistence
   */
  serialize(): SerializedCommand
}

/** Serialized command for persistence/storage */
export interface SerializedCommand {
  id: string
  type: CommandType
  description: string
  timestamp: number
  data: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Data Types
// ─────────────────────────────────────────────────────────────────────────────

/** Data for split clip command */
export interface SplitClipData {
  /** Original clip ID */
  clipId: string
  /** Track ID containing the clip */
  trackId: string
  /** Time at which to split (ms) */
  splitTimeMs: number
  /** Created left clip ID (for undo) */
  leftClipId?: string
  /** Created right clip ID (for undo) */
  rightClipId?: string
}

/** Data for trim clip command */
export interface TrimClipData {
  /** Clip ID */
  clipId: string
  /** Track ID */
  trackId: string
  /** Original start time */
  originalStartMs: number
  /** Original end time */
  originalEndMs: number
  /** New start time */
  newStartMs: number
  /** New end time */
  newEndMs: number
}

/** Data for move clip command */
export interface MoveClipData {
  /** Clip ID */
  clipId: string
  /** Original track ID */
  originalTrackId: string
  /** New track ID (may be same as original) */
  newTrackId: string
  /** Original start time */
  originalStartMs: number
  /** New start time */
  newStartMs: number
}

/** Data for copy clip command */
export interface CopyClipData {
  /** Source clip ID */
  sourceClipId: string
  /** Track ID */
  trackId: string
  /** New clip start time */
  newStartMs: number
  /** Created clip ID (for undo) */
  createdClipId?: string
}

/** Data for delete clip command */
export interface DeleteClipData {
  /** Clip ID */
  clipId: string
  /** Track ID */
  trackId: string
  /** Deleted clip data (for undo) */
  clipData?: Record<string, unknown>
}

/** Data for ripple delete command */
export interface RippleDeleteData {
  /** Clip ID to delete */
  clipId: string
  /** Track ID */
  trackId: string
  /** Duration of gap to ripple (ms) */
  gapDurationMs: number
  /** Deleted clip data (for undo) */
  deletedClipData?: Record<string, unknown>
  /** Original positions of shifted clips (for undo) */
  shiftedClips?: Array<{ clipId: string; originalStartMs: number; originalEndMs: number }>
}

/** Data for annotation commands */
export interface AnnotationCommandData {
  /** Annotation ID */
  annotationId: string
  /** Track ID */
  trackId: string
  /** Full annotation data (for create/undo) */
  annotationData?: Record<string, unknown>
  /** Previous annotation data (for update undo) */
  previousData?: Record<string, unknown>
  /** Updated annotation data */
  updatedData?: Record<string, unknown>
}

/** Data for track update command */
export interface UpdateTrackData {
  /** Track ID */
  trackId: string
  /** Previous properties */
  previousProperties: Record<string, unknown>
  /** New properties */
  newProperties: Record<string, unknown>
}

/** Data for batch command */
export interface BatchCommandData {
  /** Child commands */
  commands: ICommand[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Factory Types
// ─────────────────────────────────────────────────────────────────────────────

/** Options for creating commands */
export interface CommandOptions {
  /** Skip adding to history (for internal operations) */
  skipHistory?: boolean
  /** Merge with previous command if possible */
  mergeWithPrevious?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// History Types
// ─────────────────────────────────────────────────────────────────────────────

/** History state for undo/redo */
export interface HistoryState {
  /** Undo stack */
  undoStack: ICommand[]
  /** Redo stack */
  redoStack: ICommand[]
  /** Maximum history size */
  maxSize: number
  /** Whether currently executing a command */
  isExecuting: boolean
}

/** Default history configuration */
export const DEFAULT_HISTORY_CONFIG = {
  maxSize: 100,
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Events
// ─────────────────────────────────────────────────────────────────────────────

/** Events emitted by the command system */
export type CommandEvent =
  | { type: 'execute'; command: ICommand }
  | { type: 'undo'; command: ICommand }
  | { type: 'redo'; command: ICommand }
  | { type: 'clear' }
