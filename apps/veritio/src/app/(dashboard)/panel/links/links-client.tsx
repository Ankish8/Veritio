'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Twitter,
  Linkedin,
  Tag,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'

const QRCodeCard = dynamic(
  () => import('@/components/recruit/qr-code-card').then(m => ({ default: m.QRCodeCard })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
)
import { VIZ_COLORS } from '@/lib/colors'

interface Study {
  id: string
  title: string
  code: string
  status: string
  url_slug: string | null
}

export function LinksClient() {
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [utmParams, setUtmParams] = useState({
    source: '',
    medium: '',
    campaign: '',
    content: '',
  })

  // Fetch active/paused studies
  const { data: studies, isLoading } = useSWR<Study[]>('/api/studies?status=active,paused')

  const selectedStudy = useMemo(() => {
    if (!studies) return null
    return studies.find((s) => s.id === selectedStudyId) || studies[0] || null
  }, [studies, selectedStudyId])

  // Base URL (would come from env in production)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Build participant URL
  const participantUrl = useMemo(() => {
    if (!selectedStudy) return ''
    const path = selectedStudy.url_slug || `s/${selectedStudy.code}`
    return `${baseUrl}/${path}`
  }, [selectedStudy, baseUrl])

  // Build URL with UTM parameters
  const urlWithUtm = useMemo(() => {
    if (!participantUrl) return ''

    const params = new URLSearchParams()
    if (utmParams.source) params.set('utm_source', utmParams.source)
    if (utmParams.medium) params.set('utm_medium', utmParams.medium)
    if (utmParams.campaign) params.set('utm_campaign', utmParams.campaign)
    if (utmParams.content) params.set('utm_content', utmParams.content)

    const queryString = params.toString()
    return queryString ? `${participantUrl}?${queryString}` : participantUrl
  }, [participantUrl, utmParams])

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [])

  const handleShare = useCallback((platform: string) => {
    const text = selectedStudy ? `Take our quick survey: ${selectedStudy.title}` : 'Take our quick survey!'
    const url = urlWithUtm || participantUrl

    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(selectedStudy?.title || 'Survey')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }, [selectedStudy, urlWithUtm, participantUrl])

  if (isLoading) {
    return (
      <>
        <Header title="Links & Sharing" />
        <div className="flex flex-col gap-6 p-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    )
  }

  if (!studies || studies.length === 0) {
    return (
      <>
        <Header title="Links & Sharing" />
        <div className="flex flex-col gap-6 p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-1">No Active Studies</h3>
              <p className="text-sm text-muted-foreground">
                Launch a study to generate shareable links.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Links & Sharing" />

      <div className="flex flex-col gap-6 p-6">
        {/* Study Selector */}
        <div className="flex items-center gap-4">
          <Label htmlFor="study-select" className="shrink-0">Select Study:</Label>
          <Select
            value={selectedStudy?.id || ''}
            onValueChange={(id) => setSelectedStudyId(id)}
          >
            <SelectTrigger id="study-select" className="w-[300px]">
              <SelectValue placeholder="Select a study..." />
            </SelectTrigger>
            <SelectContent>
              {studies.map((study) => (
                <SelectItem key={study.id} value={study.id}>
                  <div className="flex items-center gap-2">
                    <span>{study.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {study.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedStudy && (
          <>
            {/* Direct Link Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  Direct Link
                </CardTitle>
                <CardDescription>
                  Share this link to let participants start your study.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={participantUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(participantUrl, 'direct')}
                  >
                    {copiedField === 'direct' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={participantUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* Quick Share Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Share:</span>
                  <Button variant="outline" size="sm" onClick={() => handleShare('email')}>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare('twitter')}>
                    <Twitter className="h-4 w-4 mr-1.5" />
                    Twitter
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare('linkedin')}>
                    <Linkedin className="h-4 w-4 mr-1.5" />
                    LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* UTM Builder Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  UTM Parameters
                </CardTitle>
                <CardDescription>
                  Add tracking parameters to measure campaign performance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-source" className="text-xs">Source</Label>
                    <Input
                      id="utm-source"
                      placeholder="e.g., newsletter"
                      value={utmParams.source}
                      onChange={(e) => setUtmParams({ ...utmParams, source: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-medium" className="text-xs">Medium</Label>
                    <Input
                      id="utm-medium"
                      placeholder="e.g., email"
                      value={utmParams.medium}
                      onChange={(e) => setUtmParams({ ...utmParams, medium: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-campaign" className="text-xs">Campaign</Label>
                    <Input
                      id="utm-campaign"
                      placeholder="e.g., spring2026"
                      value={utmParams.campaign}
                      onChange={(e) => setUtmParams({ ...utmParams, campaign: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-content" className="text-xs">Content</Label>
                    <Input
                      id="utm-content"
                      placeholder="e.g., cta-button"
                      value={utmParams.content}
                      onChange={(e) => setUtmParams({ ...utmParams, content: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Generated URL */}
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Generated URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={urlWithUtm}
                      readOnly
                      className="font-mono text-sm text-muted-foreground"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(urlWithUtm, 'utm')}
                    >
                      {copiedField === 'utm' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">Quick presets:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUtmParams({ source: 'email', medium: 'newsletter', campaign: '', content: '' })}
                  >
                    Newsletter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUtmParams({ source: 'social', medium: 'twitter', campaign: '', content: '' })}
                  >
                    Twitter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUtmParams({ source: 'social', medium: 'linkedin', campaign: '', content: '' })}
                  >
                    LinkedIn
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUtmParams({ source: '', medium: '', campaign: '', content: '' })}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Card - Reused from shared components */}
            <QRCodeCard
              participantUrl={urlWithUtm || participantUrl}
              isDraft={false}
              primaryColor={VIZ_COLORS.indigo}
            />
          </>
        )}
      </div>
    </>
  )
}
