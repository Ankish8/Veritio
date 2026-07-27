/**
 * Authenticated builder release smoke tests.
 *
 * These tests use fixture IDs created through the real API so navigation does
 * not depend on whichever project card happens to render first.
 */

import { afterAll, beforeAll, describe, expect, it, run } from '../utils/test-runner'
import { getUrl, open, snapshot, wait } from '../utils/browser'
import { login, resetSession } from '../utils/auth'
import { config } from '../utils/test-config'

const builderFixtures = [
  ['Card Sort', process.env.E2E_CARD_SORT_STUDY_ID],
  ['Tree Test', process.env.E2E_TREE_TEST_STUDY_ID],
  ['Survey', process.env.E2E_SURVEY_STUDY_ID],
  ['Prototype Test', process.env.E2E_PROTOTYPE_STUDY_ID],
  ['First Click', process.env.E2E_FIRST_CLICK_STUDY_ID],
  ['First Impression', process.env.E2E_FIRST_IMPRESSION_STUDY_ID],
  ['Live Website Test', process.env.E2E_LIVE_WEBSITE_STUDY_ID],
] as const

describe('Builder - All Study Types', () => {
  beforeAll(async () => {
    if (!process.env.E2E_PROJECT_ID || builderFixtures.some(([, studyId]) => !studyId)) {
      throw new Error('Builder fixture IDs are required for the release smoke suite')
    }

    await login()
  })

  afterAll(() => {
    resetSession()
  })

  for (const [studyType, studyId] of builderFixtures) {
    it(`should load the ${studyType.toLowerCase()} builder`, () => {
      open(config.routes.builder(process.env.E2E_PROJECT_ID!, studyId!), {
        timeout: config.navigationTimeout,
      })
      wait(1800)

      const url = getUrl()
      const snap = snapshot({ compact: true })

      expect.toContain(url, `/studies/${studyId}/builder`)
      expect.toBeTruthy(snap.length > 0)
      expect.toBeFalsy(snap.includes('Application error'))
      expect.toBeFalsy(snap.includes('Study not found'))
    })
  }
})

run()
