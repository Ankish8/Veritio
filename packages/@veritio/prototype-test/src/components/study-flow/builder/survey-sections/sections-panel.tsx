'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@veritio/ui/components/button';
import { Input } from '@veritio/ui/components/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@veritio/ui/components/collapsible';
import { Plus, FolderPlus, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@veritio/ui';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSurveySections } from '../../../../hooks';
import { SectionCard } from './section-card';
import type { SurveyCustomSection, StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types';

interface SectionsPanelProps {
  studyId: string;
  questions: StudyFlowQuestion[];
  selectedSectionId?: string | null;
  onSelectSection: (sectionId: string | null) => void;
}
export function SectionsPanel({
  studyId,
  questions,
  selectedSectionId,
  onSelectSection,
}: SectionsPanelProps) {
  const {
    sections,
    isLoading,
    createSection,
    updateSection,
    deleteSection,
    deleteAllSections,
    reorderSections,
  } = useSurveySections(studyId);

  const [isOpen, setIsOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Synchronous guard to prevent race conditions on double-click
  const isSavingRef = useRef(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get question count for each section
  const getQuestionCount = useCallback(
    (sectionId: string) => {
      return questions.filter((q) => q.custom_section_id === sectionId).length;
    },
    [questions]
  );

  // Handle creating a new section
  const handleCreateSection = async () => {
    // Use ref for synchronous check to prevent race conditions on rapid clicks
    if (!newSectionName.trim() || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const section = await createSection({
        name: newSectionName.trim(),
        parent_section: 'survey',
      });

      if (section) {
        setNewSectionName('');
        setIsCreating(false);
        onSelectSection(section.id);
      }
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // Handle section update
  const handleUpdateSection = async (sectionId: string, updates: Partial<SurveyCustomSection>) => {
    await updateSection(sectionId, updates);
  };

  // Handle section delete
  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection(sectionId);
    if (selectedSectionId === sectionId) {
      onSelectSection(null);
    }
  };

  // Handle deleting all sections (for cleanup)
  const handleDeleteAllSections = async () => {
    if (isDeletingAll) return;

    const surveySectionCount = sections.filter((s) => s.parent_section === 'survey').length;
    const confirmed = window.confirm(
      `Delete all ${surveySectionCount} sections? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingAll(true);
    try {
      await deleteAllSections();
      onSelectSection(null);
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(sections, oldIndex, newIndex).map((s) => s.id);
      await reorderSections(newOrder);
    }
  };

  // Handle moving section up
  const handleMoveUp = async (sectionId: string) => {
    const currentIndex = surveySections.findIndex((s) => s.id === sectionId);
    if (currentIndex <= 0) return; // Already at top

    const newOrder = [...surveySections];
    // Swap with previous section
    [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
    await reorderSections(newOrder.map((s) => s.id));
  };

  // Handle moving section down
  const handleMoveDown = async (sectionId: string) => {
    const currentIndex = surveySections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1 || currentIndex >= surveySections.length - 1) return; // Already at bottom

    const newOrder = [...surveySections];
    // Swap with next section
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
    await reorderSections(newOrder.map((s) => s.id));
  };

  // Handle key press in new section input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateSection();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewSectionName('');
    }
  };

  // Filter sections for survey parent only
  const surveySections = sections.filter((s) => s.parent_section === 'survey');

  if (surveySections.length === 0 && !isCreating) {
    // Show add section button when no sections exist
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderPlus className="h-4 w-4" />
            <span className="text-sm">Organize questions into sections</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        </div>

        {isCreating && (
          <div className="mt-4 flex items-center gap-2">
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Section name"
              className="h-9"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCreateSection}
              disabled={!newSectionName.trim() || isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setNewSectionName('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border">
        {/* Header */}
        <div className="flex items-center justify-between w-full px-4 py-3">
          <CollapsibleTrigger className="flex items-center gap-2 hover:bg-muted/50 -ml-2 px-2 py-1 rounded">
            <FolderPlus className="h-4 w-4" />
            <span className="font-medium text-sm">Sections</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {surveySections.length}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
          {surveySections.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAllSections();
              }}
              disabled={isDeletingAll}
              title="Delete all sections"
            >
              {isDeletingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-2 pb-2 space-y-1">
            {/* Sections List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={surveySections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {surveySections.map((section, index) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      studyId={studyId}
                      isSelected={selectedSectionId === section.id}
                      questionCount={getQuestionCount(section.id)}
                      onSelect={() => onSelectSection(section.id)}
                      onUpdate={(updates) => handleUpdateSection(section.id, updates)}
                      onDelete={() => handleDeleteSection(section.id)}
                      onMoveUp={() => handleMoveUp(section.id)}
                      onMoveDown={() => handleMoveDown(section.id)}
                      canMoveUp={index > 0}
                      canMoveDown={index < surveySections.length - 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Add Section Input */}
            {isCreating ? (
              <div className="flex items-center gap-2 px-2 pt-2">
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Section name"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleCreateSection}
                  disabled={!newSectionName.trim() || isSaving}
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setIsCreating(false);
                    setNewSectionName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
                Add section
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
