/**
 * Study content: cards, categories, tree nodes, tasks, questions, designs.
 *
 * One addressable collection per content type — `/studies/{id}/content/{type}` —
 * rather than eleven bespoke resource trees. The types differ by study
 * methodology, not by lifecycle: every one of them is an ordered list of items
 * that gets listed, replaced wholesale, appended to, patched and deleted from.
 * Modelling that once means a client that can drive card sorts can drive tree
 * tests without new code, and the reference stays short enough to read.
 *
 * The item shape still varies, so `GET /content-types` publishes the JSON Schema
 * for each one and every write validates against it.
 */

import { z } from "zod4";
import { executeBuilderWriteTool } from "@/services/assistant/builder-write-tools";
import { readStudyContent } from "@/services/study-content";
import {
  CONTENT_ITEM_SCHEMAS,
  CONTENT_TOOL,
  CONTENT_TYPES,
  contentTypesFor,
  validateItems,
  type ContentType,
} from "@/mcp/schemas/content";
import { ApiError, badRequest } from "../../http/errors";
import type { RouteContext, RouteDefinition } from "../define-route";
import { uuidParam } from "../schemas";
import { resolveStudyType } from "./_shared";

const ALL_CONTENT_TYPES = Object.keys(CONTENT_TYPES) as [
  ContentType,
  ...ContentType[],
];

const contentTypeParam = z
  .enum(ALL_CONTENT_TYPES)
  .describe(
    "Which content collection to act on. Must belong to the study's own type — " +
      "`cards` needs a card_sort, `tree_nodes` needs a tree_test, and so on. " +
      "`ab_tests` is valid on any study type.",
  );

const itemsBody = z
  .array(z.record(z.string(), z.unknown()))
  .min(1)
  .max(500)
  .describe(
    "The items. Shape depends on content_type — see `GET /content-types` for the JSON Schema of each.",
  );

const contentPath = {
  study_id: uuidParam("study"),
  content_type: contentTypeParam,
};

const itemResponse = z
  .object({
    object: z.literal("content"),
    study_id: z.string(),
    content_type: z.string(),
    action: z.string().describe("Which write was applied."),
    count: z.number().int().describe("How many items the write touched."),
    items: z
      .array(z.record(z.string(), z.unknown()))
      .describe("The items as stored, including their generated ids."),
  })
  .describe("The result of a content write.");

// --- Shared write path -----------------------------------------------------

/**
 * Confirm the content type belongs to this study, validate the items, and run
 * the write.
 *
 * The study's real type is read from the database, never taken from the caller:
 * letting a request declare it would let a caller pick which write path runs
 * against a study, which is a way to write tree nodes into a card sort.
 */
async function writeContent(
  ctx: RouteContext,
  studyId: string,
  contentType: ContentType,
  action: "add" | "update" | "remove" | "replace_all",
  items: Record<string, unknown>[],
): Promise<Record<string, unknown>> {
  const studyType = await resolveStudyType(ctx.supabase, studyId);
  const allowed = contentTypesFor(studyType);
  if (!allowed.includes(contentType)) {
    throw badRequest(
      `A ${studyType} study has no "${contentType}" content.`,
      [
        {
          path: "path.content_type",
          message: `Valid values for this study: ${allowed.join(", ")}.`,
        },
      ],
    );
  }

  const validated = validateItems(contentType, items);
  if (!validated.ok) {
    throw badRequest(
      `${validated.errors.length} item${validated.errors.length === 1 ? "" : "s"} failed validation.`,
      validated.errors
        .slice(0, 20)
        .map((message) => ({ path: "body.items", message })),
    );
  }

  const raw = await executeBuilderWriteTool(
    CONTENT_TOOL[contentType] as never,
    { action, items: validated.value },
    { supabase: ctx.supabase, studyId, userId: ctx.userId },
  );

  // The builder layer reports failure by returning `{ error }` rather than
  // throwing. Left unchecked that becomes a 200 describing a write that never
  // happened, which is the worst possible outcome for an automated caller.
  const result = ((raw as { result?: unknown }).result ?? raw) as Record<
    string,
    unknown
  >;
  if (typeof result.error === "string") {
    throw new ApiError("conflict", result.error);
  }

  return {
    object: "content",
    study_id: studyId,
    content_type: contentType,
    action: (result.action as string) ?? action,
    count: (result.count as number) ?? items.length,
    items: (result.items as unknown[]) ?? [],
  };
}

