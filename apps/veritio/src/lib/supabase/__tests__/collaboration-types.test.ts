import { describe, expect, it } from 'vitest'
import { createOrganizationSchema } from '../collaboration-types'

const uuid = '11111111-1111-1111-1111-111111111111'

describe('createOrganizationSchema', () => {
  it('requires the source workspace that authorizes team creation', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme Research',
      slug: 'acme-research',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'sourceOrganizationId')).toBe(true)
    }
  })

  it('rejects client-supplied plan and settings fields', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme Research',
      slug: 'acme-research',
      sourceOrganizationId: uuid,
      plan: 'team',
      settings: { type: 'personal' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true)
    }
  })

  it('accepts a normal create-team payload', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme Research',
      slug: 'acme-research',
      sourceOrganizationId: uuid,
    })

    expect(result.success).toBe(true)
  })
})
