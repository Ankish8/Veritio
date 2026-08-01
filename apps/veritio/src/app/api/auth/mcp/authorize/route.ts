import "server-only";

import { toNextJsHandler } from "better-auth/next-js";
import { forceConsentPrompt } from "@/mcp/oauth-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Better Auth 1.4 grants immediately unless the client explicitly asks for
 * prompt=consent. MCP clients must never choose whether the user sees the
 * approval screen, so every authorization request is normalized here.
 */
export async function GET(request: Request) {
  const { auth } = await import("@veritio/auth/auth-instance");
  const consentRequest = new Request(forceConsentPrompt(request.url), request);
  return toNextJsHandler(auth).GET(consentRequest);
}
