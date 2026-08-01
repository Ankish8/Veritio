import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMotiaSupabaseClient } from "@/lib/supabase/motia-client";
import {
  parseConsentVerification,
  type ConsentVerification,
} from "./oauth-security";

export interface AuthoritativeConsentRequest {
  clientId: string;
  clientName: string;
  scopes: string[];
  verification: ConsentVerification;
}

/** Resolve and bind a short-lived consent code to the current user. */
export async function loadConsentRequest(
  consentCode: string,
  userId: string,
): Promise<AuthoritativeConsentRequest | null> {
  // OAuth tables are introduced by the accompanying migration and therefore
  // are not yet present in the generated Database type.
  const db = getMotiaSupabaseClient() as unknown as SupabaseClient<any>;
  const { data: verification, error: verificationError } = await db
    .from("verification")
    .select("value, expiresAt")
    .eq("identifier", consentCode)
    .maybeSingle();

  if (
    verificationError ||
    !verification ||
    new Date(verification.expiresAt).getTime() <= Date.now()
  ) {
    return null;
  }

  const details = parseConsentVerification(verification.value, userId);
  if (!details) return null;

  const { data: client, error: clientError } = await db
    .from("oauthApplication")
    .select("clientId, name, disabled")
    .eq("clientId", details.clientId)
    .maybeSingle();

  if (clientError || !client || client.disabled) return null;

  return {
    clientId: client.clientId,
    clientName: client.name || client.clientId,
    scopes: details.scopes,
    verification: details,
  };
}
