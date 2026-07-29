"use client";

/**
 * ResultsPageHeader
 *
 * Header component for results pages with breadcrumbs, status indicator,
 * and responsive action buttons (mobile dropdown, tablet icons, desktop full).
 */

import { useState } from "react";
import { Flag, Copy, Loader2, MoreHorizontal, Share2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { usePublicResultsSettings } from "@/hooks";

import { Header } from "@/components/dashboard/header";
import { StudyNavigationHeader } from "@/components/dashboard/study-navigation-header";
import { Button } from "@/components/ui/button";
import { EndStudyDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobilePanelToggle } from "@/components/analysis/shared/floating-action-bar/MobilePanelToggle";
// Deep imports keep the yjs runtime out of results routes (no provider here)
import { CollaborativeAvatars } from "@/components/yjs/collaborative-avatars";
import { SyncStatusIndicator } from "@/components/yjs/sync-status-indicator";

export interface ResultsPageHeaderProps {
  projectId: string;
  projectName: string;
  studyId: string;
  studyTitle: string;
  studyStatus: string;
  shareCode: string;
  onEndStudy: () => Promise<void>;
}

async function copyText(text: string): Promise<void> {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();
  if (copied) return;

  if (!navigator.clipboard) throw new Error("Clipboard copy is unavailable");

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Clipboard request timed out")),
      500,
    );
    navigator.clipboard.writeText(text).then(
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function ResultsPageHeader({
  projectId,
  projectName,
  studyId,
  studyTitle,
  studyStatus,
  shareCode,
  onEndStudy,
}: ResultsPageHeaderProps) {
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultsCopied, setResultsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { settings, ensureToken, updateSettings } =
    usePublicResultsSettings(studyId);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${shareCode}`
      : "";

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await onEndStudy();
      toast.success("Study ended", {
        description:
          "The study has been completed and is no longer accepting participants.",
      });
      setEndDialogOpen(false);
    } catch {
      toast.error("Failed to end study");
    } finally {
      setIsEnding(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyText(shareUrl);
      setCopied(true);
      toast.success("Participant link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the participant link");
    }
  };

  /**
   * Copies the public results link — the same read-only link the Report tab
   * exposes, openable without a Veritio account. ensureToken reuses the
   * existing token (or an in-flight request for one) so the link handed to the
   * user can't be invalidated a moment later by a second mint.
   */
  const handleShareResults = async () => {
    setIsSharing(true);
    try {
      const resultsToken = await ensureToken();
      if (!resultsToken) {
        throw new Error("Could not create a results link");
      }

      if (!settings.enabled) {
        await updateSettings({ enabled: true });
      }

      await copyText(`${window.location.origin}/results/public/${resultsToken}`);
      setResultsCopied(true);
      toast.success("Public results link copied", {
        description: "Anyone with the link can view the shared sections.",
      });
      setTimeout(() => setResultsCopied(false), 2000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not copy the public results link",
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <Header
        leftContent={
          <StudyNavigationHeader
            projectId={projectId}
            projectName={projectName}
            studyId={studyId}
            studyTitle={studyTitle}
            studyStatus={
              studyStatus as "draft" | "active" | "paused" | "completed"
            }
          />
        }
      >
        {/* Mobile: Panel toggle + dropdown menu */}
        <div className="flex sm:hidden items-center gap-1">
          <MobilePanelToggle panelId="study-info" label="Open study info" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShareResults} disabled={isSharing}>
                <Share2 className="mr-2 h-4 w-4" />
                {resultsCopied ? "Results link copied!" : "Share results"}
              </DropdownMenuItem>
              {studyStatus !== "draft" && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Link copied!" : "Copy participant link"}
                </DropdownMenuItem>
              )}
              {studyStatus === "active" && (
                <DropdownMenuItem onClick={() => setEndDialogOpen(true)}>
                  <Flag className="mr-2 h-4 w-4" />
                  End Study
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tablet: Icon-only buttons */}
        <div className="hidden sm:flex lg:hidden items-center gap-1">
          {/* Real-time presence indicators */}
          <div className="flex items-center gap-1 mr-1">
            <SyncStatusIndicator size="sm" showUserCount={false} />
            <CollaborativeAvatars maxVisible={2} size="sm" />
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleShareResults}
            disabled={isSharing}
            title={
              resultsCopied ? "Results link copied!" : "Share results publicly"
            }
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </Button>
          {studyStatus !== "draft" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              aria-label="Copy participant link"
              title={copied ? "Link copied!" : "Copy participant link"}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {studyStatus === "active" && (
            <Button
              size="icon-sm"
              onClick={() => setEndDialogOpen(true)}
              title="End Study"
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Desktop: Subtle icon buttons */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Real-time presence indicators */}
          <div className="flex items-center gap-2 mr-2">
            <SyncStatusIndicator size="sm" showUserCount={false} />
            <CollaborativeAvatars maxVisible={3} size="sm" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShareResults}
            disabled={isSharing}
            data-testid="share-results-link"
          >
            {isSharing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="mr-2 h-4 w-4" />
            )}
            {resultsCopied ? "Results link copied" : "Share results"}
          </Button>
          {/*
           * Icon-only, not labelled: the step nav is absolutely centred in this
           * header, so a full-width label collides with it at the low end of lg.
           */}
          {studyStatus !== "draft" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              aria-label="Copy participant link"
              title={copied ? "Link copied!" : "Copy participant link"}
              data-testid="copy-participant-link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {studyStatus === "active" && (
            <Button size="sm" onClick={() => setEndDialogOpen(true)}>
              <Flag className="mr-2 h-4 w-4" />
              End Study
            </Button>
          )}
        </div>
      </Header>

      <EndStudyDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        onConfirm={handleEnd}
        loading={isEnding}
      />
    </>
  );
}
