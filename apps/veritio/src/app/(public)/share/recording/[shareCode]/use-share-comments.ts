'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from '@/components/ui/sonner'

interface Comment {
  id: string
  recording_id: string
  timestamp_ms: number | null
  content: string
  created_by: string
  author_name: string | null
  author_image: string | null
  created_at: string
}

interface UseShareCommentsOptions {
  shareCode: string
  accessLevel: 'view' | 'comment' | null
  currentTime: number
}

/**
 * Hook for managing comments in shared recording view.
 * Handles fetching, creating comments, and guest name management.
 */
export function useShareComments({
  shareCode,
  accessLevel,
  currentTime,
}: UseShareCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const storedPasswordRef = useRef<string | undefined>(undefined)

  // Set the stored password (called after successful auth)
  const setStoredPassword = useCallback((password: string | undefined) => {
    storedPasswordRef.current = password
  }, [])

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (accessLevel !== 'comment') return

    setIsLoadingComments(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (storedPasswordRef.current) {
        headers['x-share-password'] = storedPasswordRef.current
      }

      const response = await fetch(`/api/share/recording/${shareCode}/comments`, { headers })
      const result = await response.json()

      if (response.ok) {
        setComments(result.comments || [])
      }
    } catch {
      // Silently fail - comments are optional
    } finally {
      setIsLoadingComments(false)
    }
  }, [shareCode, accessLevel])

  // Submit a new comment
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !guestName.trim()) return

    setIsSubmittingComment(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (storedPasswordRef.current) {
        headers['x-share-password'] = storedPasswordRef.current
      }

      const response = await fetch(`/api/share/recording/${shareCode}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newComment.trim(),
          guestName: guestName.trim(),
          timestampMs: Math.round(currentTime),
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setComments(prev => [...prev, result.comment])
        setNewComment('')
        toast.success('Comment added')
      } else {
        toast.error(result.error || 'Failed to add comment')
      }
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [shareCode, newComment, guestName, currentTime])

  // Auto-fetch comments when access level allows
  useEffect(() => {
    if (accessLevel === 'comment') {
      fetchComments()
      setShowComments(true)
    }
  }, [accessLevel, fetchComments])

  // Helper to get display name from comment
  const getDisplayName = useCallback((comment: Comment) => {
    // Use enriched author_name if available
    if (comment.author_name) return comment.author_name
    // Fall back to parsing guest prefix
    if (comment.created_by.startsWith('guest:')) {
      return comment.created_by.replace('guest:', '')
    }
    return 'Anonymous'
  }, [])

  return {
    comments,
    isLoadingComments,
    showComments,
    setShowComments,
    guestName,
    setGuestName,
    newComment,
    setNewComment,
    isSubmittingComment,
    handleSubmitComment,
    getDisplayName,
    setStoredPassword,
  }
}
