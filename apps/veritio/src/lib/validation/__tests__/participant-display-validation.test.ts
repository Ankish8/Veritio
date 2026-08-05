import { describe, expect, it } from "vitest";
import type {
  DemographicField,
  ParticipantDisplaySettings,
  ParticipantIdentifierSettings,
} from "../../supabase/study-flow-types";
import { defaultParticipantIdentifierSettings } from "../../study-flow/defaults";
import { getParticipantDisplayOptions } from "@veritio/prototype-test/lib/utils/participant-display";
import { validateIdentifierSection } from "../section-validators";

function settingsWithFields(
  fields: DemographicField[],
  displaySettings: ParticipantDisplaySettings,
): ParticipantIdentifierSettings {
  const settings = structuredClone(defaultParticipantIdentifierSettings);
  const demographicProfile = settings.demographicProfile!;

  return {
    ...settings,
    type: "demographic_profile",
    displaySettings,
    demographicProfile: {
      ...demographicProfile,
      sections: [
        {
          id: "basic-demographics",
          name: "Basic Demographics",
          position: 0,
          fields,
        },
      ],
    },
  };
}

function customField(id = "custom-name"): DemographicField {
  return {
    id,
    type: "custom",
    position: 0,
    enabled: true,
    required: true,
    questionText: "First Name",
  };
}

describe("participant display validation", () => {
  it("offers enabled custom fields and participant number to the builder", () => {
    const settings = settingsWithFields([customField()], {
      primaryField: "custom:custom-name",
      secondaryField: "none",
    });

    expect(getParticipantDisplayOptions(settings)).toEqual([
      { value: "custom:custom-name", label: "First Name (Custom)" },
      { value: "participantNumber", label: "Participant Number" },
    ]);
  });

  it("accepts an enabled custom field as the primary identifier", () => {
    const issues = validateIdentifierSection(
      settingsWithFields([customField()], {
        primaryField: "custom:custom-name",
        secondaryField: "none",
      }),
    );

    expect(issues).toEqual([]);
  });

  it("rejects display settings that cannot resolve any collected field", () => {
    const issues = validateIdentifierSection(
      settingsWithFields([customField()], {
        primaryField: "fullName",
        secondaryField: "email",
      }),
    );

    expect(
      issues.some(
        (issue) =>
          issue.message ===
          "Participant display settings do not use a field this study collects",
      ),
    ).toBe(true);
  });

  it("accepts participant number as an explicit fallback", () => {
    const issues = validateIdentifierSection(
      settingsWithFields([customField()], {
        primaryField: "participantNumber",
        secondaryField: "none",
      }),
    );

    expect(issues).toEqual([]);
  });

  it("accepts a collected secondary field when the primary field is absent", () => {
    const emailField: DemographicField = {
      id: "email",
      type: "predefined",
      fieldType: "email",
      position: 0,
      enabled: true,
      required: false,
    };
    const issues = validateIdentifierSection(
      settingsWithFields([emailField], {
        primaryField: "fullName",
        secondaryField: "email",
      }),
    );

    expect(issues).toEqual([]);
  });
});
