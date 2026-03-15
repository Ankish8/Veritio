/**
 * Visitor Hash Utilities
 *
 * Privacy-preserving visitor identification for widget frequency capping.
 * Uses SHA-256 hashing to anonymize visitor data while enabling accurate tracking.
 *
 * Privacy Approach:
 * - No raw IPs or fingerprints stored
 * - One-way hashing prevents reverse lookup
 * - Compliant with GDPR/CCPA anonymization requirements
 *
 * @see https://gdpr.eu/eu-gdpr-personal-data/
 */

import { createHash } from 'crypto'

/**
 * Visitor identification result
 */
export interface VisitorIdentity {
  visitorHash: string // Combined hash of IP + fingerprint
  ipHash: string // IP-only hash (fallback)
  fingerprintHash: string | null // Browser fingerprint hash
}

/**
 * Create SHA-256 hash of a string
 * @param input - String to hash
 * @returns SHA-256 hash in hexadecimal format
 */
export function createSHA256Hash(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Extract client IP address from request headers
 * Checks common reverse proxy headers in order of preference
 *
 * @param headers - Request headers object
 * @returns Client IP address or null if not found
 */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string | null {
  // Check x-forwarded-for (most common for proxies/load balancers)
  const forwardedFor = headers['x-forwarded-for']
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]
    return ip?.trim() || null
  }

  // Check x-real-ip (nginx)
  const realIp = headers['x-real-ip']
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp
  }

  // Check cf-connecting-ip (Cloudflare)
  const cfIp = headers['cf-connecting-ip']
  if (cfIp) {
    return Array.isArray(cfIp) ? cfIp[0] : cfIp
  }

  // Check true-client-ip (Akamai, Cloudflare Enterprise)
  const trueClientIp = headers['true-client-ip']
  if (trueClientIp) {
    return Array.isArray(trueClientIp) ? trueClientIp[0] : trueClientIp
  }

  return null
}

/**
 * Create privacy-preserving visitor hash
 * Combines IP address and optional fingerprint for accurate, anonymous tracking
 *
 * @param ip - Client IP address
 * @param fingerprint - Optional browser fingerprint
 * @returns SHA-256 hash
 */
export function createVisitorHash(ip: string, fingerprint?: string): string {
  const combined = fingerprint ? `${ip}:${fingerprint}` : ip
  return createSHA256Hash(combined)
}

/**
 * Create browser fingerprint hash
 * Client-side fingerprints are sent as pre-computed hashes for privacy
 *
 * @param fingerprint - Client-computed fingerprint string
 * @returns SHA-256 hash or null if fingerprint is empty
 */
export function createFingerprintHash(fingerprint: string | null | undefined): string | null {
  if (!fingerprint || fingerprint.trim() === '') {
    return null
  }
  return createSHA256Hash(fingerprint.trim())
}

/**
 * Generate visitor identity from request
 * Primary method for creating visitor identification in API endpoints
 *
 * @param headers - Request headers
 * @param clientFingerprint - Client-provided fingerprint (optional)
 * @returns Visitor identity with all hashes
 */
export function generateVisitorIdentity(
  headers: Record<string, string | string[] | undefined>,
  clientFingerprint?: string | null
): VisitorIdentity {
  // Extract and hash IP
  const ip = getClientIP(headers)
  if (!ip) {
    throw new Error('Unable to determine client IP address')
  }
  const ipHash = createSHA256Hash(ip)

  // Hash fingerprint if provided
  const fingerprintHash = createFingerprintHash(clientFingerprint)

  // Create combined visitor hash
  const visitorHash = createVisitorHash(ip, clientFingerprint || undefined)

  return {
    visitorHash,
    ipHash,
    fingerprintHash,
  }
}

/**
 * Validate visitor hash format
 * Ensures hash is a valid SHA-256 hex string
 *
 * @param hash - Hash to validate
 * @returns Whether hash is valid SHA-256 format
 */
export function isValidVisitorHash(hash: string): boolean {
  // SHA-256 produces 64 character hex string
  return /^[a-f0-9]{64}$/i.test(hash)
}

/**
 * Sanitize IP address for logging (privacy-safe)
 * Masks last octet for IPv4, last 4 groups for IPv6
 *
 * @param ip - IP address to sanitize
 * @returns Sanitized IP for logging
 * @example
 * sanitizeIPForLogging('192.168.1.100') // '192.168.1.***'
 * sanitizeIPForLogging('2001:0db8::1') // '2001:0db8::***'
 */
export function sanitizeIPForLogging(ip: string): string {
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.')
    parts[parts.length - 1] = '***'
    return parts.join('.')
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':')
    // Mask last 4 groups
    for (let i = Math.max(0, parts.length - 4); i < parts.length; i++) {
      parts[i] = '***'
    }
    return parts.join(':')
  }

  return '***'
}

/**
 * Create deterministic session ID from visitor hash
 * Useful for correlating events within a session
 *
 * @param visitorHash - Visitor hash
 * @param studyId - Study UUID
 * @returns Session identifier (first 16 chars of combined hash)
 */
export function createSessionId(visitorHash: string, studyId: string): string {
  const combined = `${visitorHash}:${studyId}:${new Date().toISOString().split('T')[0]}`
  return createSHA256Hash(combined).slice(0, 16)
}

/**
 * Check if two visitor identities match
 * Useful for cross-device tracking detection
 *
 * @param identity1 - First visitor identity
 * @param identity2 - Second visitor identity
 * @returns Whether identities likely represent same visitor
 */
export function isSameVisitor(identity1: VisitorIdentity, identity2: VisitorIdentity): boolean {
  // Exact match on visitor hash (IP + fingerprint)
  if (identity1.visitorHash === identity2.visitorHash) {
    return true
  }

  // Fallback: Same IP but different or missing fingerprint
  if (identity1.ipHash === identity2.ipHash) {
    // If one has fingerprint and other doesn't, consider them different
    // This prevents false positives from shared IPs (offices, cafes, etc.)
    if (
      (identity1.fingerprintHash && !identity2.fingerprintHash) ||
      (!identity1.fingerprintHash && identity2.fingerprintHash)
    ) {
      return false
    }
    return true
  }

  return false
}
