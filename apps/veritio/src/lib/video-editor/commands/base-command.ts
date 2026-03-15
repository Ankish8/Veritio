/**
 * Base Command Implementation
 *
 * Abstract base class for all commands.
 * Provides common functionality and structure.
 */

import { nanoid } from 'nanoid'
import type { ICommand, CommandType, SerializedCommand } from './command-types'

/**
 * Abstract base class for commands
 */
export abstract class BaseCommand implements ICommand {
  readonly id: string
  readonly timestamp: number

  constructor(
    public readonly type: CommandType,
    public readonly description: string
  ) {
    this.id = nanoid()
    this.timestamp = Date.now()
  }

  /**
   * Execute the command - must be implemented by subclasses
   */
  abstract execute(): void | Promise<void>

  /**
   * Undo the command - must be implemented by subclasses
   */
  abstract undo(): void | Promise<void>

  /**
   * Check if this command can be merged with another
   * Override in subclasses for merge support
   */
  canMergeWith?(_other: ICommand): boolean {
    return false
  }

  /**
   * Merge this command with another
   * Override in subclasses for merge support
   */
  mergeWith?(_other: ICommand): ICommand {
    throw new Error('Merge not supported for this command type')
  }

  /**
   * Serialize command for persistence
   */
  serialize(): SerializedCommand {
    return {
      id: this.id,
      type: this.type,
      description: this.description,
      timestamp: this.timestamp,
      data: this.getSerializationData(),
    }
  }

  /**
   * Get command-specific data for serialization
   * Override in subclasses
   */
  protected abstract getSerializationData(): Record<string, unknown>
}
