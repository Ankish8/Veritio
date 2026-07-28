import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardSortHeader } from "./card-sort-header";
import type { RecordingProps } from "./card-sort-types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "common.viewInstructions" ? "View instructions" : key,
}));

const baseRecording: RecordingProps = {
  isRecording: true,
  isPaused: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
  thinkAloudEnabled: true,
  audioLevel: 42,
  isSpeaking: true,
};

function renderHeader(recording?: RecordingProps): string {
  return renderToStaticMarkup(
    <CardSortHeader
      hasInstructions
      onShowInstructions={vi.fn()}
      onSubmit={vi.fn()}
      submitDisabled={false}
      finishedButtonText="Finished"
      recording={recording}
    />,
  );
}

describe("CardSortHeader", () => {
  it("keeps a single inline recording status before the Finished action", () => {
    const markup = renderHeader(baseRecording);

    expect(markup.match(/data-card-sort-recording-status/g)).toHaveLength(1);
    expect(markup).toContain('data-card-sort-recording-status="recording"');
    expect(markup).toContain("data-card-sort-finished-action");
    expect(markup).toContain("View instructions");
    expect(markup).toContain("Recording");
    expect(markup).toContain("Finished");
    expect(markup).toContain("cursor-pointer");
    expect(markup).toContain("disabled:cursor-not-allowed");
    expect(markup).not.toContain("fixed z-50");
    expect(markup.indexOf("data-card-sort-recording-status")).toBeLessThan(
      markup.indexOf("data-card-sort-finished-action"),
    );
  });

  it("keeps audio feedback in the inline recording status", () => {
    const markup = renderHeader(baseRecording);

    expect(markup).toContain("flex items-end gap-0.5 h-3 ml-1.5");
  });

  it.each([
    {
      name: "paused",
      recording: { ...baseRecording, isPaused: true },
      status: "paused",
      label: "Recording Paused",
    },
    {
      name: "uploading",
      recording: {
        ...baseRecording,
        isRecording: false,
        isUploading: true,
        uploadProgress: 68,
      },
      status: "uploading",
      label: "Uploading recording: 68%",
    },
    {
      name: "error",
      recording: {
        ...baseRecording,
        isRecording: false,
        error: "Microphone disconnected",
      },
      status: "error",
      label: "Recording Error",
    },
  ])(
    "keeps Finished visible while recording is $name",
    ({ recording, status, label }) => {
      const markup = renderHeader(recording);

      expect(markup).toContain(`data-card-sort-recording-status="${status}"`);
      expect(markup).toContain(`aria-label="${label}"`);
      expect(markup).toContain("data-card-sort-finished-action");
    },
  );
});
