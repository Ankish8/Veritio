'use client'

import { FileText, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Attachment descriptors stored in `study_comments.attachments` (JSONB).
 * Deliberately a snapshot of the upload rather than a foreign key: the file
 * lives in storage and the comment should keep rendering even if bookkeeping
 * elsewhere changes.
 */
export interface CommentAttachment {
  url: string
  path: string
  filename: string
  size: number
  mimeType: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

interface AttachmentListProps {
  attachments: CommentAttachment[]
  /** Pending uploads render with a remove button instead of a download link. */
  onRemove?: (path: string) => void
  className?: string
}

export function AttachmentList({ attachments, onRemove, className }: AttachmentListProps) {
  if (attachments.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {attachments.map((att) => {
        const image = isImage(att.mimeType)

        return (
          <div
            key={att.path}
            className="group/att relative flex items-center gap-1.5 overflow-hidden rounded border border-border bg-muted/30 text-[11px]"
          >
            {image ? (
              <a
                href={onRemove ? undefined : att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.url}
                  alt={att.filename}
                  className="h-14 w-14 object-cover"
                  loading="lazy"
                />
              </a>
            ) : (
              <a
                href={onRemove ? undefined : att.url}
                target="_blank"
                rel="noopener noreferrer"
                download={att.filename}
                className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-[140px] truncate text-foreground">{att.filename}</span>
                <span className="shrink-0 text-muted-foreground">{formatSize(att.size)}</span>
                {!onRemove && <Download className="h-3 w-3 shrink-0 text-muted-foreground" />}
              </a>
            )}

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(att.path)}
                aria-label={`Remove ${att.filename}`}
                className={cn(
                  'absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 text-muted-foreground shadow-sm transition-colors hover:text-destructive',
                  !image && 'relative right-0 top-0 mr-1 shadow-none'
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
