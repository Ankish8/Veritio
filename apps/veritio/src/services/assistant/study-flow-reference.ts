/**
 * Veritio AI Assistant — Study Flow Reference
 *
 * Complete field-by-field documentation for all study flow sections.
 * Loaded on-demand via the `get_study_flow_reference` tool (not baked into the system prompt)
 * to keep token usage low on messages that don't need study flow details.
 */

const SECTION_MAP: Record<string, string> = {
  welcome: `### Welcome Message (\`studyFlow.welcome\`)
Enabled by default. The first screen participants see.
- \`enabled\` (bool) — show/hide the welcome screen
- \`title\` (string) — heading text
- \`message\` (HTML string) — welcome body content
- \`includeStudyTitle\` (bool) — auto-display the study title
- \`includeDescription\` (bool) — auto-display the study description
- \`includePurpose\` (bool) — auto-display the research purpose
- \`includeParticipantRequirements\` (bool) — auto-display participant requirements
- \`showIncentive\` (bool) — show incentive info
- \`incentiveMessage\` (string) — incentive text template (use \`{incentive}\` placeholder)`,

  participantAgreement: `### Participant Agreement (\`studyFlow.participantAgreement\`)
Disabled by default. Consent/ethics agreement before proceeding.
- \`enabled\` (bool) — show/hide the agreement screen
- \`title\` (string) — heading
- \`message\` (string) — intro text above the agreement
- \`agreementText\` (HTML string) — the actual agreement content participants must accept
- \`showRejectionMessage\` (bool) — show a message if participant declines
- \`rejectionTitle\` (string) — rejection page heading
- \`rejectionMessage\` (string) — rejection page body
- \`redirectUrl\` (string) — optional URL to redirect declined participants`,

  screening: `### Screening Questions (\`studyFlow.screening\`)
Disabled by default. Filter participants based on eligibility criteria. Use \`manage_flow_questions\` with \`section: "screening"\` to add/edit the actual questions (auto-enables this section).
- \`enabled\` (bool) — show/hide screening
- \`introTitle\` (string) — intro heading before questions
- \`introMessage\` (string) — intro text
- \`rejectionTitle\` (string) — shown to rejected participants
- \`rejectionMessage\` (string) — rejection body text
- \`redirectUrl\` (string) — redirect URL for rejected participants
- \`redirectImmediately\` (bool) — auto-redirect without showing rejection message
- \`pageMode\` ("one_per_page" | "all_on_one") — question pagination

**Branching logic:** Set \`branching_logic\` on individual screening questions to control pass/reject behavior: \`{"action": "reject", "conditions": [{"questionId": "<this_question_id>", "operator": "equals", "value": "No"}]}\`. If no branching_logic is set, all answers pass.`,

  participantIdentifier: `### Participant Identifier (\`studyFlow.participantIdentifier\`)
Controls how participants are identified. Default: anonymous.
- \`type\` ("anonymous" | "participant_details") — anonymous = no collection; participant_details = show demographic form
- \`demographicProfile.title\` (string) — form heading
- \`demographicProfile.description\` (string) — form intro text
- \`demographicProfile.sections[0].fields[]\` — array of predefined fields, each with: \`id\` (e.g. "email", "firstName", "gender", "ageRange", "location"), \`enabled\` (bool), \`required\` (bool)
- Available predefined field IDs: email, firstName, lastName, gender, ageRange, location, maritalStatus, householdSize, employmentStatus, jobTitle, industry, companySize, yearsOfExperience, department, primaryDevice, operatingSystem, browserPreference, techProficiency, educationLevel, occupationType, locationType, timeZone, priorExperience, followUpWillingness, researchAvailability, contactConsent, yearsUsingProduct, productUsageFrequency, accessibilityNeeds, preferredLanguage, assistiveTechnology, digitalComfort`,

  preStudyQuestions: `### Pre-Study Questions (\`studyFlow.preStudyQuestions\`)
Disabled by default. Questions shown before the main activity. Use \`manage_flow_questions\` with \`section: "pre_study"\` for the actual questions (auto-enables).
- \`enabled\` (bool) — show/hide section
- \`introTitle\` (string) — intro heading
- \`introMessage\` (string) — intro text
- \`pageMode\` ("one_per_page" | "all_on_one") — question pagination
- \`randomizeQuestions\` (bool) — randomize question order`,

  activityInstructions: `### Activity Instructions (\`studyFlow.activityInstructions\`)
Enabled by default. Instructions shown before the main study activity.
- \`enabled\` (bool) — show/hide instructions
- \`title\` (string) — heading
- \`part1\` (HTML string) — main instruction content
- \`part2\` (HTML string) — optional second part (shown on a separate page in some study types)`,

  postStudyQuestions: `### Post-Study Questions (\`studyFlow.postStudyQuestions\`)
Disabled by default. Feedback questions after the main activity. Use \`manage_flow_questions\` with \`section: "post_study"\` for the actual questions (auto-enables).
- \`enabled\` (bool) — show/hide section
- \`introTitle\` (string) — intro heading
- \`introMessage\` (string) — intro text
- \`pageMode\` ("one_per_page" | "all_on_one") — question pagination
- \`randomizeQuestions\` (bool) — randomize question order`,

  surveyQuestionnaire: `### Survey Questionnaire (\`studyFlow.surveyQuestionnaire\`) — Survey studies only
The main activity section for Survey studies. Use \`manage_survey_questions\` for actual questions.
- \`enabled\` (bool) — always true for surveys
- \`showIntro\` (bool) — show intro page before questions
- \`introTitle\` (string) — intro heading
- \`introMessage\` (string) — intro text
- \`pageMode\` ("one_per_page" | "all_on_one") — pagination
- \`randomizeQuestions\` (bool) — randomize question order
- \`showProgressBar\` (bool) — show progress indicator
- \`allowSkipQuestions\` (bool) — allow skipping non-required questions`,

  thankYou: `### Thank You Message (\`studyFlow.thankYou\`)
Enabled by default. Final screen after study completion.
- \`enabled\` (bool) — show/hide thank you screen
- \`title\` (string) — heading
- \`message\` (HTML string) — thank you body content
- \`redirectUrl\` (string) — optional URL to redirect after completion
- \`redirectDelay\` (number) — seconds before auto-redirect (0 = no auto-redirect)
- \`showIncentive\` (bool) — show incentive confirmation
- \`incentiveMessage\` (string) — incentive text template`,

  closedStudy: `### Closed Study Message (\`studyFlow.closedStudy\`)
Shown when the study is no longer accepting responses (replaces welcome screen).
- \`title\` (string) — heading
- \`message\` (string) — body text
- \`redirectUrl\` (string) — optional redirect URL
- \`redirectImmediately\` (bool) — auto-redirect without showing message`,
}

