/**
 * Stream lifecycle registration:
 *
 * 1. `veritio::stream::auth` — the WebSocket-upgrade auth function referenced
 *    by iii-stream's `auth_function` AND the public RBAC listener's
 *    `auth_function_id` (worker-compose.yaml). Validates the browser's `?token=` JWT
 *    into { context: { userId } }; connections WITHOUT a token are allowed
 *    with an empty context — exact parity with the previous model, where
 *    assistantChat.onJoin admitted everyone (capability-URL streamId) and
 *    participantActivity.onJoin rejected anonymous contexts itself.
 *    A PRESENT-but-invalid token is rejected outright.
 *
 * 2. Global `stream:join` / `stream:leave` triggers that dispatch by
 *    stream_name to the *.stream.ts modules' onJoin/onLeave hooks (assistant
 *    cancel-flag write, participant disconnect broadcast).
 *
 * NOTE (verify empirically, P2): in 0.22 stream:join fires as an event; it is
 * not yet confirmed whether returning { unauthorized: true } can veto a
 * subscription the way the 0.7 StreamModule did. Until confirmed, an
 * unauthorized onJoin result is logged loudly; enforcement moves to the RBAC
 * middleware in P3 if the veto is unsupported.
 */

import type { IIIClient } from "iii-sdk";
import type { StreamAuthContext, StreamConfig } from "../motia/types";
import { verifyStreamToken } from "../security/stream-token";
import { buildContext } from "./context";
import { createStepLogger } from "./logger";

export interface StreamModule {
  config: StreamConfig;
}

interface StreamAuthInput {
  headers?: Record<string, string | string[]>;
  query_params?: Record<string, string | string[]>;
  ip_address?: string;
}

interface StreamLifecycleEvent {
  stream_name?: string;
  streamName?: string;
  group_id?: string;
  groupId?: string;
  id?: string;
  item_id?: string;
  context?: StreamAuthContext;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeEvent(event: StreamLifecycleEvent): {
  streamName: string;
  subscription: { groupId: string; id?: string };
  authContext: StreamAuthContext | undefined;
} {
  return {
    streamName: event.stream_name ?? event.streamName ?? "",
    subscription: {
      groupId: event.group_id ?? event.groupId ?? "",
      id: event.id ?? event.item_id,
    },
    authContext: event.context,
  };
}

export function registerStreamLifecycle(
  client: IIIClient,
  streams: StreamModule[],
): void {
  const logger = createStepLogger({ step: "veritio::stream" });
  const byName = new Map(streams.map((s) => [s.config.name, s.config]));

  client.registerFunction(
    "veritio::stream::auth",
    async (input: StreamAuthInput) => {
      const token = firstValue(input.query_params?.token);

      let context: StreamAuthContext = {};
      if (token) {
        const claims = await verifyStreamToken(token);
        if (!claims) {
          // A presented-but-invalid token is an explicit rejection; anonymous
          // connections (no token at all) stay allowed for parity.
          throw new Error("invalid stream token");
        }
        context = { userId: claims.userId };
      }

      return {
        context,
        // The browser-sdk subscription model REQUIRES function registration:
        // the browser registers a local callback and a `stream`-type trigger
        // pointing at it; stream changes arrive as invocations of that
        // callback. Trigger-TYPE registration stays off.
        allow_function_registration: true,
        allow_trigger_type_registration: false,
        // SECURITY: force every function this session registers under a
        // unique per-session prefix. Without it, an untrusted browser can
        // register over a core function id (e.g. state::set) and the engine
        // transfers ownership away from the trusted backend. The prefix makes
        // collisions with core/step ids impossible; the browser's own
        // stream trigger resolves against the prefixed id transparently.
        function_registration_prefix: `browser::${context.userId ?? "anon"}::${crypto.randomUUID()}::`,
        allowed_functions: [],
        forbidden_functions: [],
      };
    },
    {
      description:
        "Veritio stream WebSocket auth: validates ?token= JWT; anonymous allowed with empty context",
    },
  );

  client.registerFunction(
    "veritio::stream::on-join",
    async (event: StreamLifecycleEvent, metadata?: unknown) => {
      const { streamName, subscription, authContext } = normalizeEvent(event);
      const config = byName.get(streamName);
      if (!config?.onJoin) return;
      const ctx = buildContext(client, {
        stepId: `stream::${streamName}::onJoin`,
        metadata,
      });
      const result = await config.onJoin(subscription, ctx, authContext);
      if (result && typeof result === "object" && result.unauthorized) {
        logger.warn("stream onJoin returned unauthorized", {
          streamName,
          groupId: subscription.groupId,
          hasUser: Boolean(authContext?.userId),
        });
      }
      return result ?? undefined;
    },
    {
      description:
        "Dispatches stream:join to the stream definitions (onJoin hooks)",
    },
  );
  client.registerTrigger({
    type: "stream:join",
    function_id: "veritio::stream::on-join",
    config: {},
  });

  client.registerFunction(
    "veritio::stream::on-leave",
    async (event: StreamLifecycleEvent, metadata?: unknown) => {
      const { streamName, subscription, authContext } = normalizeEvent(event);
      const config = byName.get(streamName);
      if (!config?.onLeave) return;
      const ctx = buildContext(client, {
        stepId: `stream::${streamName}::onLeave`,
        metadata,
      });
      await config.onLeave(subscription, ctx, authContext);
    },
    {
      description:
        "Dispatches stream:leave to the stream definitions (onLeave hooks)",
    },
  );
  client.registerTrigger({
    type: "stream:leave",
    function_id: "veritio::stream::on-leave",
    config: {},
  });
}
