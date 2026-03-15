'use client'

import { useCallback, useState, useEffect } from 'react'
import { Figma } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { usePrototypeTestBuilderStore } from '@/stores/study-builder'
import { useAuthFetch, useFigmaConnection } from '@/hooks'
import {
  FigmaAccountSection,
  PrototypeInfoCard,
  PasswordProtectionSection,
  PrototypeOptionsSection,
} from './prototype-settings'

interface BuilderPrototypeSettingsPanelProps {
  studyId: string
}

export function BuilderPrototypeSettingsPanel({ studyId }: BuilderPrototypeSettingsPanelProps) {
  const authFetch = useAuthFetch()
  const {
    prototype,
    frames,
    settings,
    setPrototype,
    setFrames,
    setSettings,
    clearPrototype,
    setIsSyncing,
    isSyncing,
  } = usePrototypeTestBuilderStore()

  const {
    isConnected: isFigmaConnected,
    figmaUser,
    tokenHealth,
    connect: connectFigma,
    disconnect: disconnectFigma,
  } = useFigmaConnection()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Local state for password input - only sync to store on blur
  const [localPassword, setLocalPassword] = useState(prototype?.password || '')

  // Sync local password when prototype changes
  useEffect(() => {
    setLocalPassword(prototype?.password || '')
  }, [prototype?.password])

  // Handle password blur - sync to store
  const handlePasswordBlur = useCallback(() => {
    if (!prototype) return
    const newPassword = localPassword.trim() || null
    if (newPassword !== prototype.password) {
      setPrototype({ ...prototype, password: newPassword })
    }
  }, [prototype, localPassword, setPrototype])

  const handleSync = useCallback(async () => {
    if (!prototype) return

    setIsSyncing(true)
    try {
      const response = await authFetch(`/api/studies/${studyId}/prototype/sync`, {
        method: 'POST',
        timeout: 120_000,
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.requiresFigmaAuth) {
          toast.error('Please reconnect your Figma account')
          return
        }
        throw new Error(result.error || 'Failed to sync prototype')
      }

      if (result.data?.frames) {
        setFrames(result.data.frames)
      }
      if (result.data?.prototype) {
        setPrototype(result.data.prototype)
      }

      toast.success('Frames synced successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync')
    } finally {
      setIsSyncing(false)
    }
  }, [studyId, prototype, setFrames, setPrototype, setIsSyncing, authFetch])

  const handleConnectFigma = useCallback(async () => {
    setIsConnecting(true)
    try {
      await connectFigma()
    } catch {
      toast.error('Failed to connect to Figma')
    } finally {
      setIsConnecting(false)
    }
  }, [connectFigma])

  const handleDisconnectFigma = useCallback(async () => {
    try {
      await disconnectFigma()
      toast.success('Figma account disconnected')
    } catch {
      toast.error('Failed to disconnect Figma')
    }
  }, [disconnectFigma])

  const handleDeletePrototype = useCallback(async () => {
    setIsDeleting(true)
    try {
      const response = await authFetch(`/api/studies/${studyId}/prototype`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete prototype')
      }

      // Clear local state after successful database deletion
      clearPrototype()
      setShowDeleteDialog(false)
      toast.success('Prototype removed successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove prototype')
    } finally {
      setIsDeleting(false)
    }
  }, [studyId, clearPrototype, authFetch])

  // If no prototype yet, show empty state
  if (!prototype || !prototype.figma_url) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-6 flex flex-col items-center justify-center h-full min-h-[240px]">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Figma className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Import a prototype to configure settings
          </p>
        </div>
      </ScrollArea>
    )
  }

  // Extract file name from Figma URL for display
  const figmaFileName = (() => {
    try {
      const pathname = new URL(prototype.figma_url || '').pathname
      const name = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Figma prototype'
      return name.charAt(0).toUpperCase() + name.slice(1)
    } catch {
      return 'Figma prototype'
    }
  })()

  const frameCount = Array.isArray(frames) ? frames.length : 0

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1">
        <FigmaAccountSection
          isConnected={isFigmaConnected}
          figmaUser={figmaUser}
          tokenHealth={tokenHealth}
          isConnecting={isConnecting}
          onConnect={handleConnectFigma}
          onDisconnect={handleDisconnectFigma}
        />

        <hr className="border-border" />

        <PrototypeInfoCard
          figmaFileName={figmaFileName}
          figmaUrl={prototype.figma_url || ''}
          frameCount={frameCount}
          lastSyncedAt={prototype.last_synced_at}
          figmaFileModifiedAt={prototype.figma_file_modified_at}
          isSyncing={isSyncing}
          onSync={handleSync}
          onRemove={() => setShowDeleteDialog(true)}
        />

        <hr className="border-border" />

        <PasswordProtectionSection
          password={localPassword}
          onChange={setLocalPassword}
          onBlur={handlePasswordBlur}
        />

        <hr className="border-border" />

        <PrototypeOptionsSection
          settings={settings}
          onUpdate={setSettings}
        />
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Remove Prototype"
        description="Are you sure you want to remove this prototype? All tasks will also be deleted. This action cannot be undone."
        onConfirm={handleDeletePrototype}
        isDeleting={isDeleting}
        deleteLabel="Remove"
      />
    </ScrollArea>
  )
}
