"use client";

import { memo } from "react";
import { ShieldAlert } from "lucide-react";

export interface DuplicateBlockedStateProps {
  message?: string;
}

export const DuplicateBlockedState = memo(function DuplicateBlockedState({
  message,
}: DuplicateBlockedStateProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--style-page-bg, #f8fafc)" }}
    >
      <div
        className="max-w-md w-full rounded-2xl shadow-lg p-8 text-center"
        style={{
          backgroundColor:
            "var(--style-content-surface-bg-fallback, var(--style-card-bg, white))",
          background:
            "var(--style-content-surface-bg, var(--style-card-bg, white))",
          backdropFilter: "var(--style-content-surface-backdrop-filter, none)",
          WebkitBackdropFilter:
            "var(--style-content-surface-backdrop-filter, none)",
        }}
      >
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Already Participated</h1>
        <p className="text-muted-foreground">
          {message || "You have already participated in this study."}
        </p>
      </div>
    </div>
  );
});
