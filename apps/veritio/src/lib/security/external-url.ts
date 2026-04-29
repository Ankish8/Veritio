import { lookup as defaultLookup } from 'dns/promises'
import net from 'net'

type LookupAddress = { address: string; family?: number }
type LookupFn = (hostname: string) => Promise<LookupAddress[]>

export interface ExternalUrlValidationOptions {
  lookup?: LookupFn
}

export interface ExternalUrlValidationResult {
  ok: boolean
  url?: URL
  error?: string
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal']
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.', '0', '0.0.0.0'])

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '')
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  let value = 0
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const octet = Number(part)
    if (octet < 0 || octet > 255) return null
    value = (value << 8) + octet
  }

  return value >>> 0
}

function ipv6ToBigInt(ip: string): bigint | null {
  const zoneIndex = ip.indexOf('%')
  if (zoneIndex !== -1) return null

  const [headRaw, tailRaw, extra] = ip.split('::')
  if (extra !== undefined) return null

  const parsePart = (part: string): number[] => {
    if (!part) return []
    return part.split(':').map((chunk) => {
      if (!/^[0-9a-f]{1,4}$/i.test(chunk)) return -1
      return parseInt(chunk, 16)
    })
  }

  const head = parsePart(headRaw)
  const tail = tailRaw === undefined ? [] : parsePart(tailRaw)
  if (head.includes(-1) || tail.includes(-1)) return null

  const missing = tailRaw === undefined ? 0 : 8 - head.length - tail.length
  if (missing < 0) return null

  const groups = [...head, ...Array(missing).fill(0), ...tail]
  if (groups.length !== 8) return null

  return groups.reduce((acc, group) => (acc << 16n) + BigInt(group), 0n)
}

function ipv4InCidr(value: number, cidr: string): boolean {
  const [baseIp, bitsRaw] = cidr.split('/')
  const base = ipv4ToNumber(baseIp)
  const bits = Number(bitsRaw)
  if (base === null || bits < 0 || bits > 32) return false
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (value & mask) === (base & mask)
}

function ipv6InCidr(value: bigint, cidr: string): boolean {
  const [baseIp, bitsRaw] = cidr.split('/')
  const base = ipv6ToBigInt(baseIp)
  const bits = Number(bitsRaw)
  if (base === null || bits < 0 || bits > 128) return false
  const mask = bits === 0 ? 0n : ((1n << BigInt(bits)) - 1n) << BigInt(128 - bits)
  return (value & mask) === (base & mask)
}

const BLOCKED_IPV4_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '255.255.255.255/32',
]

const BLOCKED_IPV6_CIDRS = [
  '::/128',
  '::1/128',
  '::ffff:0:0/96',
  '64:ff9b::/96',
  '100::/64',
  '2001::/23',
  '2001:db8::/32',
  '2002::/16',
  'fc00::/7',
  'fe80::/10',
  'fec0::/10',
  'ff00::/8',
]

export function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  if (BLOCKED_HOSTNAMES.has(normalized)) return true
  return BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

export function isBlockedIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address)
  const family = net.isIP(normalized)

  if (family === 4) {
    const value = ipv4ToNumber(normalized)
    if (value === null) return true
    return BLOCKED_IPV4_CIDRS.some((cidr) => ipv4InCidr(value, cidr))
  }

  if (family === 6) {
    const value = ipv6ToBigInt(normalized)
    if (value === null) return true
    return BLOCKED_IPV6_CIDRS.some((cidr) => ipv6InCidr(value, cidr))
  }

  return false
}

export async function validateExternalHttpUrl(
  rawUrl: string,
  options: ExternalUrlValidationOptions = {}
): Promise<ExternalUrlValidationResult> {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'Invalid URL' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTP and HTTPS URLs are allowed' }
  }

  if (url.username || url.password) {
    return { ok: false, error: 'URLs with embedded credentials are not allowed' }
  }

  const hostname = normalizeHostname(url.hostname)
  if (!hostname || isBlockedHostname(hostname)) {
    return { ok: false, error: 'Internal hostnames are not allowed' }
  }

  if (net.isIP(hostname)) {
    return isBlockedIpAddress(hostname)
      ? { ok: false, error: 'Internal IP addresses are not allowed' }
      : { ok: true, url }
  }

  const lookup = options.lookup ?? (async (name: string) => {
    const addresses = await defaultLookup(name, { all: true, verbatim: true })
    return addresses.map((entry) => ({ address: entry.address, family: entry.family }))
  })

  let addresses: LookupAddress[]
  try {
    addresses = await lookup(hostname)
  } catch {
    return { ok: false, error: 'Hostname could not be resolved' }
  }

  if (!addresses.length) {
    return { ok: false, error: 'Hostname could not be resolved' }
  }

  for (const entry of addresses) {
    if (isBlockedIpAddress(entry.address)) {
      return { ok: false, error: 'Resolved address is not allowed' }
    }
  }

  return { ok: true, url }
}
