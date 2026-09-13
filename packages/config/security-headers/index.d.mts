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
