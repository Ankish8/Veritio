/**
 * Projects.
 *
 * A project is the container a study is created in, so an integration that
 * creates studies needs a project id before it can do anything. `GET /projects`
 * with no arguments is the shortest path to one.
 */

import { z } from "zod4";
import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  restoreProject,
  updateProject,
} from "@/services/project-service";
import { listStudiesByProject } from "@/services/study-service";
import type { RouteDefinition } from "../define-route";
import {
  deletedSchema,
  listOf,
  paginationQuery,
  queryBool,
  uuidParam,
} from "../schemas";
import {
  paginate,
  projectSchema,
  requirePatch,
  resolveOrganizationId,
  rethrow,
  serializeProject,
  serializeStudy,
  studySchema,
} from "./_shared";

export const listProjectsRoute: RouteDefinition = {
  method: "GET",
  path: "/projects",
  operationId: "listProjects",
  summary: "List projects",
  description:
    "Projects the caller can access, newest first. Archived projects are excluded unless you ask for them. " +
    "You need a project id to create a study.",
  tag: "Projects",
  scopes: ["studies:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      organization_id: uuidParam("organization")
        .optional()
        .describe("Only needed when you belong to several workspaces."),
      include_archived: queryBool({
        default: false,
        description: "Include archived projects.",
      }),
      ...paginationQuery,
    }),
  },
  response: listOf(projectSchema, "projects"),
  examples: [{ summary: "Find a project to create a study in" }],
  handler: async ({ query }, ctx) => {
    const { data, error } = await listProjects(ctx.supabase as never, ctx.userId, {
      includeArchived: query.include_archived as boolean,
      ...(query.organization_id
        ? { organizationId: query.organization_id as string }
        : {}),
    });
    rethrow(error, "organization");
    return paginate((data ?? []).map((p) => serializeProject(p as never)), query);
  },
};

export const createProjectRoute: RouteDefinition = {
  method: "POST",
  path: "/projects",
  operationId: "createProject",
  summary: "Create a project",
  description:
    "Create a project in a workspace. When you belong to exactly one workspace, `organization_id` is " +
    "resolved for you. Requires the editor role.",
  tag: "Projects",
  scopes: ["studies:write"],
  // The org id is optional here (resolved from membership when unambiguous),
  // so the declarative gate cannot read it out of the body. `createProject`
  // performs its own `editor` check against the org it ends up using.
  resource: { kind: "none" },
  mutates: "resolved",
  cost: "write",
  idempotent: true,
  inputs: {
    body: z.object({
      name: z.string().min(1).max(120).describe("Human-readable project name."),
      description: z.string().max(2000).nullish(),
      organization_id: uuidParam("organization")
        .optional()
        .describe("Required only when you belong to several workspaces."),
      visibility: z
        .enum(["private", "organization"])
        .optional()
        .describe(
          "organization makes the project visible to every workspace member. Defaults to the workspace's own default.",
        ),
    }),
  },
  response: projectSchema,
  examples: [
    { summary: "Create a project", body: { name: "Checkout redesign" } },
  ],
  handler: async ({ body }, ctx) => {
    const organizationId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      body.organization_id as string | undefined,
    );
    const { data, error } = await createProject(ctx.supabase as never, ctx.userId, {
      name: body.name as string,
      description: (body.description as string | null) ?? null,
      organizationId,
      ...(body.visibility ? { visibility: body.visibility as never } : {}),
    });
    rethrow(error, "organization");
    return serializeProject(data as never);
  },
};

export const getProjectRoute: RouteDefinition = {
  method: "GET",
  path: "/projects/{project_id}",
  operationId: "getProject",
  summary: "Retrieve a project",
  description:
    "Fetch one project by id, including the caller's role on it. Use `GET /projects` to discover ids.",
  tag: "Projects",
  scopes: ["studies:read"],
  resource: { kind: "project", argKey: "project_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object({ project_id: uuidParam("project") }) },
  response: projectSchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await getProject(
      ctx.supabase as never,
      path.project_id as string,
      ctx.userId,
    );
    rethrow(error, "project");
    return serializeProject(data as never);
  },
};

