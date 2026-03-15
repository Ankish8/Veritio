'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, Download, Palette, RotateCcw } from 'lucide-react'

interface QRCodeCardProps {
  participantUrl: string
  isDraft: boolean
  isReadOnly?: boolean
  primaryColor?: string
  logoUrl?: string
}

function buildQrConfig(
  data: string,
  color: string,
  logoUrl: string | undefined,
  size: number,
  renderType: 'canvas' | 'svg'
) {
  return {
    width: size,
    height: size,
    type: renderType,
    data,
    dotsOptions: { color, type: 'rounded' as const },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { color, type: 'extra-rounded' as const },
    cornersDotOptions: { color, type: 'dot' as const },
    imageOptions: { crossOrigin: 'anonymous' as const, margin: size === 200 ? 5 : 20 },
    ...(logoUrl && { image: logoUrl }),
  }
}

export const QRCodeCard = memo(function QRCodeCard({
  participantUrl,
  isDraft,
  isReadOnly = false,
  primaryColor = '#000000',
  logoUrl,
}: QRCodeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const qrCodeInstanceRef = useRef<any>(null)
  const [qrLoaded, setQrLoaded] = useState(false)
  const [customColor, setCustomColor] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const effectiveColor = customColor || primaryColor

  useEffect(() => {
    if (!participantUrl || isDraft) {
      setQrLoaded(false)
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      return
    }

    let mounted = true

    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (!mounted) return

      const qrCode = new QRCodeStyling(buildQrConfig(participantUrl, effectiveColor, logoUrl, 200, 'canvas'))

      if (containerRef.current && mounted) {
        containerRef.current.innerHTML = ''
        qrCode.append(containerRef.current)
        qrCodeInstanceRef.current = qrCode
        setQrLoaded(true)
      }
    }).catch(() => {
      if (mounted) setQrLoaded(false)
    })

    return () => {
      mounted = false
      qrCodeInstanceRef.current = null
    }
  }, [participantUrl, isDraft, effectiveColor, logoUrl])

  const handleDownload = useCallback(async (extension: 'png' | 'svg') => {
    if (!participantUrl || isDraft) return

    const { default: QRCodeStyling } = await import('qr-code-styling')
    const renderType = extension === 'svg' ? 'svg' : 'canvas'
    const qrCode = new QRCodeStyling(buildQrConfig(participantUrl, effectiveColor, logoUrl, 800, renderType))
    qrCode.download({ name: 'study-qr-code', extension })
  }, [participantUrl, isDraft, effectiveColor, logoUrl])

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value)
  }, [])

  const handleResetColor = useCallback(() => {
    setCustomColor(null)
    setPopoverOpen(false)
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">QR Code</CardTitle>
        </div>
        <CardDescription>
          Download a QR code for physical distribution or print materials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDraft ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Launch your study to generate a QR code.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <div className="relative w-[200px] h-[200px]">
                {/* QR code container - always rendered to ensure ref is available */}
                <div ref={containerRef} className="w-full h-full" />

                {/* Placeholder shown while loading */}
                {!qrLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
                    <QrCode className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('png')}
                disabled={isReadOnly || !qrLoaded}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('svg')}
                disabled={isReadOnly || !qrLoaded}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                SVG
              </Button>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isReadOnly}
                    title="Customize colors"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="qr-color">QR Code Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qr-color"
                          type="color"
                          value={effectiveColor}
                          onChange={handleColorChange}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={effectiveColor}
                          onChange={handleColorChange}
                          className="flex-1 font-mono text-sm"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {customColor && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetColor}
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Brand Color
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {customColor
                        ? `Custom color (brand: ${primaryColor})`
                        : `Using brand color ${primaryColor}`}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {customColor ? (
                <>
                  Using custom color ({effectiveColor})
                  {logoUrl && ' with logo'}
                </>
              ) : (
                <>
                  Using your brand color ({primaryColor})
                  {logoUrl && ' with logo'}
                </>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
})
