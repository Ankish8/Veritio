/**
 * Supabase Persistence Provider for Yjs
 *
 * Stores Yjs document state as binary data in Supabase.
 * Used as the durable backup layer (LevelDB is the fast cache).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface SupabasePersistenceConfig {
  url: string
  serviceKey: string
  tableName?: string
}

export class SupabasePersistence {
  private client: SupabaseClient
  private tableName: string

  constructor(config: SupabasePersistenceConfig) {
    this.client = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    this.tableName = config.tableName || 'yjs_documents'
  }

  /**
   * Get Yjs document state from Supabase
   */
  async getYDoc(docName: string): Promise<Uint8Array | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('state')
        .eq('doc_name', docName)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - document doesn't exist yet
          return null
        }
        console.error(`[Supabase] Error fetching document ${docName}:`, error)
        return null
      }

      if (!data?.state) return null

      // State is stored as base64 in bytea column
      // Supabase returns bytea as a hex string prefixed with \x
      const stateStr = data.state as string
      if (stateStr.startsWith('\\x')) {
        // Hex format from PostgreSQL bytea
        const hex = stateStr.slice(2)
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
        }
        return bytes
      }

      // Fallback: assume base64
      const binaryString = atob(stateStr)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    } catch (error) {
      console.error(`[Supabase] Error fetching document ${docName}:`, error)
      return null
    }
  }

  /**
   * Store Yjs document state to Supabase
   */
  async storeDocument(docName: string, state: Uint8Array): Promise<boolean> {
    try {
      // Convert Uint8Array to hex string for bytea column
      const hexString =
        '\\x' +
        Array.from(state)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

      const { error } = await this.client.from(this.tableName).upsert(
        {
          doc_name: docName,
          state: hexString,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'doc_name',
        }
      )

      if (error) {
        console.error(`[Supabase] Error storing document ${docName}:`, error)
        return false
      }

      return true
    } catch (error) {
      console.error(`[Supabase] Error storing document ${docName}:`, error)
      return false
    }
  }

  /**
   * Delete a Yjs document from Supabase
   */
  async deleteDocument(docName: string): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.tableName).delete().eq('doc_name', docName)

      if (error) {
        console.error(`[Supabase] Error deleting document ${docName}:`, error)
        return false
      }

      return true
    } catch (error) {
      console.error(`[Supabase] Error deleting document ${docName}:`, error)
      return false
    }
  }

  /**
   * Check if Supabase connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.tableName).select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }
}
