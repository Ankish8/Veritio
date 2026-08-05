import { describe, expect, it } from "vitest";
import { resolveParticipantDisplay } from "./participant-display";

describe("resolveParticipantDisplay", () => {
  it("resolves a custom demographic field by its stable field ID", () => {
    const display = resolveParticipantDisplay(
      {
        primaryField: "custom:field-id",
        secondaryField: "none",
      },
      {
        index: 1,
        demographics: { "field-id": "  Captured Name  " },
      },
    );

    expect(display).toEqual({ primary: "Captured Name", secondary: null });
  });

  it("supports participant number as an explicit display field", () => {
    const display = resolveParticipantDisplay(
      {
        primaryField: "participantNumber",
        secondaryField: "none",
      },
      { index: 4, demographics: null },
    );

    expect(display).toEqual({ primary: "P4", secondary: null });
  });

  it("falls back to the configured secondary field when a custom value is missing", () => {
    const display = resolveParticipantDisplay(
      {
        primaryField: "custom:missing-field",
        secondaryField: "email",
      },
      {
        index: 2,
        demographics: { email: "person@example.com" },
      },
    );

    expect(display).toEqual({ primary: "person@example.com", secondary: null });
  });

  it("ignores non-string custom values and preserves the P-number fallback", () => {
    const display = resolveParticipantDisplay(
      {
        primaryField: "custom:field-id",
        secondaryField: "none",
      },
      {
        index: 3,
        demographics: { "field-id": 42 },
      },
    );

    expect(display).toEqual({ primary: "P3", secondary: null });
  });

  it("preserves canonical full-name behavior", () => {
    const display = resolveParticipantDisplay(
      {
        primaryField: "fullName",
        secondaryField: "email",
      },
      {
        index: 1,
        demographics: {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
        },
      },
    );

    expect(display).toEqual({
      primary: "Jane Doe",
      secondary: "jane@example.com",
    });
  });
});