const KEY_RULES = `
### Key Rules
- **"Participant requirements"** is a study metadata field (use \`update_study\` with \`participant_requirements\`), NOT a flow section. Don't confuse it with screening questions.
- **Screening/Pre-study/Post-study questions**: Use \`manage_flow_questions\` to add/edit actual questions. Use \`update_study_settings\` to change section settings (intro text, rejection text, pagination, etc.). Adding questions via \`manage_flow_questions\` automatically enables the section.
- **Enabling/disabling sections**: Use \`update_study_settings\` with \`settings: { studyFlow: { sectionKey: { enabled: true/false } } }\`.
- **HTML content**: Fields marked "HTML string" accept rich text. Use \`<p>\`, \`<ul>\`, \`<ol>\`, \`<li>\`, \`<strong>\`, \`<em>\` tags.`

/**
 * Get study flow reference documentation.
 * When `section` is provided, returns just that section's reference + key rules.
 * When omitted, returns the full reference (all sections).
 */
export function getStudyFlowReference(section?: string): string {
  if (section && SECTION_MAP[section]) {
    return `## Study Flow Reference — ${section}\n\n${SECTION_MAP[section]}\n${KEY_RULES}`
  }

  // Return all sections
  const allSections = Object.values(SECTION_MAP).join('\n\n')
  return `## Study Flow — Complete Reference

The Study Flow defines every screen a participant sees from start to finish. All settings live in \`study.settings.studyFlow\`. Use \`update_study_settings\` with \`settings: { studyFlow: { sectionKey: { ... } } }\` to modify any section. Sections with an \`enabled\` flag can be toggled on/off.

**Participant journey order:**
1. **Welcome Message** → 2. **Participant Agreement** → 3. **Screening Questions** → 4. **Participant Identifier** → 5. **Pre-Study Questions** → 6. **Activity Instructions** → 7. **Main Activity** (study-type-specific) → 8. **Post-Study Questions** → 9. **Thank You Message**
*(Closed Study Message is shown instead of #1 when study is closed)*

${allSections}
${KEY_RULES}`
}
