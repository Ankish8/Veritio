export interface SecurityHeaderOptions {
  contentSecurityPolicy: string
  frameOptions?: 'DENY' | 'SAMEORIGIN'
  permissionsPolicy: string
}

export interface SecurityHeader {
  key: string
  value: string
}

export function createSecurityHeaders(options: SecurityHeaderOptions): SecurityHeader[]

export function createCspNonce(): string

export interface AppContentSecurityPolicyOptions {
  landingOrigin: string
  livePreviewOrigin?: string
  development?: boolean
  nonce?: string
}

export function createAppContentSecurityPolicy(
  options: AppContentSecurityPolicyOptions,
): string

export function createLandingContentSecurityPolicy(options?: { nonce?: string }): string
