'use client';

import { useState } from 'react';
import { Input } from '@veritio/ui/components/input';
import { Button } from '@veritio/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@veritio/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui/components/alert-dialog';
import { GripVertical, MoreVertical, Pencil, Trash2, Eye, EyeOff, FolderOpen, ArrowUp, ArrowDown } from 'lucide-react';
import { PresenceBadge, PresenceRing } from '../../../yjs';
import { useCollaborativeField } from '@veritio/yjs';
import { cn } from '@veritio/ui';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SurveyCustomSection } from '@veritio/prototype-test/lib/supabase/study-flow-types';

interface SectionCardProps {
  section: SurveyCustomSection;
  studyId: string;
  isSelected?: boolean;
  questionCount?: number;
  onSelect: () => void;
  onUpdate: (updates: { name?: string; description?: string; is_visible?: boolean }) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}
export function SectionCard({
  section,
  studyId,
  isSelected = false,
  questionCount = 0,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: SectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Collaborative presence
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:survey-section:${section.id}`,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveName = () => {
    if (editName.trim() && editName !== section.name) {
      onUpdate({ name: editName.trim() });
    } else {
      setEditName(section.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditName(section.name);
      setIsEditing(false);
    }
  };

  const handleToggleVisibility = () => {
    onUpdate({ is_visible: !section.is_visible });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative group flex items-center gap-2 px-2 py-2 rounded-lg border transition-all cursor-pointer',
          isSelected
            ? 'bg-primary/10 border-primary/30'
            : 'hover:bg-muted/50 border-transparent',
          isDragging && 'opacity-50 shadow-lg',
          !section.is_visible && 'opacity-60'
        )}
        onClick={onSelect}
        {...wrapperProps}
      >
        {/* Collaborative presence indicators */}
        {hasPresence && primaryUser && (
          <>
            <PresenceRing color={primaryUser.color} className="rounded-lg" />
            <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" />
          </>
        )}
        {/* Drag Handle */}
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Section Icon */}
        <FolderOpen className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />

        {/* Section Name */}
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-7 text-sm flex-1"
            autoFocus
          />
        ) : (
          <span className={cn('text-sm flex-1 truncate', isSelected && 'font-medium')}>
            {section.name}
          </span>
        )}

        {/* Question Count Badge */}
        {questionCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {questionCount}
          </span>
        )}

        {/* Visibility Indicator */}
        {!section.is_visible && (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleVisibility}>
              {section.is_visible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide section
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show section
                </>
              )}
            </DropdownMenuItem>
            {(onMoveUp || onMoveDown) && <DropdownMenuSeparator />}
            {onMoveUp && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={!canMoveUp}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Move up
              </DropdownMenuItem>
            )}
            {onMoveDown && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={!canMoveDown}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Move down
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the section "{section.name}". Questions in this section will be moved to the main survey area. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export function StaticSectionCard({
  section,
  isSelected = false,
  questionCount = 0,
  onSelect,
  onUpdate,
  onDelete,
}: SectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveName = () => {
    if (editName.trim() && editName !== section.name) {
      onUpdate({ name: editName.trim() });
    } else {
      setEditName(section.name);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'bg-primary/10 border-primary/30'
          : 'hover:bg-muted/50 border-transparent',
        !section.is_visible && 'opacity-60'
      )}
      onClick={onSelect}
    >
      <FolderOpen className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />

      {isEditing ? (
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveName}
          onClick={(e) => e.stopPropagation()}
          className="h-7 text-sm flex-1"
          autoFocus
        />
      ) : (
        <span className={cn('text-sm flex-1 truncate', isSelected && 'font-medium')}>
          {section.name}
        </span>
      )}

      {questionCount > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {questionCount}
        </span>
      )}
    </div>
  );
}
