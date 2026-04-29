import { describe, expect, it } from 'vitest'
import { validateExternalHttpUrl } from '../external-url'

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }]

describe('validateExternalHttpUrl', () => {
  it('allows public HTTP and HTTPS URLs that resolve to public addresses', async () => {
    await expect(validateExternalHttpUrl('https://example.com/path', { lookup: publicLookup }))
      .resolves.toMatchObject({ ok: true })
    await expect(validateExternalHttpUrl('http://example.com', { lookup: publicLookup }))
      .resolves.toMatchObject({ ok: true })
  })

  it('rejects unsupported schemes and embedded credentials', async () => {
    await expect(validateExternalHttpUrl('file:///etc/passwd', { lookup: publicLookup }))
      .resolves.toMatchObject({ ok: false })
    await expect(validateExternalHttpUrl('https://user:pass@example.com', { lookup: publicLookup }))
      .resolves.toMatchObject({ ok: false })
  })

  it('rejects DNS failures and internal hostname suffixes', async () => {
    await expect(validateExternalHttpUrl('https://missing.example', {
      lookup: async () => {
        throw new Error('not found')
      },
    })).resolves.toMatchObject({ ok: false })

    for (const url of [
      'http://localhost',
      'http://service.local',
      'http://admin.internal',
      'http://localhost.',
    ]) {
      await expect(validateExternalHttpUrl(url, { lookup: publicLookup }))
        .resolves.toMatchObject({ ok: false })
    }
  })

  it('rejects hostnames that resolve to internal or reserved addresses', async () => {
    for (const address of [
      '10.0.0.1',
      '100.64.0.1',
      '127.0.0.1',
      '169.254.169.254',
      '172.16.0.1',
      '192.168.1.1',
      '198.18.0.1',
      '224.0.0.1',
      'fc00::1',
      'fe80::1',
    ]) {
      await expect(validateExternalHttpUrl('https://example.com', {
        lookup: async () => [{ address }],
      })).resolves.toMatchObject({ ok: false })
    }
  })

  it('rejects direct private IPs, odd loopback forms, and IPv4-mapped loopback', async () => {
    for (const url of [
      'http://10.0.0.1',
      'http://127.0.0.1',
      'http://2130706433',
      'http://0x7f000001',
      'http://0177.0.0.1',
      'http://127.1',
      'http://[::1]',
      'http://[::ffff:127.0.0.1]',
      'http://[::ffff:7f00:1]',
    ]) {
      await expect(validateExternalHttpUrl(url)).resolves.toMatchObject({ ok: false })
    }
  })
})