export const updateProjectRoute: RouteDefinition = {
  method: "PATCH",
  path: "/projects/{project_id}",
  operationId: "updateProject",
  summary: "Update a project",
  description: "Rename a project, change its description, or change its visibility.",
  tag: "Projects",
  scopes: ["studies:write"],
  resource: { kind: "project", argKey: "project_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ project_id: uuidParam("project") }),
    body: z.object({
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).nullish(),
      visibility: z.enum(["private", "organization"]).optional(),
    }),
  },
  response: projectSchema,
  handler: async ({ path, body }, ctx) => {
    const { data, error } = await updateProject(
      ctx.supabase as never,
      path.project_id as string,
      ctx.userId,
      requirePatch(body) as never,
    );
    rethrow(error, "project");
    return serializeProject(data as never);
  },
};

export const deleteProjectRoute: RouteDefinition = {
  method: "DELETE",
  path: "/projects/{project_id}",
  operationId: "deleteProject",
  summary: "Delete a project",
  description:
    "Permanently delete a project and everything inside it, including studies and their collected " +
    "responses. This cannot be undone — archive the project instead if you only want it out of the way. " +
    "Requires the admin role.",
  tag: "Projects",
  scopes: ["studies:write"],
  resource: { kind: "project", argKey: "project_id", role: "admin" },
  cost: "write",
  inputs: { path: z.object({ project_id: uuidParam("project") }) },
  response: deletedSchema("project"),
  handler: async ({ path }, ctx) => {
    const { error } = await deleteProject(
      ctx.supabase as never,
      path.project_id as string,
      ctx.userId,
    );
    rethrow(error, "project");
    return { object: "project", id: path.project_id, deleted: true };
  },
};

export const archiveProjectRoute: RouteDefinition = {
  method: "POST",
  path: "/projects/{project_id}/archive",
  operationId: "archiveProject",
  summary: "Archive a project",
  description:
    "Hide a project from the default listing without deleting anything. Reversible with " +
    "`POST /projects/{project_id}/restore`.",
  tag: "Projects",
  scopes: ["studies:write"],
  resource: { kind: "project", argKey: "project_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: { path: z.object({ project_id: uuidParam("project") }) },
  response: projectSchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await archiveProject(
      ctx.supabase as never,
      path.project_id as string,
      ctx.userId,
    );
    rethrow(error, "project");
    return serializeProject(data as never);
  },
};

export const restoreProjectRoute: RouteDefinition = {
  method: "POST",
  path: "/projects/{project_id}/restore",
  operationId: "restoreProject",
  summary: "Restore an archived project",
  description: "Bring an archived project back into the default listing.",
  tag: "Projects",
  scopes: ["studies:write"],
  resource: { kind: "project", argKey: "project_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: { path: z.object({ project_id: uuidParam("project") }) },
  response: projectSchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await restoreProject(
      ctx.supabase as never,
      path.project_id as string,
      ctx.userId,
    );
    rethrow(error, "project");
    return serializeProject(data as never);
  },
};

export const listProjectStudies: RouteDefinition = {
  method: "GET",
  path: "/projects/{project_id}/studies",
  operationId: "listProjectStudies",
  summary: "List studies in a project",
  description:
    "Studies inside one project. Use `GET /studies` to search across every project at once.",
  tag: "Projects",
  scopes: ["studies:read"],
  resource: { kind: "project", argKey: "project_id", role: "viewer" },
  cost: "read",
  inputs: {
    path: z.object({ project_id: uuidParam("project") }),
    query: z.object(paginationQuery),
  },
  response: listOf(studySchema, "studies"),
  handler: async ({ path, query }, ctx) => {
    const { data, error } = await listStudiesByProject(
      ctx.supabase as never,
      path.project_id as string,
      ctx.userId,
    );
    rethrow(error, "project");
    return paginate((data ?? []).map((s) => serializeStudy(s as never)), query);
  },
};

export const PROJECT_ROUTES: RouteDefinition[] = [
  listProjectsRoute,
  createProjectRoute,
  getProjectRoute,
  updateProjectRoute,
  deleteProjectRoute,
  archiveProjectRoute,
  restoreProjectRoute,
  listProjectStudies,
];
