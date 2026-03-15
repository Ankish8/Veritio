'use client'

import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import NextLink from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, Check, AlertCircle, Link2, ExternalLink, FileText, File, FileSpreadsheet } from 'lucide-react'
import type { AssistantMessage } from '@/services/assistant/types'
import { stripSuggestionMarkers } from '@/services/assistant/types'
import { GenerativeComponentBubble } from '@/components/generative-ui/generative-component-bubble'

// ---------------------------------------------------------------------------
// User message — right-aligned bubble
// ---------------------------------------------------------------------------

export const UserMessageBubble = memo(function UserMessageBubble({
  message,
}: {
  message: AssistantMessage
}) {
  // Support both new 'files' and legacy 'images' fields
  const files = message.metadata?.files || message.metadata?.images
  return (
    <div className="flex justify-end msg-anim-right">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
        {message.content}
        {files && files.length > 0 && (
          <div className={`flex gap-1.5 flex-wrap mt-2 ${files.length === 1 ? '' : ''}`}>
            {files.map((file, i) => {
              const isImage = file.type === 'image' || !file.type // Legacy support

              if (isImage) {
                return (
                  <a key={`${file.url}-${i}`} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.filename || 'Attached image'}
                      className="max-h-32 max-w-[200px] rounded-lg border border-primary-foreground/20 object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                )
              }

              // Non-image file - show as a document chip
              const FileIcon = file.type === 'pdf' || file.type === 'document' ? FileText
                : file.type === 'spreadsheet' ? FileSpreadsheet
                : File

              return (
                <a
                  key={`${file.url}-${i}`}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <FileIcon className="h-3.5 w-3.5" />
                  <span className="text-xs truncate max-w-[140px]">{file.filename}</span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Assistant text message — left-aligned, markdown rendered
// ---------------------------------------------------------------------------

/**
 * Derive a human-readable service name from a URL hostname.
 * "https://app.airtable.com/..." → "Airtable"
 * "https://docs.google.com/..." → "Google"
 * "https://trello.com/..." → "Trello"
 */
function getServiceName(href: string): string {
  try {
    const hostname = new URL(href).hostname.replace(/^www\./, '')
    // Take the main domain part (second-to-last segment, or first if only two parts)
    const parts = hostname.split('.')
    const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    return main.charAt(0).toUpperCase() + main.slice(1)
  } catch {
    return 'Link'
  }
}

/** Get a friendly label for an internal app path */
function getInternalLinkLabel(path: string): string {
  if (path.includes('/builder')) return 'Open in Builder'
  if (path.includes('/results')) return 'View Results'
  if (path.includes('/participate')) return 'Participation Link'
  if (/\/studies\/[^/]+$/.test(path)) return 'View Study'
  if (/\/projects\/[^/]+$/.test(path)) return 'View Project'
  return path
}

/** Pre-process markdown to auto-link bare internal paths like /projects/.../builder */
function autoLinkPaths(content: string): string {
  return content.replace(
    /(?<!\]\()(?<!`)(\/(?:projects|studies|dashboard|settings)\/[a-zA-Z0-9/_-]+[a-zA-Z0-9])/g,
    '[$1]($1)'
  )
}

/** Renders links in assistant markdown — internal paths use Next.js Link, https:// URLs become styled buttons */
function ActionLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (!href) return <>{children}</>

  const isHttps = href.startsWith('https://')
  const isInternal = href.startsWith('/')

  if (isInternal) {
    const childText = String(children ?? '')
    const isRawPath = childText === href || !childText
    const label = isRawPath ? getInternalLinkLabel(href) : childText

    return (
      <NextLink
        href={href}
        className="text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors font-medium"
      >
        {label}
      </NextLink>
    )
  }

  if (!isHttps) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {children}
      </a>
    )
  }

  const childText = String(children ?? '')
  const label = childText === href || !childText
    ? `Open in ${getServiceName(href)}`
    : childText

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium no-underline transition-colors bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
    >
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
      {label}
    </a>
  )
}

/** Standalone result action button — rendered below message text when metadata.resultUrl exists */
function ResultActionButton({ url }: { url: string }) {
  const label = `Open in ${getServiceName(url)}`
  return (
    <div className="mt-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium no-underline transition-colors bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
      >
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
        {label}
      </a>
    </div>
  )
}

/** Allow common formatting HTML tags while stripping dangerous ones (script, iframe, etc.) */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'p', 'strong', 'em', 'b', 'i', 'u', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'span', 'del', 'sub', 'sup',
  ],
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <ActionLink href={href}>{children}</ActionLink>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto mb-2 -mx-1">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
}

export const AssistantTextBubble = memo(function AssistantTextBubble({
  message,
}: {
  message: AssistantMessage
}) {
  const resultUrl = message.metadata?.resultUrl
  // Strip suggestion markers from displayed content (safety net for cached/loaded messages)
  const displayContent = autoLinkPaths(stripSuggestionMarkers(message.content))
  // Don't show standalone button if the LLM already included the URL as a markdown link
  const showResultButton = resultUrl && !displayContent.includes(resultUrl)
  return (
    <div className="flex justify-start msg-anim-left">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-foreground">
        <div className="text-sm leading-relaxed overflow-hidden [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-0.5 [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-background [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_table]:w-full [&_table]:text-xs [&_table]:mb-2 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-background [&_th]:font-medium [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-3 [&_h1:first-child]:mt-0 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-2.5 [&_h2:first-child]:mt-0 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1 [&_h3]:mt-2 [&_h3:first-child]:mt-0 [&_hr]:my-2 [&_hr]:border-border">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]} components={markdownComponents}>
            {displayContent}
          </ReactMarkdown>
        </div>
        {showResultButton && <ResultActionButton url={resultUrl} />}
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Tool progress step — compact inline indicator
// ---------------------------------------------------------------------------

export const ToolCallStep = memo(function ToolCallStep({
  message,
}: {
  message: AssistantMessage
}) {
  const meta = message.metadata
  if (!meta) return null

  const isDone = meta.status === 'done'
  const isError = meta.status === 'error'

  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground msg-anim-fade">
      {isDone ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
      ) : isError ? (
        <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
      )}
      <span className={isDone ? 'line-through' : ''}>
        {message.content ?? `Running ${meta.toolName}...`}
      </span>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Connect prompt — inline OAuth connect button
// ---------------------------------------------------------------------------

export const ConnectPrompt = memo(function ConnectPrompt({
  message,
  onConnectIntegration,
}: {
  message: AssistantMessage
  onConnectIntegration?: (toolkit: string) => Promise<void>
}) {
  const toolkit = message.metadata?.toolkit ?? 'this service'
  const [isConnecting, setIsConnecting] = useState(false)

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleConnect = useCallback(async () => {
    if (onConnectIntegration && message.metadata?.toolkit) {
      setIsConnecting(true)
      try {
        await onConnectIntegration(message.metadata.toolkit)
      } catch {
        setIsConnecting(false)
      }
    } else {
      window.open('/settings/integrations', '_blank')
    }
  }, [onConnectIntegration, message.metadata?.toolkit])

  return (
    <div className="flex justify-start msg-anim-left">
      <div className="max-w-[90%] rounded-xl border border-border bg-background p-3 text-sm">
        <p className="mb-2 text-foreground">{message.content}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleConnect}
          disabled={isConnecting}
          className="h-7 text-xs gap-1.5"
        >
          {isConnecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Link2 className="h-3 w-3" />
          )}
          Connect {toolkit}
        </Button>
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Error message — red-tinted left-aligned bubble
// ---------------------------------------------------------------------------

export const ErrorMessageBubble = memo(function ErrorMessageBubble({
  message,
}: {
  message: AssistantMessage
}) {
  return (
    <div className="flex justify-start msg-anim-left">
      <div className="max-w-[90%] flex items-start gap-2 rounded-2xl rounded-bl-sm bg-destructive/10 px-3.5 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>{message.content}</span>
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// MessageBubble dispatcher — renders the right bubble type based on metadata
// ---------------------------------------------------------------------------

export const MessageBubble = memo(function MessageBubble({
  message,
  onConnectIntegration,
  conversationId,
}: {
  message: AssistantMessage
  onConnectIntegration?: (toolkit: string) => Promise<void>
  conversationId?: string | null
}) {
  // User messages
  if (message.role === 'user') {
    return <UserMessageBubble message={message} />
  }

  // Route by metadata type
  const metaType = message.metadata?.type

  switch (metaType) {
    case 'tool_progress':
      return <ToolCallStep message={message} />
    case 'connect_prompt':
      return <ConnectPrompt message={message} onConnectIntegration={onConnectIntegration} />
    case 'error':
      return <ErrorMessageBubble message={message} />
    case 'component':
      return <GenerativeComponentBubble message={message} conversationId={conversationId ?? null} />
    default:
      return <AssistantTextBubble message={message} />
  }
})
