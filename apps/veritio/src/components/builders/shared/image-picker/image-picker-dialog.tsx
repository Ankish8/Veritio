'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Image as ImageIcon, Loader2, Link2, CheckCircle2, X, Eye, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HoverCard, HoverCardContent, HoverCardTrigger, HoverCardArrow } from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import { useFigmaConnection } from '@/hooks'
import { useFigmaImport, type FigmaFramePreview } from '@/hooks/use-figma-import'
import type { ImageData, ImagePickerDialogProps } from './types'

export function ImagePickerDialog({
  open,
  onOpenChange,
  studyId,
  entityId: _entityId,  
  currentImage: _currentImage,  
  onImageSelected,
  getExistingImages,
  uploadImage,
}: ImagePickerDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showFigmaUrlInput, setShowFigmaUrlInput] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [previewOpenId, setPreviewOpenId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingImages = getExistingImages()

  const {
    isConnected: isFigmaConnected,
    figmaUser,
    connect: connectFigma,
    disconnect: disconnectFigma,
    isLoading: isFigmaLoading,
  } = useFigmaConnection()

  const figmaImport = useFigmaImport({
    studyId,
    onLoadComplete: () => {
      setShowFigmaUrlInput(false)
    },
  })

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }

      setUploading(true)
      try {
        const result = await uploadImage(file)

        const newImage: ImageData = {
          image_url: result.url,
          original_filename: result.filename,
          width: result.width,
          height: result.height,
          source_type: 'upload',
        }

        onImageSelected(newImage)
        onOpenChange(false)
        toast.success(`${result.filename} uploaded successfully`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload image')
      } finally {
        setUploading(false)
      }
    },
    [uploadImage, onImageSelected, onOpenChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleConnectFigma = useCallback(async () => {
    setIsConnecting(true)
    try {
      await connectFigma()
      setShowFigmaUrlInput(true)
    } catch {
      toast.error('Failed to connect to Figma')
    } finally {
      setIsConnecting(false)
    }
  }, [connectFigma])

  const handleSelectImage = useCallback((image: ImageData) => {
    setSelectedImage(image)
    setSelectedFrameId(null)
  }, [])

  const handleSelectFrame = useCallback((frame: FigmaFramePreview) => {
    const imageData: ImageData = {
      image_url: frame.thumbnailUrl || '',
      original_filename: frame.name,
      width: null,
      height: null,
      source_type: 'figma',
      figma_file_key: figmaImport.figmaUrl.split('/file/')[1]?.split('/')[0] || null,
      figma_node_id: frame.nodeId,
    }
    setSelectedImage(imageData)
    setSelectedFrameId(frame.nodeId)
  }, [figmaImport.figmaUrl])

  const handleConfirmSelection = useCallback(async () => {
    if (!selectedImage) return

    if (selectedFrameId) {
      const existing = figmaImport.getImportedImage(selectedFrameId)
      if (existing) {
        const { image_url, original_filename, width, height, source_type, figma_file_key, figma_node_id } = existing
        onImageSelected({ image_url, original_filename, width, height, source_type, figma_file_key, figma_node_id })
        onOpenChange(false)
        return
      }

      const frame = figmaImport.loadedFrames.find(f => f.nodeId === selectedFrameId)
      if (frame) {
        const imported = await figmaImport.importFrame(frame)
        if (imported) {
          const { image_url, original_filename, width, height, source_type, figma_file_key, figma_node_id } = imported
          onImageSelected({ image_url, original_filename, width, height, source_type, figma_file_key, figma_node_id })
          onOpenChange(false)
        }
      }
    } else {
      onImageSelected(selectedImage)
      onOpenChange(false)
    }
  }, [selectedImage, selectedFrameId, figmaImport, onImageSelected, onOpenChange])

  const hasImages = existingImages.length > 0 || figmaImport.loadedFrames.length > 0

  // Figma URL input bar (shared between empty and has-images states)
  const figmaUrlBar = showFigmaUrlInput && isFigmaConnected && (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="https://www.figma.com/file/... or /proto/... or /design/..."
        value={figmaImport.figmaUrl}
        onChange={(e) => figmaImport.setFigmaUrl(e.target.value)}
        className="flex-1 font-mono text-xs h-9"
        autoFocus
      />
      <Button
        size="sm"
        onClick={figmaImport.loadFrames}
        disabled={!figmaImport.figmaUrl.trim() || figmaImport.isLoadingFrames}
      >
        {figmaImport.isLoadingFrames ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Loading...
          </>
        ) : (
          'Load Frames'
        )}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowFigmaUrlInput(false)}>
        Cancel
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Choose Design Image</DialogTitle>
        </DialogHeader>

        {/* Main Content Area */}
        <div
          className="flex-1 overflow-auto"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />

          {!hasImages ? (
            /* ============ EMPTY STATE ============ */
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-2xl space-y-6">
                {/* Two option cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Upload option */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[200px]',
                      uploading
                        ? 'border-primary bg-primary/5'
                        : dragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/20 hover:border-primary hover:bg-muted/30'
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Upload Image</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Drop file or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            PNG, JPG, GIF, WebP, SVG &middot; Max 5MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Figma option */}
                  <div
                    onClick={() => {
                      if (isFigmaLoading) return
                      if (!isFigmaConnected) {
                        handleConnectFigma()
                      } else {
                        setShowFigmaUrlInput(true)
                      }
                    }}
                    className={cn(
                      'rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[200px]',
                      'border-muted-foreground/20 hover:border-primary hover:bg-muted/30'
                    )}
                  >
                    {isFigmaLoading || isConnecting ? (
                      <>
                        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Connecting to Figma...</p>
                      </>
                    ) : isFigmaConnected ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Import from Figma</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Connected as {figmaUser?.handle ? `@${figmaUser.handle}` : figmaUser?.email || 'Figma user'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Link2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Import from Figma</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Connect your account to import frames
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Figma URL input (below the cards when active) */}
                {figmaUrlBar && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Paste your Figma file URL (Share &rarr; Copy link)
                    </p>
                    {figmaUrlBar}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============ HAS IMAGES STATE ============ */
            <div className="h-full flex flex-col">
              {/* Compact toolbar */}
              <div className="border-b px-6 py-3 flex items-center justify-between bg-muted/5">
                <div className="flex items-center gap-3">
                  {isFigmaConnected && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span>Figma connected</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isFigmaConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFigmaUrlInput(!showFigmaUrlInput)}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Import Frames
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={disconnectFigma}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleConnectFigma} disabled={isConnecting || isFigmaLoading}>
                      {isConnecting || isFigmaLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Connect Figma
                    </Button>
                  )}
                  {figmaImport.loadedFrames.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        figmaImport.clearLibrary()
                        setSelectedImage(null)
                        setSelectedFrameId(null)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Figma URL input bar (inline) */}
              {figmaUrlBar && (
                <div className="border-b px-6 py-3 bg-muted/5">
                  {figmaUrlBar}
                </div>
              )}

              {/* Image grid */}
              <div className="flex-1 overflow-auto p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Select an image from your library
                  </h3>
                  <div
                    className={cn(
                      'grid grid-cols-4 gap-4 rounded-lg transition-all',
                      dragActive && 'ring-2 ring-primary ring-offset-4'
                    )}
                  >
                    {/* Loaded Figma frames */}
                    {figmaImport.loadedFrames.map((frame) => {
                      const isImporting = figmaImport.isFrameImporting(frame.nodeId)
                      const isSelected = selectedFrameId === frame.nodeId
                      const previewId = `frame-${frame.nodeId}`
                      const isPreviewOpen = previewOpenId === previewId

                      return (
                        <HoverCard
                          key={frame.nodeId}
                          open={isPreviewOpen}
                          onOpenChange={(open) => setPreviewOpenId(open ? previewId : null)}
                        >
                          <div
                            onClick={() => !isImporting && handleSelectFrame(frame)}
                            className={cn(
                              'relative group rounded-lg overflow-hidden transition-all',
                              isImporting
                                ? 'opacity-70 cursor-wait border-2'
                                : 'hover:border-primary hover:shadow-md cursor-pointer border-2',
                              isSelected ? 'border-primary' : 'border-transparent'
                            )}
                          >
                            <div className="aspect-[4/3] bg-muted">
                              {frame.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={frame.thumbnailUrl}
                                  alt={frame.name}
                                  className="w-full h-full object-contain p-2"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 bg-background border-t">
                              <p className="text-xs font-medium truncate">{frame.name}</p>
                              <p className="text-xs text-muted-foreground">Figma</p>
                            </div>

                            {/* Preview Button */}
                            <HoverCardTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-2 right-2 w-7 h-7 bg-background/90 hover:bg-background border rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                title="Preview"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </HoverCardTrigger>

                            {/* Remove Button */}
                            {!isImporting && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  figmaImport.removeFrame(frame.nodeId)
                                  if (selectedFrameId === frame.nodeId) {
                                    setSelectedImage(null)
                                    setSelectedFrameId(null)
                                  }
                                }}
                                className="absolute top-2 left-2 w-6 h-6 bg-background/90 hover:bg-destructive hover:text-white border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                title="Remove from library"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {isImporting && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              </div>
                            )}

                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-green-500/90 rounded-full flex items-center justify-center shadow-sm">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                          <HoverCardContent
                            side="right"
                            sideOffset={12}
                            className="w-96 p-0 shadow-2xl border-2"
                          >
                            <HoverCardArrow className="fill-border" />
                            <div className="p-4 space-y-3">
                              <div className="rounded-lg border-2 bg-muted/30 p-4 flex items-center justify-center max-h-80">
                                {frame.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={frame.thumbnailUrl}
                                    alt={frame.name}
                                    className="max-w-full max-h-72 object-contain rounded"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center gap-2 py-8">
                                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-xs text-muted-foreground">No preview available</p>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium truncate">{frame.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">From Figma</p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )
                    })}

                    {/* Existing images from other designs */}
                    {existingImages.map((image, index) => {
                      const isSelected = !selectedFrameId && selectedImage?.image_url === image.image_url
                      const previewId = `image-${index}`
                      const isPreviewOpen = previewOpenId === previewId

                      return (
                        <HoverCard
                          key={index}
                          open={isPreviewOpen}
                          onOpenChange={(open) => setPreviewOpenId(open ? previewId : null)}
                        >
                          <div
                            onClick={() => handleSelectImage(image)}
                            className={cn(
                              'relative group rounded-lg overflow-hidden transition-all hover:border-primary hover:shadow-md cursor-pointer border-2',
                              isSelected ? 'border-primary' : 'border-transparent'
                            )}
                          >
                            <div className="aspect-[4/3] bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.image_url}
                                alt={image.original_filename || 'Design image'}
                                className="w-full h-full object-contain p-2"
                              />
                            </div>
                            <div className="p-3 bg-background border-t">
                              <p className="text-xs font-medium truncate">
                                {image.original_filename || 'Image'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {image.source_type === 'figma' ? 'Figma' : 'Uploaded'}
                              </p>
                            </div>

                            {/* Preview Button */}
                            <HoverCardTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-2 right-2 w-7 h-7 bg-background/90 hover:bg-background border rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                title="Preview"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </HoverCardTrigger>

                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-green-500/90 rounded-full flex items-center justify-center shadow-sm">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                          <HoverCardContent
                            side="right"
                            sideOffset={12}
                            className="w-96 p-0 shadow-2xl border-2"
                          >
                            <HoverCardArrow className="fill-border" />
                            <div className="p-4 space-y-3">
                              <div className="rounded-lg border-2 bg-muted/30 p-4 flex items-center justify-center max-h-80">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={image.image_url}
                                  alt={image.original_filename || 'Preview'}
                                  className="max-w-full max-h-72 object-contain rounded"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium truncate">
                                  {image.original_filename || 'Untitled'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  {image.width && image.height && (
                                    <span>
                                      {image.width} &times; {image.height} px
                                    </span>
                                  )}
                                  {image.source_type === 'figma' && <span>&middot; Figma</span>}
                                  {image.source_type === 'upload' && <span>&middot; Uploaded</span>}
                                </div>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )
                    })}

                    {/* Upload tile at end of grid */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pt-4 pb-6 border-t mt-auto">
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedImage || (selectedFrameId !== null && figmaImport.isFrameImporting(selectedFrameId))}
            size="lg"
            className="min-w-[140px]"
          >
            {selectedFrameId !== null && figmaImport.isFrameImporting(selectedFrameId) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Select Image'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
