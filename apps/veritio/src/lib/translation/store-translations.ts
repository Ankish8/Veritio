/**
 * Store and retrieve translated content efficiently
 *
 * Translations are stored in the database (settings.translations field)
 * when a study is launched, and retrieved on subsequent loads.
 *
 * This ensures we only translate once, not on every participant visit.
 */

import type { SupportedLocale } from '../../i18n/config'
import { autoTranslate, autoTranslateHTML } from './auto-translate'

/**
 * Translated content for a specific language
 */
export interface TranslatedContent {
  title?: string
  description?: string
  purpose?: string
  participantRequirements?: string
  welcomeMessage?: string
  thankYouMessage?: string
  welcomeTitle?: string
  welcomeText?: string
  agreementTitle?: string
  agreementMessage?: string
  agreementText?: string
  rejectionTitle?: string
  rejectionMessage?: string
  thankYouTitle?: string
  thankYouText?: string
  instructionsTitle?: string
  instructionsPart1?: string
  instructionsPart2?: string
}

/**
 * Translate all user content for a study
 */
export async function translateStudyContent(
  study: {
    title?: string | null
    description?: string | null
    purpose?: string | null
    participant_requirements?: string | null
    welcome_message?: string | null
    thank_you_message?: string | null
    settings?: any
  },
  targetLocale: SupportedLocale
): Promise<TranslatedContent> {
  const translated: TranslatedContent = {}

  // Translate study metadata
  if (study.title) {
    translated.title = await autoTranslate(study.title, targetLocale)
  }
  if (study.description) {
    translated.description = await autoTranslate(study.description, targetLocale)
  }
  if (study.purpose) {
    translated.purpose = await autoTranslateHTML(study.purpose, targetLocale)
  }
  if (study.participant_requirements) {
    translated.participantRequirements = await autoTranslateHTML(study.participant_requirements, targetLocale)
  }
  if (study.welcome_message) {
    translated.welcomeMessage = await autoTranslateHTML(study.welcome_message, targetLocale)
  }
  if (study.thank_you_message) {
    translated.thankYouMessage = await autoTranslateHTML(study.thank_you_message, targetLocale)
  }

  // Translate study flow content
  const settings = study.settings as any
  if (settings?.studyFlow) {
    const flow = settings.studyFlow

    if (flow.welcome?.title) {
      translated.welcomeTitle = await autoTranslate(flow.welcome.title, targetLocale)
    }
    if (flow.welcome?.message) {
      translated.welcomeText = await autoTranslateHTML(flow.welcome.message, targetLocale)
    }
    if (flow.participantAgreement?.title) {
      translated.agreementTitle = await autoTranslate(flow.participantAgreement.title, targetLocale)
    }
    if (flow.participantAgreement?.message) {
      translated.agreementMessage = await autoTranslateHTML(flow.participantAgreement.message, targetLocale)
    }
    if (flow.participantAgreement?.agreementText) {
      translated.agreementText = await autoTranslateHTML(flow.participantAgreement.agreementText, targetLocale)
    }
    if (flow.participantAgreement?.rejectionTitle) {
      translated.rejectionTitle = await autoTranslate(flow.participantAgreement.rejectionTitle, targetLocale)
    }
    if (flow.participantAgreement?.rejectionMessage) {
      translated.rejectionMessage = await autoTranslateHTML(flow.participantAgreement.rejectionMessage, targetLocale)
    }
    if (flow.thankYou?.title) {
      translated.thankYouTitle = await autoTranslate(flow.thankYou.title, targetLocale)
    }
    if (flow.thankYou?.message) {
      translated.thankYouText = await autoTranslateHTML(flow.thankYou.message, targetLocale)
    }
    if (flow.activityInstructions?.title) {
      translated.instructionsTitle = await autoTranslate(flow.activityInstructions.title, targetLocale)
    }
    if (flow.activityInstructions?.part1) {
      translated.instructionsPart1 = await autoTranslateHTML(flow.activityInstructions.part1, targetLocale)
    }
    if (flow.activityInstructions?.part2) {
      translated.instructionsPart2 = await autoTranslateHTML(flow.activityInstructions.part2, targetLocale)
    }
  }

  return translated
}

/**
 * Apply stored translations to study data
 */
export function applyStoredTranslations(
  study: any,
  translations: Record<string, TranslatedContent>,
  locale: SupportedLocale
): void {
  // Skip if no translations for this locale or if English
  if (locale === 'en-US' || !translations[locale]) {
    return
  }

  const t = translations[locale]

  // Apply metadata translations
  if (t.title) study.title = t.title
  if (t.description) study.description = t.description
  if (t.purpose) study.purpose = t.purpose
  if (t.participantRequirements) study.participant_requirements = t.participantRequirements
  if (t.welcomeMessage) study.welcome_message = t.welcomeMessage
  if (t.thankYouMessage) study.thank_you_message = t.thankYouMessage

  // Apply study flow translations
  const settings = study.settings as any
  if (settings?.studyFlow) {
    const flow = settings.studyFlow

    if (t.welcomeTitle && flow.welcome) flow.welcome.title = t.welcomeTitle
    if (t.welcomeText && flow.welcome) flow.welcome.message = t.welcomeText
    if (t.agreementTitle && flow.participantAgreement) flow.participantAgreement.title = t.agreementTitle
    if (t.agreementMessage && flow.participantAgreement) flow.participantAgreement.message = t.agreementMessage
    if (t.agreementText && flow.participantAgreement) flow.participantAgreement.agreementText = t.agreementText
    if (t.rejectionTitle && flow.participantAgreement) flow.participantAgreement.rejectionTitle = t.rejectionTitle
    if (t.rejectionMessage && flow.participantAgreement) flow.participantAgreement.rejectionMessage = t.rejectionMessage
    if (t.thankYouTitle && flow.thankYou) flow.thankYou.title = t.thankYouTitle
    if (t.thankYouText && flow.thankYou) flow.thankYou.message = t.thankYouText
    if (t.instructionsTitle && flow.activityInstructions) flow.activityInstructions.title = t.instructionsTitle
    if (t.instructionsPart1 && flow.activityInstructions) flow.activityInstructions.part1 = t.instructionsPart1
    if (t.instructionsPart2 && flow.activityInstructions) flow.activityInstructions.part2 = t.instructionsPart2
  }
}
