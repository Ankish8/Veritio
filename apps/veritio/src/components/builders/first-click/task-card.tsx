"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { Image as ImageIcon, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PresenceBadge, PresenceRing } from "@/components/yjs";
import { useCollaborativeField } from "@veritio/yjs";
import { castJsonArray } from "@/lib/supabase/json-utils";
import {
  useFirstClickActions,
  useFirstClickTasks,
} from "@/stores/study-builder";
import type { FirstClickTaskWithDetails } from "@/stores/study-builder";
import {
  TaskCardShell,
  PostTaskQuestionsSection,
} from "@/components/builders/shared/task-card-shell";
import { ImagePickerDialog } from "./image-picker-dialog";
import { AOIEditorModal } from "./aoi-editor/aoi-editor-modal";
import { GenericPostTaskQuestionsModal } from "@/components/builders/shared/post-task-questions-modal";
import type { PostTaskQuestion } from "@veritio/study-types";

interface TaskCardProps {
  task: FirstClickTaskWithDetails;
  taskNumber: number;
  studyId: string;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

function areTaskCardPropsEqual(
  prevProps: TaskCardProps,
  nextProps: TaskCardProps,
): boolean {
  const prev = prevProps.task;
  const next = nextProps.task;
  return (
    prev.id === next.id &&
    prev.instruction === next.instruction &&
    prev.image?.id === next.image?.id &&
    (prev.aois?.length ?? 0) === (next.aois?.length ?? 0) &&
    prev.post_task_questions === next.post_task_questions &&
    prevProps.taskNumber === nextProps.taskNumber &&
    prevProps.isDragging === nextProps.isDragging
  );
}

export const TaskCard = memo(function TaskCard({
  task,
  taskNumber,
  studyId,
  onDelete,
  dragHandleProps,
  isDragging = false,
}: TaskCardProps) {
  const tasks = useFirstClickTasks();
  const {
    updateTask,
    setTaskImage,
    setAOIs,
    addPostTaskQuestion,
    updatePostTaskQuestion,
    removePostTaskQuestion,
    reorderPostTaskQuestions,
  } = useFirstClickActions();

  const { hasPresence, primaryUser, users, wrapperProps } =
    useCollaborativeField({
      locationId: `${studyId}:first-click-task:${task.id}`,
    });

  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [aoiEditorOpen, setAOIEditorOpen] = useState(false);
  const [postTaskQuestionsOpen, setPostTaskQuestionsOpen] = useState(false);

  // Local state for instruction (blur-to-save pattern)
  const [localInstruction, setLocalInstruction] = useState(task.instruction);

  // Sync local instruction when task changes externally (e.g., collaboration)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalInstruction(task.instruction);
  }, [task.instruction]);

  const handleInstructionBlur = useCallback(() => {
    if (localInstruction !== task.instruction) {
      updateTask(task.id, { instruction: localInstruction });
    }
  }, [localInstruction, task.instruction, task.id, updateTask]);

  const postTaskQuestions = castJsonArray<PostTaskQuestion>(
    task.post_task_questions,
  );

  const titlePreview = task.instruction
    ? task.instruction.split("\n")[0].slice(0, 50) +
      (task.instruction.length > 50 ? "..." : "")
    : "Untitled Task";

  const aoiCount = task.aois?.length ?? 0;

  const headerBadges =
    task.image && aoiCount > 0 ? (
      <Badge
        variant="outline"
        className="h-5 text-xs font-normal border-border/50"
      >
        {aoiCount} {aoiCount === 1 ? "area" : "areas"}
      </Badge>
    ) : null;

  const presenceOverlay =
    hasPresence && primaryUser ? (
      <>
        <PresenceRing color={primaryUser.color} className="rounded-lg" />
        <PresenceBadge
          user={primaryUser}
          otherCount={users.length - 1}
          size="sm"
        />
      </>
    ) : null;

  return (
    <>
      <TaskCardShell
        taskNumber={taskNumber}
        titlePreview={titlePreview}
        isDragging={isDragging}
        dragHandleProps={dragHandleProps}
        onDelete={onDelete}
        onPreview={() =>
          window.dispatchEvent(
            new CustomEvent("builder:preview-from", {
              detail: { kind: "task", id: task.id },
            }),
          )
        }
        headerBadges={headerBadges}
        containerProps={wrapperProps}
        overlay={presenceOverlay}
        footer={
          <PostTaskQuestionsSection
            questionCount={postTaskQuestions.length}
            onOpenEditor={() => setPostTaskQuestionsOpen(true)}
          />
        }
      >
        <div className="flex gap-5">
          {/* Image */}
          <div className="flex-shrink-0">
            {task.image ? (
              <button
                onClick={() => setImagePickerOpen(true)}
                className="relative group w-[260px] h-[160px] rounded-lg border hover:border-primary transition-colors overflow-hidden bg-muted/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={task.image.image_url}
                  alt={task.image.original_filename || "Task image"}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Change</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setImagePickerOpen(true)}
                className="w-[260px] h-[160px] rounded-lg border border-dashed border-muted-foreground/25 hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Choose image
                </span>
              </button>
            )}
          </div>

          {/* Instruction + Correct Areas */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Instruction</Label>
              <Textarea
                value={localInstruction}
                onChange={(e) => setLocalInstruction(e.target.value)}
                onBlur={handleInstructionBlur}
                placeholder="Where would you click to view your account settings?"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Correct Click Areas</Label>
              <Button
                variant="outline"
                onClick={() => setAOIEditorOpen(true)}
                disabled={!task.image}
                className="justify-start"
              >
                <MousePointerClick className="h-4 w-4 mr-2" />
                {aoiCount > 0
                  ? `${aoiCount} ${aoiCount === 1 ? "area" : "areas"}`
                  : "Set areas"}
              </Button>
            </div>
          </div>
        </div>
      </TaskCardShell>

      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        studyId={studyId}
        taskId={task.id}
        currentImage={task.image}
        onImageSelected={(image) => {
          setTaskImage(task.id, image);
          setImagePickerOpen(false);
        }}
      />

      {task.image && (
        <AOIEditorModal
          open={aoiEditorOpen}
          onOpenChange={setAOIEditorOpen}
          task={task}
          onSave={(aois) => {
            setAOIs(task.id, aois);
            setAOIEditorOpen(false);
          }}
        />
      )}

      <GenericPostTaskQuestionsModal
        open={postTaskQuestionsOpen}
        onOpenChange={setPostTaskQuestionsOpen}
        taskId={task.id}
        taskNumber={taskNumber}
        studyId={studyId}
        tasks={tasks}
        actions={{
          addPostTaskQuestion,
          updatePostTaskQuestion,
          removePostTaskQuestion,
          reorderPostTaskQuestions,
        }}
      />
    </>
  );
}, areTaskCardPropsEqual);
