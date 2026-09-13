import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('security.txt', () => {
  it('publishes the verified-domain security mailbox and private reporting channel', async () => {
    const response = GET()
    const body = await response.text()

    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(body).toContain('Contact: mailto:security@veritio.io')
    expect(body).toContain('https://github.com/Ankish8/Veritio/security/advisories/new')
    expect(body).not.toContain('veritio.dev')
  })
})
