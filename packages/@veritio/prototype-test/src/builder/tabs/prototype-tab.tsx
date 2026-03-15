'use client'

import { memo, useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle2, Link2 } from 'lucide-react'
import { toast, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@veritio/ui'
import {
  usePrototypeTestPrototype,
  usePrototypeTestFrames,
  usePrototypeTestIsSyncing,
  usePrototypeTestActions,
} from '../../stores/prototype-test-builder'
import { useAuthFetch, useFigmaConnection } from '../../hooks'
import { FigmaImportDialog } from '../figma-import-dialog'
import { PrototypePreview } from '../prototype-preview'

interface PrototypeTabProps {
  studyId: string
}

function PrototypeTabComponent({ studyId }: PrototypeTabProps) {
  const authFetch = useAuthFetch()

  // Use granular selectors for performance - each only subscribes to its slice
  const prototype = usePrototypeTestPrototype()
  const frames = usePrototypeTestFrames()
  const isSyncing = usePrototypeTestIsSyncing()
  const { setPrototype, setFrames, setIsSyncing } = usePrototypeTestActions()

  // Note: Settings (password, sync, change prototype, remove) are now in the
  // BuilderPrototypeSettingsPanel which appears in the floating action bar

  // Figma OAuth connection status
  const {
    isConnected: isFigmaConnected,
    figmaUser,
    connect: connectFigma,
    disconnect: disconnectFigma,
    isLoading: isFigmaLoading,
  } = useFigmaConnection()

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Handle Figma OAuth connection
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

  // Handle Figma disconnect
  const handleDisconnectFigma = useCallback(async () => {
    try {
      await disconnectFigma()
      toast.success('Figma account disconnected')
    } catch {
      toast.error('Failed to disconnect Figma')
    }
  }, [disconnectFigma])

  const handleImport = useCallback(async (figmaUrl: string) => {
    setIsImporting(true)
    let importedPrototype: typeof prototype = null

    try {
      // Call API to create/update prototype
      const response = await authFetch(`/api/studies/${studyId}/prototype`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figma_url: figmaUrl }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import prototype')
      }

      // API returns { data: prototype }
      if (result.data && result.data.figma_url) {
        importedPrototype = result.data
        setPrototype(result.data)
      } else {
        throw new Error('Server did not return valid prototype data')
      }

      // Sync frames immediately after import
      // Figma sync involves multiple sequential API calls (metadata, thumbnails,
      // component variants, instances) — allow 120s instead of the default 30s
      setIsSyncing(true)
      const syncResponse = await authFetch(`/api/studies/${studyId}/prototype/sync`, {
        method: 'POST',
        timeout: 120_000,
      })

      const syncResult = await syncResponse.json()

      if (!syncResponse.ok) {
        // Check if user needs to connect Figma
        if (syncResult.requiresFigmaAuth) {
          toast.error('Please connect your Figma account to import prototypes')
          return
        }
        throw new Error(syncResult.error || 'Failed to sync frames')
      }

      // Update with sync results if available
      if (syncResult.data) {
        if (Array.isArray(syncResult.data.frames)) {
          setFrames(syncResult.data.frames)
        }
        if (syncResult.data.prototype && syncResult.data.prototype.figma_url) {
          importedPrototype = syncResult.data.prototype
          setPrototype(syncResult.data.prototype)
        }
      }

      // Only show success if we actually have a valid prototype
      if (importedPrototype && importedPrototype.figma_url) {
        toast.success('Prototype imported successfully')
        setImportDialogOpen(false)
      } else {
        throw new Error('Failed to import prototype - no data received')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import prototype')
    } finally {
      setIsImporting(false)
      setIsSyncing(false)
    }
  }, [studyId, setPrototype, setFrames, setIsSyncing, authFetch])

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

  // Handle starting frame change - must be before early returns to satisfy Rules of Hooks
  const handleStartingFrameChange = useCallback((frameId: string | null) => {
    if (!prototype) return
    setPrototype({ ...prototype, starting_frame_id: frameId })
  }, [prototype, setPrototype])

  // Loading state
  if (isFigmaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No prototype yet - show import UI
  if (!prototype || !prototype.figma_url) {
    return (
      <div className="space-y-6">
        {/* Figma Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
              Figma Connection
            </CardTitle>
            <CardDescription>
              Connect your Figma account to import and sync prototypes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFigmaConnected ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected to Figma</p>
                    <p className="text-sm text-muted-foreground">
                      {figmaUser?.handle ? `@${figmaUser.handle}` : figmaUser?.email || 'Connected'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnectFigma}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center p-6 border-2 border-dashed rounded-lg">
                <Link2 className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Connect your Figma account</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  To import prototypes, you need to connect your Figma account. This allows us to access files you have permission to view.
                </p>
                <Button onClick={handleConnectFigma} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect to Figma
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Prototype Card - only show when connected */}
        {isFigmaConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Import Figma Prototype</CardTitle>
              <CardDescription>
                Paste a Figma prototype link to create tasks for your usability test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No prototype connected</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Import a Figma prototype link to get started. You&apos;ll be able to
                  create tasks and track how participants navigate through your design.
                </p>
                <Button onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Figma Prototype
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <FigmaImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImport}
          isImporting={isImporting}
        />
      </div>
    )
  }

  // Prototype connected - full width preview with controls (settings in floating panel)
  return (
    <div className="h-[calc(100vh-180px)]">
      <div className="h-full overflow-hidden border rounded-lg bg-white">
        {/* PrototypePreview with built-in controls (non-contained mode) */}
        <PrototypePreview
          prototype={prototype}
          frames={frames}
          enableControls
          className="w-full h-full"
          onStartingFrameChange={handleStartingFrameChange}
        />
      </div>

      <FigmaImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isImporting={isImporting}
      />
    </div>
  )
}

export const PrototypeTab = memo(
  PrototypeTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
