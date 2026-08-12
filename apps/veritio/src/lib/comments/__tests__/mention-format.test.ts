/**
 * Tests for the comment @mention wire format.
 *
 * The round-trip test below is the one that would have caught the original
 * defect: the server parsed mentions with `/@([a-zA-Z0-9_-]+)/g`, which cannot
 * match the `@[Name](userId)` format the composer emits, so the `mentions`
 * column was always empty and no mention could ever be notified.
 */
import { describe, it, expect } from 'vitest'
import {
  extractMentions,
  extractMentionIds,
  formatMention,
  stripMentionMarkup,
  mentionRegex,
} from '../mention-format'

const UUID_A = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const UUID_B = 'b1a7f3c2-1111-4a2b-9c3d-0e5f6a7b8c9d'

describe('mention-format', () => {
  describe('round-trip', () => {
    it('extracts what formatMention produces', () => {
      const content = `Hey ${formatMention('John Doe', UUID_A)} please look`

      expect(extractMentionIds(content)).toEqual([UUID_A])
      expect(extractMentions(content)[0]).toMatchObject({
        name: 'John Doe',
        userId: UUID_A,
      })
    })

    it('survives names containing spaces, dots and unicode', () => {
      const names = ['Ada Lovelace', 'J. R. R. Tolkien', 'Zoë Müller', '田中 太郎']

      for (const name of names) {
        const [parsed] = extractMentions(formatMention(name, UUID_A))
        expect(parsed.name).toBe(name)
        expect(parsed.userId).toBe(UUID_A)
      }
    })
  })

  describe('extractMentions', () => {
    it('returns mentions in document order with offsets', () => {
      const content = `${formatMention('A', UUID_A)} and ${formatMention('B', UUID_B)}`
      const mentions = extractMentions(content)

      expect(mentions).toHaveLength(2)
      expect(mentions[0].userId).toBe(UUID_A)
      expect(mentions[1].userId).toBe(UUID_B)
      expect(mentions[0].index).toBeLessThan(mentions[1].index)
      expect(content.slice(mentions[1].index, mentions[1].index + mentions[1].raw.length))
        .toBe(mentions[1].raw)
    })

    it('ignores bare @handles, which are not mentions', () => {
      expect(extractMentions('ping @john and @jane about this')).toEqual([])
    })

    it('ignores an email address', () => {
      expect(extractMentions('mail me at ankish@veritio.io')).toEqual([])
    })

    it('returns nothing for content without mentions', () => {
      expect(extractMentions('no mentions here')).toEqual([])
      expect(extractMentions('')).toEqual([])
    })
  })

  describe('extractMentionIds', () => {
    it('dedupes repeated mentions of the same user', () => {
      const content = `${formatMention('A', UUID_A)} ... ${formatMention('A', UUID_A)}`
      expect(extractMentionIds(content)).toEqual([UUID_A])
    })

    it('returns ids, never display names', () => {
      const ids = extractMentionIds(formatMention('John Doe', UUID_A))
      expect(ids).toEqual([UUID_A])
      expect(ids).not.toContain('John Doe')
    })
  })

  describe('mentionRegex', () => {
    it('returns a fresh instance so lastIndex never leaks between calls', () => {
      const content = formatMention('A', UUID_A)

      // A shared global regex would return null on the second call here.
      expect(mentionRegex().exec(content)).not.toBeNull()
      expect(mentionRegex().exec(content)).not.toBeNull()
    })
  })

  describe('stripMentionMarkup', () => {
    it('renders mentions as plain @name text', () => {
      const content = `Hey ${formatMention('John Doe', UUID_A)}, see ${formatMention('Ada', UUID_B)}`
      expect(stripMentionMarkup(content)).toBe('Hey @John Doe, see @Ada')
    })

    it('leaves mention-free content untouched', () => {
      expect(stripMentionMarkup('plain text')).toBe('plain text')
    })

    it('never leaks a raw user id into human-facing text', () => {
      expect(stripMentionMarkup(formatMention('John', UUID_A))).not.toContain(UUID_A)
    })
  })
})
