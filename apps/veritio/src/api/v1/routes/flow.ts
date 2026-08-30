/**
 * The participant journey.
 *
 * Everything a participant sees around the core activity: the welcome screen,
 * consent, screening, how they identify themselves, pre- and post-study
 * questions, and the thank-you screen. Configured section by section, because
 * that is how it is reasoned about — "add screening" is one decision, not a
 * merge into a settings blob.
 *
 * Screening deserves a warning, repeated on the endpoint: a screening question
 * without `branching_logic` screens nobody out. It looks configured, collects
 * an answer, and admits every respondent — which quietly ruins the sample rather
 * than failing loudly.
 */

import { z } from "zod4";
import { executeBuilderWriteTool } from "@/services/assistant/builder-write-tools";
import { listFlowQuestions } from "@/services/flow-question-service";
import { getStudy } from "@/services/study-service";
import { ApiError, badRequest } from "../../http/errors";
import type { RouteDefinition } from "../define-route";
import { uuidParam } from "../schemas";
import { rethrow } from "./_shared";

const FLOW_SECTIONS = [
  "welcome",
  "participantAgreement",
  "screening",
  "participantIdentifier",
  "preStudyQuestions",
  "activityInstructions",
  "postStudyQuestions",
  "surveyQuestionnaire",
  "thankYou",
  "closedStudy",
] as const;

/** Sections backed by a question list, and the storage section each maps to. */
const QUESTION_SECTIONS: Record<string, string> = {
  screening: "screening",
  preStudyQuestions: "pre_study",
  postStudyQuestions: "post_study",
};

const sectionParam = z
  .enum(FLOW_SECTIONS)
  .describe("Which part of the participant journey to configure.");

const flowPath = {
  study_id: uuidParam("study"),
  section: sectionParam,
};

const sectionSchema = z.object({
  object: z.literal("flow_section"),
  study_id: z.string(),
  section: z.string(),
  enabled: z.boolean().nullable(),
  config: z.record(z.string(), z.unknown()),
});

export const getFlow: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/flow",
  operationId: "getStudyFlow",
  summary: "Retrieve the participant journey",
  description:
    "Every section of the journey with its current configuration, plus how many questions each " +
    "question-backed section holds. Read this before configuring, since section config is merged rather " +
    "than replaced.",
  tag: "Participant flow",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object({ study_id: uuidParam("study") }) },
  response: z.object({
    object: z.literal("study_flow"),
    study_id: z.string(),
    sections: z.array(
      z.object({
        section: z.string(),
        enabled: z.boolean().nullable(),
        config: z.record(z.string(), z.unknown()),
        question_count: z
          .number()
          .int()
          .nullable()
          .describe("Null for sections that hold no questions."),
      }),
    ),
  }),
  handler: async ({ path }, ctx) => {
    const studyId = path.study_id as string;

    const [{ data: study, error }, screening, preStudy, postStudy] =
      await Promise.all([
        getStudy(ctx.supabase as never, studyId, ctx.userId),
        listFlowQuestions(ctx.supabase as never, studyId, "screening" as never),
        listFlowQuestions(ctx.supabase as never, studyId, "pre_study" as never),
        listFlowQuestions(ctx.supabase as never, studyId, "post_study" as never),
      ]);
    rethrow(error);

    const settings = ((study as { settings?: Record<string, unknown> })
      ?.settings ?? {}) as Record<string, unknown>;
    const flow = (settings.studyFlow ?? {}) as Record<string, unknown>;

    const counts: Record<string, number> = {
      screening: screening.data?.length ?? 0,
      preStudyQuestions: preStudy.data?.length ?? 0,
      postStudyQuestions: postStudy.data?.length ?? 0,
    };

    return {
      object: "study_flow",
      study_id: studyId,
      sections: FLOW_SECTIONS.map((section) => {
        const config = (flow[section] ?? {}) as Record<string, unknown>;
        const { enabled, ...rest } = config;
        return {
          section,
          enabled: typeof enabled === "boolean" ? enabled : null,
          config: rest,
          question_count: counts[section] ?? null,
        };
      }),
    };
  },
};

