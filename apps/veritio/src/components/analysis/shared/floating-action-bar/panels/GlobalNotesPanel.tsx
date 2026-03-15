'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, MessageSquare, Trash2, ChevronDown, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { NoteInput } from '@/components/analysis/card-sort/questionnaire/notes/note-input'
import {
  useAllStudyNotes,
  NOTE_SECTION_LABELS,
  NOTE_SECTIONS,
  type NoteSection,
} from '@/hooks/use-all-study-notes'
import { useNotesSection } from '@/contexts/notes-section-context'
import type { SectionNote } from '@veritio/study-types'

interface GlobalNotesPanelProps {
  studyId: string
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function NoteItem({
  note,
  currentUserId,
  onDelete,
  showSection = false,
}: {
  note: SectionNote
  currentUserId?: string
  onDelete: (noteId: string, section: NoteSection) => Promise<boolean | void>
  showSection?: boolean
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const isOwner = currentUserId === note.user_id

  const handleDelete = async () => {
    if (!isOwner || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(note.id, note.section as NoteSection)
    } catch {
      // Error handled by parent
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="group relative bg-muted/50 rounded-lg p-3 transition-colors hover:bg-muted/70">
      {/* Author and timestamp */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-foreground truncate">
            {note.author_name}
          </span>
          {showSection && (
            <span className="text-[12px] px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap">
              {NOTE_SECTION_LABELS[note.section as NoteSection]}
            </span>
          )}
        </div>
        <span className="text-[12px] text-muted-foreground whitespace-nowrap transition-transform duration-200 group-hover:-translate-x-7">
          {formatRelativeTime(note.created_at)}
        </span>
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
        {note.content}
      </p>
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-1.5 right-1.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          <span className="sr-only">Delete note</span>
        </Button>
      )}
    </div>
  )
}

function NotesSection({
  label,
  notes,
  currentUserId,
  onDelete,
  defaultOpen = false,
}: {
  label: string
  notes: SectionNote[]
  currentUserId?: string
  onDelete: (noteId: string, section: NoteSection) => Promise<boolean | void>
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (notes.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-1 hover:bg-muted/50 rounded-md transition-colors">
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {notes.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2 pl-6">
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            currentUserId={currentUserId}
            onDelete={onDelete}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function GlobalNotesPanel({ studyId }: GlobalNotesPanelProps) {
  const [selectedSection, setSelectedSection] = useState<NoteSection | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Get suggested section from context (updates when user navigates)
  const { suggestedSection } = useNotesSection()
  const [addingToSection, setAddingToSection] = useState<NoteSection>(suggestedSection)

  const {
    groupedNotes,
    totalCount,
    isLoading,
    error,
    addNote,
    deleteNote,
    currentUserId,
  } = useAllStudyNotes(studyId)

  // Update addingToSection when suggested section changes (e.g., switching tabs)
  useEffect(() => {
    setAddingToSection(suggestedSection)
  }, [suggestedSection])

  const handleAddNote = async (content: string) => {
    setIsAdding(true)
    try {
      await addNote(addingToSection, content)
    } finally {
      setIsAdding(false)
    }
  }

  // Filter notes based on section selection and search query
  const filteredGroupedNotes = useMemo(() => {
    let notes = selectedSection === 'all'
      ? groupedNotes
      : groupedNotes.filter(g => g.section === selectedSection)

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      notes = notes.map(group => ({
        ...group,
        notes: group.notes.filter(note =>
          note.content.toLowerCase().includes(query) ||
          note.author_name.toLowerCase().includes(query)
        ),
      })).filter(group => group.notes.length > 0)
    }

    return notes
  }, [groupedNotes, selectedSection, searchQuery])

  // Count filtered notes
  const filteredCount = useMemo(() => {
    return filteredGroupedNotes.reduce((sum, g) => sum + g.notes.length, 0)
  }, [filteredGroupedNotes])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filter and search */}
      <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
        {/* Section filter dropdown */}
        <Select
          value={selectedSection}
          onValueChange={(value) => setSelectedSection(value as NoteSection | 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notes ({totalCount})</SelectItem>
            {NOTE_SECTIONS.map((section) => {
              const count = groupedNotes.find(g => g.section === section)?.notes.length || 0
              return (
                <SelectItem key={section} value={section}>
                  {NOTE_SECTION_LABELS[section]} ({count})
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">Failed to load notes</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a note to capture insights about your study
              </p>
            </div>
          ) : filteredCount === 0 ? (
            // No results for search
            <div className="text-center py-8">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notes found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          ) : selectedSection === 'all' ? (
            // Grouped view - show collapsible sections
            <div className="space-y-1">
              {filteredGroupedNotes.map(({ section, label, notes }) => (
                <NotesSection
                  key={section}
                  label={label}
                  notes={notes}
                  currentUserId={currentUserId}
                  onDelete={deleteNote}
                  defaultOpen={notes.length > 0 && filteredGroupedNotes.filter(g => g.notes.length > 0).length <= 2}
                />
              ))}
            </div>
          ) : (
            // Single section view - flat list
            <div className="space-y-2">
              {filteredGroupedNotes[0]?.notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  currentUserId={currentUserId}
                  onDelete={deleteNote}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add note section */}
      <div className="border-t border-border shrink-0">
        {/* Section selector for new note */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add note to:</span>
          </div>
          <Select
            value={addingToSection}
            onValueChange={(value) => setAddingToSection(value as NoteSection)}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_SECTIONS.map((section) => (
                <SelectItem key={section} value={section} className="text-xs">
                  {NOTE_SECTION_LABELS[section]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="px-4 pb-3">
          <NoteInput onSubmit={handleAddNote} isSubmitting={isAdding} />
        </div>
      </div>
    </div>
  )
}
