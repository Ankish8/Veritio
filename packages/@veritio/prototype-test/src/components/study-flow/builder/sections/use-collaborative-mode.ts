'use client'

import { useYjsOptional } from '@veritio/prototype-test/components/yjs/yjs-provider'
export function useCollaborativeMode(): boolean {
  const yjs = useYjsOptional()
  return !!(yjs?.doc && yjs?.provider && yjs?.isConnected)
}
