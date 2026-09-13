/**
 * The small portion of Better Auth's API-key plugin used by Veritio.
 *
 * The plugin is widened at the package boundary because its inferred type
 * references a private Zod path and cannot be emitted portably. Keep the lost
 * endpoint typing here rather than casting individual calls to `any`.
 */
export interface ApiKeyApi {
  createApiKey(input: {
    body: {
      userId: string;
      name: string;
      prefix: string;
      permissions: Record<string, string[]>;
      expiresIn?: number;
    };
  }): Promise<{
    key: string;
    id: string;
    name: string | null;
    start: string | null;
    expiresAt?: Date | null;
  }>;
  deleteApiKey(input: {
    body: { keyId: string };
    headers: Headers;
  }): Promise<unknown>;
  listApiKeys(input: {
    headers: Headers;
  }): Promise<Array<Record<string, unknown>>>;
  verifyApiKey(input: { body: { key: string } }): Promise<{
    valid: boolean;
    key?: {
      id: string;
      userId: string;
      permissions?: unknown;
    } | null;
  }>;
}

export function apiKeyApi(authApi: unknown): ApiKeyApi {
  return authApi as ApiKeyApi;
}
