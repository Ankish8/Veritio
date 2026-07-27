import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES } from './config'

describe('participant choice copy catalogs', () => {
  it.each(SUPPORTED_LOCALES)(
    'provides translated defaults for %s',
    (locale) => {
      const messages = JSON.parse(
        readFileSync(
          resolve(process.cwd(), `src/i18n/messages/${locale}.json`),
          'utf8'
        )
      )

      expect(messages.questions.other).toBeTruthy()
      expect(messages.questions.pleaseSpecify).toBeTruthy()
      expect(messages.questions.selectOption).toBeTruthy()
    }
  )
})
