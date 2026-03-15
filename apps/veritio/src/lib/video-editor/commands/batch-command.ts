/**
 * Batch Command
 *
 * A composite command that groups multiple commands together.
 * Useful for operations that affect multiple items at once.
 */

import { nanoid } from 'nanoid'
import type { ICommand, CommandType, SerializedCommand } from './command-types'

/**
 * Batch command that executes multiple commands as a single undo/redo unit
 */
export class BatchCommand implements ICommand {
  readonly id: string
  readonly type: CommandType = 'batch'
  readonly timestamp: number

  constructor(
    private commands: ICommand[],
    public readonly description: string = 'Batch operation'
  ) {
    this.id = nanoid()
    this.timestamp = Date.now()
  }

  /**
   * Execute all commands in order
   */
  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute()
    }
  }

  /**
   * Undo all commands in reverse order
   */
  async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      await this.commands[i].undo()
    }
  }

  /**
   * Batch commands cannot be merged
   */
  canMergeWith(): boolean {
    return false
  }

  /**
   * Serialize the batch command
   */
  serialize(): SerializedCommand {
    return {
      id: this.id,
      type: this.type,
      description: this.description,
      timestamp: this.timestamp,
      data: {
        commands: this.commands.map((cmd) => cmd.serialize()),
      },
    }
  }

  /**
   * Get the number of commands in this batch
   */
  get count(): number {
    return this.commands.length
  }

  /**
   * Get commands in this batch
   */
  getCommands(): readonly ICommand[] {
    return this.commands
  }
}

/**
 * Helper to create a batch command from multiple commands
 */
export function createBatchCommand(
  commands: ICommand[],
  description?: string
): BatchCommand {
  return new BatchCommand(commands, description)
}
