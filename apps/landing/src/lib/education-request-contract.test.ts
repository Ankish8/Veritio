import { describe, expect, it } from 'vitest'
import {
  EDUCATION_REQUEST_HONEYPOT_FIELD,
  EDUCATION_REQUEST_HONEYPOT_PROPS,
  requireEducationDelivery,
} from './education-request-contract'

describe('education request delivery contract', () => {
  it('accepts an explicit delivery receipt', async () => {
    await expect(
      requireEducationDelivery(
        new Response(JSON.stringify({ ok: true, delivered: true }), {
          status: 200,
        }),
      ),
    ).resolves.toBeUndefined()
  })

  it('rejects a superficially successful response without a delivery receipt', async () => {
    await expect(requireEducationDelivery(new Response(JSON.stringify({ ok: true }), { status: 200 }))).rejects.toThrow(
      'could not confirm delivery',
    )
  })

  it('rejects a successful response with an unreadable body', async () => {
    await expect(requireEducationDelivery(new Response('not-json', { status: 200 }))).rejects.toThrow(
      'could not confirm delivery',
    )
  })

  it('preserves a server error message', async () => {
    await expect(
      requireEducationDelivery(
        new Response(JSON.stringify({ error: 'Too many requests.' }), {
          status: 429,
        }),
      ),
    ).rejects.toThrow('Too many requests.')
  })

  it('uses a non-semantic trap with password-manager ignore attributes', () => {
    expect(EDUCATION_REQUEST_HONEYPOT_FIELD).not.toMatch(/company|email|name|address/i)
    expect(EDUCATION_REQUEST_HONEYPOT_PROPS).toMatchObject({
      name: EDUCATION_REQUEST_HONEYPOT_FIELD,
      autoComplete: 'off',
      'data-1p-ignore': 'true',
      'data-lpignore': 'true',
      'data-bwignore': 'true',
    })
  })
})
