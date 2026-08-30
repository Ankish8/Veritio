/**
 * Getting a study, and its results, in front of people.
 *
 * Three distinct kinds of link, which are easy to confuse and do very different
 * things:
 *
 * - the **participation URL**, which is where participants take the study;
 * - **share links**, revocable links that let a named colleague or client view
 *   the study's results without a Veritio account;
 * - the **public results link**, a single token that makes the results page
 *   readable by anyone who has it.
 *
 * Each is exposed separately rather than behind one `share` verb, so that
 * "publish these results to the world" can never be something a caller does by
 * accident while trying to invite one reviewer.
 */

import { z } from "zod4";
import {
  createShareLink,
  listStudyShareLinks,
  revokeShareLink,
  updateShareLink,
} from "@/services/share-link-service";
import { generatePublicResultsToken } from "@/services/public-results-service";
import { ApiError } from "../../http/errors";
import type { RouteDefinition } from "../define-route";
import { listOf, uuidParam } from "../schemas";
import { paginate, participationUrl, requirePatch, rethrow, studyRow } from "./_shared";

const studyId = { study_id: uuidParam("study") };

const shareLinkSchema = z
  .object({
    object: z.literal("share_link"),
    id: z.string(),
    study_id: z.string(),
    url: z.string().describe("The link to hand out."),
    label: z.string().nullable(),
    is_active: z.boolean(),
    has_password: z.boolean(),
    allow_download: z.boolean().nullable(),
    allow_comments: z.boolean().nullable(),
    expires_at: z.string().nullable(),
    view_count: z.number().int().nullable(),
    created_at: z.string().nullable(),
  })
  .describe("A revocable link to a study's results.");

function serializeLink(
  row: Record<string, unknown>,
  origin: string,
): Record<string, unknown> {
  const token = (row.token ?? row.share_token) as string | undefined;
  return {
    object: "share_link",
    id: row.id,
    study_id: row.study_id,
    url: token ? `${origin}/shared/${token}` : ((row.url as string) ?? ""),
    label: row.label ?? null,
    is_active: (row.is_active as boolean | undefined) ?? true,
    has_password: Boolean(row.has_password ?? row.password_hash),
    allow_download: (row.allow_download as boolean | null) ?? null,
    allow_comments: (row.allow_comments as boolean | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    view_count: (row.view_count as number | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}

export const getSharing: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/sharing",
  operationId: "getStudySharing",
  summary: "Retrieve sharing state",
  description:
    "The study's participation URL, whether it is currently live, and how many share links exist. A draft " +
    "study has a participation URL but will turn participants away until it is launched — `live` is the " +
    "field to check.",
  tag: "Sharing",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object(studyId) },
  response: z.object({
    object: z.literal("study_sharing"),
    study_id: z.string(),
    status: z.string(),
    live: z
      .boolean()
      .describe("True only when the study is accepting participants right now."),
    participation_url: z.string().nullable(),
  }),
  handler: async ({ path }, ctx) => {
    const id = path.study_id as string;
    const study = await studyRow(ctx.supabase, id);
    return {
      object: "study_sharing",
      study_id: id,
      status: study.status,
      live: study.status === "active",
      participation_url: participationUrl(study.url_slug ?? study.share_code),
    };
  },
};

export const listShareLinks: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/share-links",
  operationId: "listShareLinks",
  summary: "List share links",
  description:
    "Every share link issued for this study, including revoked ones, with view counts. Requires the editor " +
    "role — a share link is a credential, so who holds one is not viewer-level information.",
  tag: "Sharing",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "read",
  inputs: { path: z.object(studyId) },
  response: listOf(shareLinkSchema, "share links"),
  handler: async ({ path }, ctx) => {
    const { data, error } = await listStudyShareLinks(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
    );
    rethrow(error, "study");
    return paginate(
      (data ?? []).map((row) => serializeLink(row as never, ctx.origin)),
      {},
    );
  },
};

