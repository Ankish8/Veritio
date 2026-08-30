/**
 * Path matching for the public API.
 *
 * A tiny router rather than a file-per-endpoint tree under `app/api/v1/`. The
 * reason is the OpenAPI document: it has to be generated from the same
 * declarations the runtime dispatches on, or it will eventually describe an API
 * that no longer exists. Next.js route files are not enumerable at runtime, so
 * they cannot be that source. A registry can.
 */

import type { HttpMethod, RouteDefinition } from "../v1/define-route";
import { methodNotAllowed, notFound } from "./errors";

interface CompiledRoute {
  def: RouteDefinition;
  /** Literal segments, or `{ param }` for a placeholder. */
  segments: Array<{ literal?: string; param?: string }>;
}

export interface RouteMatch {
  def: RouteDefinition;
  pathParams: Record<string, string>;
}

function compile(def: RouteDefinition): CompiledRoute {
  const segments = def.path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const placeholder = /^\{(.+)\}$/.exec(segment);
      return placeholder ? { param: placeholder[1] } : { literal: segment };
    });
  return { def, segments };
}

export class Router {
  private readonly routes: CompiledRoute[];

  constructor(defs: readonly RouteDefinition[]) {
    // Static segments must win over parameters at the same depth, so
    // `/studies/search` is never swallowed by `/studies/{study_id}`. Sorting by
    // parameter count ascending puts the more specific pattern first, and
    // matching stops at the first hit.
    this.routes = [...defs]
      .sort(
        (a, b) =>
          a.path.split("{").length - b.path.split("{").length ||
          a.path.localeCompare(b.path),
      )
      .map(compile);
  }

  /**
   * Resolve a request path and method.
   *
   * Throws `405` (rather than `404`) when the path exists under a different
   * method, listing what is allowed — a caller who sent `POST` to a read-only
   * endpoint has a different problem from one who mistyped the path, and
   * conflating the two makes both harder to debug.
   */
  match(method: string, segments: readonly string[]): RouteMatch {
    const pathMatches: CompiledRoute[] = [];

    for (const route of this.routes) {
      if (route.segments.length !== segments.length) continue;

      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const spec = route.segments[i];
        const actual = segments[i];
        if (spec.param) {
          params[spec.param] = actual;
        } else if (spec.literal !== actual) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      pathMatches.push(route);
      if (route.def.method === method) {
        return { def: route.def, pathParams: params };
      }
    }

    if (pathMatches.length > 0) {
      const allowed = unique([
        ...pathMatches.map((r) => r.def.method),
        "OPTIONS",
      ]);
      throw methodNotAllowed(allowed);
    }

    throw notFound(
      `No endpoint matches ${method} /api/v1/${segments.join("/")}. See https://veritio.io/docs/api for the full reference.`,
    );
  }

  /** Methods a path supports, for CORS preflight and `Allow`. */
  methodsFor(segments: readonly string[]): HttpMethod[] {
    const methods: HttpMethod[] = [];
    for (const route of this.routes) {
      if (route.segments.length !== segments.length) continue;
      const matches = route.segments.every(
        (spec, i) => spec.param !== undefined || spec.literal === segments[i],
      );
      if (matches) methods.push(route.def.method);
    }
    return unique(methods);
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