// --- Routes ----------------------------------------------------------------

export const listContent: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/content/{content_type}",
  operationId: "listStudyContent",
  summary: "List a study's content",
  description:
    "Every item in one content collection, in display order. Returns the rows as stored, so ids here are " +
    "the ids to send back when updating or deleting.",
  tag: "Content",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object(contentPath) },
  response: z.object({
    object: z.literal("list"),
    study_id: z.string(),
    content_type: z.string(),
    data: z.array(z.record(z.string(), z.unknown())),
    total: z.number().int(),
  }),
  examples: [
    {
      summary: "Read a card sort deck",
      path: { study_id: "3f1b…", content_type: "cards" },
    },
  ],
  handler: async ({ path }, ctx) => {
    const studyId = path.study_id as string;
    const contentType = path.content_type as ContentType;

    const studyType = await resolveStudyType(ctx.supabase, studyId);
    const allowed = contentTypesFor(studyType);
    if (!allowed.includes(contentType)) {
      throw badRequest(`A ${studyType} study has no "${contentType}" content.`, [
        {
          path: "path.content_type",
          message: `Valid values for this study: ${allowed.join(", ")}.`,
        },
      ]);
    }

    const rows = await readStudyContent(ctx.supabase, studyId, contentType).catch(
      (err: Error) => {
        throw new ApiError("upstream_error", err.message);
      },
    );
    return {
      object: "list",
      study_id: studyId,
      content_type: contentType,
      data: rows,
      total: rows.length,
    };
  },
};

export const replaceContent: RouteDefinition = {
  method: "PUT",
  path: "/studies/{study_id}/content/{content_type}",
  operationId: "replaceStudyContent",
  summary: "Replace a study's content",
  description:
    "Set the entire collection in one call, discarding whatever was there. This is the endpoint to use when " +
    "building a study from a sitemap or a content inventory, and it is idempotent — sending the same list " +
    "twice leaves the same result. For `tree_nodes`, give each node a `temp_id` and reference it as " +
    "`parent_id` on its children so a whole hierarchy lands in one request.",
  tag: "Content",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: {
    path: z.object(contentPath),
    body: z.object({ items: itemsBody }),
  },
  response: itemResponse,
  examples: [
    {
      summary: "Build a card sort deck in one call",
      path: { study_id: "3f1b…", content_type: "cards" },
      body: {
        items: [
          { label: "Order history" },
          { label: "Payment methods" },
          { label: "Returns" },
        ],
      },
    },
    {
      summary: "Build a two-level tree",
      path: { study_id: "3f1b…", content_type: "tree_nodes" },
      body: {
        items: [
          { temp_id: "acct", label: "Account" },
          { temp_id: "orders", label: "Orders", parent_id: "acct" },
        ],
      },
    },
  ],
  handler: async ({ path, body }, ctx) =>
    writeContent(
      ctx,
      path.study_id as string,
      path.content_type as ContentType,
      "replace_all",
      body.items as Record<string, unknown>[],
    ),
};

export const appendContent: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/content/{content_type}",
  operationId: "addStudyContent",
  summary: "Add content items",
  description:
    "Append items to a collection, keeping what is already there. Ids are generated and returned. Use PUT " +
    "when you want the list to end up exactly as sent.",
  tag: "Content",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  idempotent: true,
  inputs: {
    path: z.object(contentPath),
    body: z.object({ items: itemsBody }),
  },
  response: itemResponse,
  handler: async ({ path, body }, ctx) =>
    writeContent(
      ctx,
      path.study_id as string,
      path.content_type as ContentType,
      "add",
      body.items as Record<string, unknown>[],
    ),
};