export const createShareLinkRoute: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/share-links",
  operationId: "createShareLink",
  summary: "Create a share link",
  description:
    "Issue a revocable link that lets someone view this study's results without a Veritio account. Optional " +
    "password and expiry. Requires a plan that includes collaboration.",
  tag: "Sharing",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  entitlement: "collaboration",
  cost: "write",
  idempotent: true,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      label: z
        .string()
        .max(120)
        .optional()
        .describe("How you will recognise this link later, e.g. the recipient."),
      password: z
        .string()
        .min(6)
        .max(200)
        .optional()
        .describe("Require this password before the results are shown."),
      expires_in_days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .nullish()
        .describe("Auto-expire after this many days. Omit for no expiry."),
      allow_download: z.boolean().optional(),
      allow_comments: z.boolean().optional(),
    }),
  },
  response: shareLinkSchema,
  handler: async ({ path, body }, ctx) => {
    const { data, error } = await createShareLink(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
      {
        ...(body.label ? { label: body.label as string } : {}),
        ...(body.password ? { password: body.password as string } : {}),
        ...(body.expires_in_days !== undefined
          ? { expiresInDays: body.expires_in_days as number | null }
          : {}),
        ...(body.allow_download !== undefined
          ? { allowDownload: body.allow_download as boolean }
          : {}),
        ...(body.allow_comments !== undefined
          ? { allowComments: body.allow_comments as boolean }
          : {}),
      },
    );
    rethrow(error, "study");
    return serializeLink(data as never, ctx.origin);
  },
};

export const updateShareLinkRoute: RouteDefinition = {
  method: "PATCH",
  path: "/studies/{study_id}/share-links/{link_id}",
  operationId: "updateShareLink",
  summary: "Update a share link",
  description:
    "Change a link's label, password, expiry or permissions, or deactivate it without deleting the record. " +
    "Send `password: null` to remove an existing password.",
  tag: "Sharing",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ ...studyId, link_id: z.string().min(1) }),
    body: z.object({
      label: z.string().max(120).optional(),
      password: z.string().min(6).max(200).nullish(),
      expires_in_days: z.number().int().min(1).max(365).nullish(),
      allow_download: z.boolean().optional(),
      allow_comments: z.boolean().optional(),
      is_active: z.boolean().optional(),
    }),
  },
  response: shareLinkSchema,
  handler: async ({ path, body }, ctx) => {
    requirePatch(body);
    const { data, error } = await updateShareLink(
      ctx.supabase as never,
      path.link_id as string,
      ctx.userId,
      {
        ...(body.label !== undefined ? { label: body.label as string } : {}),
        ...(body.password !== undefined
          ? { password: body.password as string | null }
          : {}),
        ...(body.expires_in_days !== undefined
          ? { expiresInDays: body.expires_in_days as number | null }
          : {}),
        ...(body.allow_download !== undefined
          ? { allowDownload: body.allow_download as boolean }
          : {}),
        ...(body.allow_comments !== undefined
          ? { allowComments: body.allow_comments as boolean }
          : {}),
        ...(body.is_active !== undefined
          ? { isActive: body.is_active as boolean }
          : {}),
      },
    );
    rethrow(error, "share link");
    return serializeLink(data as never, ctx.origin);
  },
};

export const revokeShareLinkRoute: RouteDefinition = {
  method: "DELETE",
  path: "/studies/{study_id}/share-links/{link_id}",
  operationId: "revokeShareLink",
  summary: "Revoke a share link",
  description:
    "Stop a share link working immediately. Anyone holding it loses access on their next request.",
  tag: "Sharing",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ ...studyId, link_id: z.string().min(1) }),
  },
  response: z.object({
    object: z.literal("share_link"),
    id: z.string(),
    revoked: z.literal(true),
  }),
  handler: async ({ path }, ctx) => {
    const { error } = await revokeShareLink(
      ctx.supabase as never,
      path.link_id as string,
      ctx.userId,
    );
    rethrow(error, "share link");
    return { object: "share_link", id: path.link_id, revoked: true };
  },
};

export const createPublicResultsLink: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/public-results",
  operationId: "createPublicResultsLink",
  summary: "Publish results publicly",
  description:
    "Mint the study's public results token and return the URL. Anyone with that URL can read the results — " +
    "there is no account check and no per-recipient revocation. Prefer a share link when the audience is " +
    "known. Calling this again returns the existing token rather than rotating it.",
  tag: "Sharing",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: { path: z.object(studyId) },
  response: z.object({
    object: z.literal("public_results_link"),
    study_id: z.string(),
    url: z.string(),
    token: z.string(),
  }),
  handler: async ({ path }, ctx) => {
    const id = path.study_id as string;
    const { token, error } = await generatePublicResultsToken(
      ctx.supabase as never,
      id,
      ctx.userId,
    );
    if (error || !token) {
      throw new ApiError(
        "upstream_error",
        error ?? "Could not generate a public results link.",
      );
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? ctx.origin;
    return {
      object: "public_results_link",
      study_id: id,
      url: `${base}/results/public/${token}`,
      token,
    };
  },
};

export const SHARING_ROUTES: RouteDefinition[] = [
  getSharing,
  listShareLinks,
  createShareLinkRoute,
  updateShareLinkRoute,
  revokeShareLinkRoute,
  createPublicResultsLink,
];
