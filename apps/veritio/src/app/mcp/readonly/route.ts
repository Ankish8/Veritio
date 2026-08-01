import "server-only";

import { createRouteHandler } from "../../../mcp/route-handler";

/**
 * https://veritio.io/mcp/readonly — the same server with every mutating tool
 * withheld, regardless of what the credential is scoped for.
 *
 * A separate URL is the cheapest safety control available: a user who wants an
 * agent to analyse their research without any chance of it editing or
 * launching a study points at this one and needs to trust nothing else.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createRouteHandler({ readOnly: true });

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      error: "method_not_allowed",
      message:
        "The Veritio MCP endpoint accepts POST. Configure your client with a Streamable HTTP transport.",
    }),
    {
      status: 405,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        allow: "POST",
      },
    },
  );
}