export const updateFlowSection: RouteDefinition = {
  method: "PATCH",
  path: "/studies/{study_id}/flow/{section}",
  operationId: "updateStudyFlowSection",
  summary: "Configure one journey section",
  description:
    "Show or hide a section and set its copy. `config` is merged into whatever is already there, so send " +
    "only what changes. Questions live on the questions sub-resource, not here.",
  tag: "Participant flow",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object(flowPath),
    body: z.object({
      enabled: z.boolean().optional().describe("Show or hide this section."),
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Section settings, e.g. `{ title, message, includeStudyTitle }`. Merged into the current config.",
        ),
    }),
  },
  response: sectionSchema,
  examples: [
    {
      summary: "Enable a welcome screen",
      path: { study_id: "3f1b…", section: "welcome" },
      body: {
        enabled: true,
        config: { title: "Thanks for helping", message: "This takes about 8 minutes." },
      },
    },
  ],
  handler: async ({ path, body }, ctx) => {
    const studyId = path.study_id as string;
    const section = path.section as string;

    if (body.enabled === undefined && !body.config) {
      throw badRequest("Nothing to change.", [
        { path: "body", message: "Send `enabled`, `config`, or both." },
      ]);
    }

    const patch: Record<string, unknown> = {
      ...((body.config as Record<string, unknown>) ?? {}),
    };
    if (body.enabled !== undefined) patch.enabled = body.enabled;

    // Journey sections live under the `studyFlow` key of the settings blob, so
    // this is a settings merge rather than its own table.
    const raw = await executeBuilderWriteTool(
      "update_study_settings",
      { settings: { studyFlow: { [section]: patch } } },
      { supabase: ctx.supabase, studyId, userId: ctx.userId },
    );
    const result = ((raw as { result?: unknown }).result ?? raw) as Record<
      string,
      unknown
    >;
    if (typeof result.error === "string") {
      throw new ApiError("conflict", result.error);
    }

    return {
      object: "flow_section",
      study_id: studyId,
      section,
      enabled: body.enabled ?? null,
      config: (body.config as Record<string, unknown>) ?? {},
    };
  },
};

export const listFlowSectionQuestions: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/flow/{section}/questions",
  operationId: "listStudyFlowQuestions",
  summary: "List a section's questions",
  description:
    "Questions in a question-backed section, in display order. Only `screening`, `preStudyQuestions` and " +
    "`postStudyQuestions` hold questions; other sections return `400`.",
  tag: "Participant flow",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object(flowPath) },
  response: z.object({
    object: z.literal("list"),
    study_id: z.string(),
    section: z.string(),
    data: z.array(z.record(z.string(), z.unknown())),
    total: z.number().int(),
  }),
  handler: async ({ path }, ctx) => {
    const section = path.section as string;
    const stored = requireQuestionSection(section);
    const { data, error } = await listFlowQuestions(
      ctx.supabase as never,
      path.study_id as string,
      stored as never,
    );
    if (error) throw new ApiError("upstream_error", error.message);
    return {
      object: "list",
      study_id: path.study_id,
      section,
      data: data ?? [],
      total: (data ?? []).length,
    };
  },
};

export const replaceFlowSectionQuestions: RouteDefinition = {
  method: "PUT",
  path: "/studies/{study_id}/flow/{section}/questions",
  operationId: "replaceStudyFlowQuestions",
  summary: "Set a section's questions",
  description:
    "Replace the whole question list for a section. Each question needs `question_type` and `question_text`. " +
    "Screening questions additionally need `branching_logic` — without it the question is asked but nobody " +
    "is ever screened out, which silently admits the wrong sample.",
  tag: "Participant flow",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: {
    path: z.object(flowPath),
    body: z.object({
      questions: z
        .array(z.record(z.string(), z.unknown()))
        .max(200)
        .describe(
          "The complete list. Send an empty array to clear the section. " +
            'Screening rules take the shape `{ rules: [{ optionId, target: "next" | "reject" }], defaultTarget: "next" }`.',
        ),
    }),
  },
  response: z.object({
    object: z.literal("flow_questions"),
    study_id: z.string(),
    section: z.string(),
    count: z.number().int(),
    items: z.array(z.record(z.string(), z.unknown())),
  }),
  examples: [
    {
      summary: "Screen out non-customers",
      path: { study_id: "3f1b…", section: "screening" },
      body: {
        questions: [
          {
            question_type: "multiple_choice",
            question_text: "Have you shopped with us in the last 6 months?",
            config: {
              mode: "single",
              options: [{ label: "Yes" }, { label: "No" }],
            },
            branching_logic: {
              rules: [{ optionId: "No", target: "reject" }],
              defaultTarget: "next",
            },
          },
        ],
      },
    },
  ],
  handler: async ({ path, body }, ctx) => {
    const section = path.section as string;
    const stored = requireQuestionSection(section);
    const questions = body.questions as Record<string, unknown>[];

    const raw = await executeBuilderWriteTool(
      "manage_flow_questions",
      { action: "replace_all", section: stored, items: questions },
      {
        supabase: ctx.supabase,
        studyId: path.study_id as string,
        userId: ctx.userId,
      },
    );
    const result = ((raw as { result?: unknown }).result ?? raw) as Record<
      string,
      unknown
    >;
    if (typeof result.error === "string") {
      throw new ApiError("conflict", result.error);
    }

    return {
      object: "flow_questions",
      study_id: path.study_id,
      section,
      count: (result.count as number) ?? questions.length,
      items: (result.items as unknown[]) ?? [],
    };
  },
};

function requireQuestionSection(section: string): string {
  const stored = QUESTION_SECTIONS[section];
  if (!stored) {
    throw badRequest(`The "${section}" section holds no questions.`, [
      {
        path: "path.section",
        message: `Sections with questions: ${Object.keys(QUESTION_SECTIONS).join(", ")}.`,
      },
    ]);
  }
  return stored;
}

export const FLOW_ROUTES: RouteDefinition[] = [
  getFlow,
  updateFlowSection,
  listFlowSectionQuestions,
  replaceFlowSectionQuestions,
];
