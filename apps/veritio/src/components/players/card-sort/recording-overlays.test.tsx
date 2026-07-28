import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordingOverlays } from "./recording-overlays";

vi.mock("../shared/think-aloud-prompt", () => ({
  ThinkAloudPrompt: ({
    visible,
    prompt,
  }: {
    visible: boolean;
    prompt: string;
  }) => (visible ? <div data-think-aloud-prompt>{prompt}</div> : null),
}));

describe("RecordingOverlays", () => {
  it("renders only the transient think-aloud prompt", () => {
    const markup = renderToStaticMarkup(
      <RecordingOverlays
        thinkAloudEnabled
        showPrompt
        currentPrompt="Please keep talking"
        dismissPrompt={vi.fn()}
        promptPosition="top-right"
      />,
    );

    expect(markup).toContain("data-think-aloud-prompt");
    expect(markup).toContain("Please keep talking");
    expect(markup).not.toContain("data-card-sort-recording-status");
    expect(markup).not.toContain("Recording");
    expect(markup).not.toContain("fixed");
  });
});
