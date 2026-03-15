'use client'

import { memo, useState, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StickyNote, Plus, Trash2, Loader2, User2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { usePanelNotes } from '@/hooks/panel'

interface ParticipantNotesTabProps {
  participantId: string
}

export const ParticipantNotesTab = memo(function ParticipantNotesTab({
  participantId,
}: ParticipantNotesTabProps) {
  const { notes, isLoading, createNote, deleteNote } = usePanelNotes(participantId)

  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const handleAddNote = useCallback(async () => {
    if (!newNoteContent.trim()) return

    setIsAdding(true)
    try {
      await createNote(newNoteContent.trim())
      toast.success('Note added')
      setNewNoteContent('')
      setShowAddNote(false)
    } catch {
      toast.error('Failed to add note')
    } finally {
      setIsAdding(false)
    }
  }, [newNoteContent, createNote])

  const handleDeleteNote = useCallback(async () => {
    if (!noteToDelete) return

    setDeletingNoteId(noteToDelete)
    try {
      await deleteNote(noteToDelete)
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    } finally {
      setDeletingNoteId(null)
      setNoteToDelete(null)
    }
  }, [noteToDelete, deleteNote])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Note Button/Form */}
      {showAddNote ? (
        <Card>
          <CardContent className="pt-4">
            <Textarea
              placeholder="Write a note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              autoFocus
              className="mb-3"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddNote(false)
                  setNewNoteContent('')
                }}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Note
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAddNote(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      )}

      {/* Notes List */}
      {notes.length === 0 && !showAddNote ? (
        <Card>
          <CardContent className="py-12 text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-1">No Notes Yet</h3>
            <p className="text-sm text-muted-foreground">
              Add notes to keep track of interactions with this participant.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="group">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <User2 className="h-3.5 w-3.5" />
                      <span>You</span>
                      <span>·</span>
                      <span title={format(new Date(note.created_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setNoteToDelete(note.id)}
                    disabled={deletingNoteId === note.id}
                  >
                    {deletingNoteId === note.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
