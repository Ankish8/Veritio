import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "@veritio/auth/server";
import { checkStudyPermission } from "@/services/permission-service";
import { assertStudyFeature } from "@/services/entitlements-service";
import { hasRequiredRole } from "@/lib/supabase/collaboration-types";
import { signYjsToken } from "@/lib/security/yjs-token";
import { EntitlementError } from "@/lib/api/classify-error";

interface YjsTokenUser {
  userId: string;
  email?: string;
  name?: string | null;
}

type YjsTokenIssueResult =
  | { ok: true; token: string }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        code?: string;
        requiredPlan?: string;
      };
    };

export interface YjsCollaborationBootstrap {
  enabled: boolean;
  token: string | null;
}

let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!_supabaseClient) {
    const supabaseUrl =
      process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return null;
    _supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return _supabaseClient;
}

export async function verifyYjsBearerSessionToken(
  token: string,
): Promise<YjsTokenUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: session, error } = (await supabase
    .from("session")
    .select("userId, expiresAt, user:userId(id, email, name)")
    .eq("token", token)
    .single()) as {
    data: {
      userId: string;
      expiresAt: string;
      user: { id: string; email?: string; name?: string | null } | null;
    } | null;
    error: unknown;
  };

  if (error || !session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.user?.email,
    name: session.user?.name,
  };
}

export async function issueYjsTokenForUser(
  studyId: string,
  user: YjsTokenUser,
): Promise<YjsTokenIssueResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      body: { error: "Server misconfigured" },
    };
  }

  const permission = await checkStudyPermission(
    supabase as any,
    studyId,
    user.userId,
    "viewer",
  );

  if (permission.error) {
    return {
      ok: false,
      status: permission.error.message === "Study not found" ? 404 : 500,
      body: { error: permission.error.message },
    };
  }

  if (!permission.allowed || !permission.userRole) {
    return {
      ok: false,
      status: 403,
      body: { error: "Forbidden" },
    };
  }

  try {
    await assertStudyFeature(supabase as any, studyId, "collaboration");
  } catch (error) {
    if (error instanceof EntitlementError) {
      return {
        ok: false,
        status: 403,
        body: {
          error: error.message,
          code: error.code,
          requiredPlan: error.requiredPlan,
        },
      };
    }

    const message = error instanceof Error ? error.message : "Forbidden";
    return {
      ok: false,
      status: message === "Study not found" ? 404 : 403,
      body: { error: message },
    };
  }

  const docName = `study:${studyId}`;
  const token = await signYjsToken({
    userId: user.userId,
    email: user.email,
    name: user.name ?? undefined,
    studyId,
    docName,
    role: permission.userRole,
    canWrite: hasRequiredRole(permission.userRole, "editor"),
  });

  if (!token) {
    return {
      ok: false,
      status: 500,
      body: { error: "Server misconfigured" },
    };
  }

  return { ok: true, token };
}

export async function issueYjsTokenForCurrentSession(
  studyId: string,
): Promise<string | null> {
  const session = await getServerSession();
  if (!session?.user) return null;

  const result = await issueYjsTokenForUser(studyId, {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });

  return result.ok ? result.token : null;
}

export async function getYjsCollaborationBootstrapForCurrentSession(
  studyId: string,
): Promise<YjsCollaborationBootstrap> {
  const session = await getServerSession();
  if (!session?.user) {
    return { enabled: false, token: null };
  }

  const result = await issueYjsTokenForUser(studyId, {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });

  if (result.ok) {
    return { enabled: true, token: result.token };
  }

  if (result.status === 403 && result.body.code === "UPGRADE_REQUIRED") {
    return { enabled: false, token: null };
  }

  return { enabled: true, token: null };
}