export const updateContent: RouteDefinition = {
  method: "PATCH",
  path: "/studies/{study_id}/content/{content_type}",
  operationId: "updateStudyContent",
  summary: "Update content items",
  description:
    "Update specific items in place. Every item must carry its `id`; fields you omit keep their current " +
    "values. Items you do not mention are untouched.",
  tag: "Content",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object(contentPath),
    body: z.object({
      items: itemsBody.describe(
        "Items to update. Each must include `id`. Omitted fields are left alone.",
      ),
    }),
  },
  response: itemResponse,
  handler: async ({ path, body }, ctx) => {
    const items = body.items as Record<string, unknown>[];
    const missing = items.filter((item) => !item.id).length;
    if (missing > 0) {
      throw badRequest(
        `${missing} item${missing === 1 ? " is" : "s are"} missing an id.`,
        [
          {
            path: "body.items",
            message:
              "PATCH updates existing items, so each one must carry its `id`. Use POST to add new items.",
          },
        ],
      );
    }
    return writeContent(
      ctx,
      path.study_id as string,
      path.content_type as ContentType,
      "update",
      items,
    );
  },
};

export const deleteContentItem: RouteDefinition = {
  method: "DELETE",
  path: "/studies/{study_id}/content/{content_type}/{item_id}",
  operationId: "deleteStudyContentItem",
  summary: "Delete a content item",
  description:
    "Remove one item from a collection. To clear a collection entirely, PUT an empty-but-for-one-item list " +
    "or delete the items individually.",
  tag: "Content",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ ...contentPath, item_id: z.string().min(1) }),
  },
  response: z.object({
    object: z.literal("content_item"),
    id: z.string(),
    content_type: z.string(),
    deleted: z.literal(true),
  }),
  handler: async ({ path }, ctx) => {
    await writeContent(
      ctx,
      path.study_id as string,
      path.content_type as ContentType,
      "remove",
      [{ id: path.item_id }],
    );
    return {
      object: "content_item",
      id: path.item_id,
      content_type: path.content_type,
      deleted: true,
    };
  },
};

/**
 * The content-type catalogue.
 *
 * Publishing the per-type item schemas as data — rather than only as prose in
 * the reference — is what lets a generic client, or a model, build a valid
 * request for a content type it has never seen.
 */
export const listContentTypes: RouteDefinition = {
  method: "GET",
  path: "/content-types",
  operationId: "listContentTypes",
  summary: "Describe every content type",
  description:
    "The full catalogue: which content types exist, which study type each belongs to, and the JSON Schema " +
    "each item is validated against. Fetch this once and you can construct a valid write for any study type.",
  tag: "Content",
  scopes: [],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      study_type: z
        .enum([
          "card_sort",
          "tree_test",
          "survey",
          "prototype_test",
          "first_click",
          "first_impression",
          "live_website_test",
        ])
        .optional()
        .describe("Only return content types valid for this study type."),
    }),
  },
  response: z.object({
    object: z.literal("list"),
    data: z.array(
      z.object({
        content_type: z.string(),
        study_type: z
          .string()
          .nullable()
          .describe("The study type this belongs to. Null means it applies to all."),
        item_schema: z
          .record(z.string(), z.unknown())
          .describe("JSON Schema each item is validated against."),
      }),
    ),
  }),
  handler: async ({ query }) => {
    const { toJSONSchema } = await import("zod4");
    const wanted = query.study_type
      ? contentTypesFor(query.study_type as string)
      : ALL_CONTENT_TYPES;

    return {
      object: "list",
      data: wanted.map((contentType) => ({
        content_type: contentType,
        study_type: CONTENT_TYPES[contentType],
        item_schema: toJSONSchema(CONTENT_ITEM_SCHEMAS[contentType], {
          target: "draft-2020-12",
          io: "input",
          unrepresentable: "any",
        }),
      })),
    };
  },
};

export const CONTENT_ROUTES: RouteDefinition[] = [
  listContentTypes,
  listContent,
  replaceContent,
  appendContent,
  updateContent,
  deleteContentItem,
];
