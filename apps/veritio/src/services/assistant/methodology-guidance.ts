/**
 * Veritio AI Assistant — Methodology Best Practices
 *
 * Study-type-specific UX research methodology guidance.
 * Loaded on-demand via the `get_best_practices` tool (not baked into the system prompt)
 * to keep token usage low on messages that don't need methodology advice.
 */

export function getMethodologyGuidance(studyType: string): string | null {
  switch (studyType) {
    case 'card_sort':
      return CARD_SORT_GUIDANCE
    case 'tree_test':
      return TREE_TEST_GUIDANCE
    case 'survey':
      return SURVEY_GUIDANCE
    case 'prototype_test':
      return PROTOTYPE_TEST_GUIDANCE
    case 'first_click':
      return FIRST_CLICK_GUIDANCE
    case 'first_impression':
      return FIRST_IMPRESSION_GUIDANCE
    case 'live_website_test':
      return LIVE_WEBSITE_TEST_GUIDANCE
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Per-type methodology guidance
// ---------------------------------------------------------------------------

const CARD_SORT_GUIDANCE = `# Card Sort — Best Practices

## What It Measures
How users mentally group and label information — essential for designing navigation, menus, and content architecture.

## Card Writing
- Each card = one concept, feature, or content item. Use user language, not internal jargon.
- Aim for 30–60 cards. Under 20 gives too few patterns; over 80 causes fatigue.
- Keep labels short (2–5 words). Add a description only if the label is ambiguous.
- Avoid overlapping cards (e.g., "Account Settings" and "My Settings") — they inflate categories without adding signal.

## Category Tips (Closed/Hybrid)
- Closed sorts: 5–10 categories. Too many overwhelms; too few forces bad groupings.
- Category labels should be distinct and non-overlapping.
- Hybrid sorts: pre-set 3–5 expected categories and let participants create their own — reveals whether your IA matches mental models.

## Recommended Questions
- Post-study: "How easy was it to decide where each card belonged?" (rating scale) — measures grouping confidence.
- "Were any cards confusing or hard to place?" (open text) — surfaces ambiguous labels.
- Avoid asking participants to justify each grouping — that's what the sort data tells you.
- Screening: "How familiar are you with [domain]?" — ensures participants have relevant mental models.`

const TREE_TEST_GUIDANCE = `# Tree Test — Best Practices

## What It Measures
Whether users can find information in a site's navigation structure, without visual design influence.

## Tree Structure
- Keep the tree 3–4 levels deep max. Deeper trees cause abandonment.
- 5–9 items per level (Miller's Law). More than 10 siblings means the level needs sub-grouping.
- Use user-facing labels, not internal terminology. "Help & Support" not "Knowledge Base Portal".
- Only include main navigation paths you want to validate — not every page.

## Task Writing
- Write tasks as realistic scenarios, not navigation instructions. Bad: "Find the Returns section." Good: "You bought a shirt that doesn't fit. Where would you go to send it back?"
- Each task should have one correct answer (or a small set of acceptable answers).
- Aim for 8–12 tasks. Under 5 gives too little data; over 15 causes fatigue.
- Vary task difficulty — mix deep and shallow items.
- Don't use the exact label text from the tree — that turns it into a word-matching exercise.

## Recommended Questions
- "How easy was it to find what you were looking for?" (rating scale) — perceived findability.
- "Were there any items you expected to find in a different location?" (open text) — reveals IA mismatches.`

const SURVEY_GUIDANCE = `# Survey — Best Practices

## What It Measures
Structured quantitative and qualitative feedback from participants on attitudes, preferences, behaviors, and experiences.

## Question Writing
- One thing per question — avoid double-barreled: "How useful and easy was this?" → split into two.
- Be neutral — don't lead. Bad: "How great was your experience?" Good: "How would you rate your experience?"
- Keep questions short and concrete. Vague questions get vague answers.
- Easy/demographic questions first, sensitive/complex ones later (warm-up effect).
- 10–15 questions max for standalone surveys. Completion drops sharply after 15.

## Answer Options
- Likert scales: 5 or 7 points with labeled endpoints. Always label both ends.
- Multiple choice: options must be mutually exclusive and exhaustive. Include "Other" with text field if needed.
- Rating scales: define what numbers mean. "Rate 1–10" without context = unreliable data.
- Randomize option order (except scales) to avoid order bias.

## Structure
- Group related questions into logical sections with clear headings.
- Use screening / skip logic to avoid irrelevant questions.
- Mix closed (quantitative) with 1–2 open text (qualitative) per section.
- End with an open "Anything else?" — often surfaces the most valuable insights.`

const PROTOTYPE_TEST_GUIDANCE = `# Prototype Test — Best Practices

## What It Measures
Whether users can navigate a Figma prototype to complete realistic tasks — testing usability, flow, and interaction design.

## Task Writing
- Frame as realistic goals, not UI instructions. Bad: "Click the hamburger menu, then Settings." Good: "You want to change your notification preferences. How would you do that?"
- Each task needs a clear, verifiable endpoint (destination screen or component state).
- Start with an easy warm-up task, then increase complexity.
- 3–7 tasks. Prototype tests are cognitively demanding — too many causes fatigue.
- Don't use exact button/link labels in task wording — that gives the answer away.

## Instructions
- Tell participants to "think aloud" if recording sessions.
- Remind them there are no wrong answers — you're testing the design, not them.
- For pathway success criteria, be clear about what "successful" navigation looks like.

## Recommended Questions
- Per-task: "How easy was it to complete this task?" (5-point scale) — per-task difficulty score.
- Post-study: "What was the most confusing part of the experience?" (open text).
- "How confident are you that you completed each task correctly?" — reveals where users think they succeeded but actually failed.
- Consider SUS (System Usability Scale) or SEQ (Single Ease Question) for benchmarking.`

const FIRST_CLICK_GUIDANCE = `# First Click Test — Best Practices

## What It Measures
Where users click first on a static design when given a task — a strong predictor of overall task success (correct first click → ~2x more likely to complete the task).

## Task Writing
- Frame as goals, not "click" instructions. Bad: "Click the search icon." Good: "You want to find a specific product. Where would you click first?"
- Each task should have a clear target area for click clustering analysis.
- Keep tasks specific — vague tasks like "explore this page" produce scattered, uninterpretable data.
- 3–8 tasks per design. First-click tests are fast.
- Consider adding a time limit (5–10 seconds) to capture instinctive reactions.

## Design/Image Tips
- Use realistic, full-fidelity screenshots or mockups — wireframes may not reflect real visual hierarchy.
- Ensure high resolution and readability at the display size.
- Test one design state per task.

## Recommended Questions
- Per-task: "How confident are you that you clicked in the right place?" (5-point scale).
- Post-study: "Was anything hard to find or unclear?" (open text).
- "What did you expect to happen after clicking?" — surfaces mental model mismatches.`

const LIVE_WEBSITE_TEST_GUIDANCE = `# Live Website Test — Best Practices

## What It Measures
Whether users can find information and complete tasks on a live production website — testing real-world findability, usability, and navigation without the constraints of a prototype.

## Task Writing
- Frame tasks as realistic goals: "You want to compare pricing plans and sign up for the Pro plan."
- Each task needs a \`target_url\` (starting page) and clear success criteria.
- 3–8 tasks is ideal. Live website tasks are more cognitively demanding than prototype tasks because participants navigate a real site.
- Set \`success_criteria_type\` appropriately:
  - \`self_reported\`: participant clicks "Done" — best for exploratory or subjective tasks.
  - \`url_match\`: auto-detected when participant reaches \`success_url\` — best for clear navigation goals.
  - \`exact_path\`: specific navigation path required — configure in the builder UI.
- Set time limits (60–180 seconds) to prevent participants from spending too long on difficult tasks.

## Tracking Mode Selection
- **url_only**: Tracks page URLs only. Simplest setup — works with any website. No click tracking.
- **snippet**: JavaScript snippet installed on the site. Tracks clicks, scroll depth, rage clicks, and DOM snapshots. Best for sites you control.
- **reverse_proxy**: Routes traffic through a proxy. Full tracking without installing code. Best for sites you don't control.

## Settings Tips
- Enable \`allowSkipTasks\` so frustrated participants can move on rather than abandoning the study entirely.
- Enable \`showTaskProgress\` for studies with 4+ tasks so participants know how far along they are.
- Consider disabling \`allowMobile\` if the site isn't mobile-optimized — mobile participants on desktop sites produce noisy data.
- Set \`defaultTimeLimitSeconds\` as a fallback for tasks without individual limits.

## Recommended Questions
- Per-task: Single Ease Question (SEQ) — "How easy was it to complete this task?" (7-point scale). The SEQ is the industry standard for per-task difficulty.
- Post-study: "What was the most frustrating part of navigating the website?" (open text).
- Post-study: "How likely are you to recommend this website to a colleague?" (NPS).
- Screening: "How often do you visit [website domain]?" — separates first-time visitors from regulars.

## Key Metrics
- **Usability Score**: Composite score from success rate, directness, and time. Higher is better.
- **Direct vs Indirect Success**: Direct = went straight to the goal. Indirect = found it via a roundabout path. High indirect rate means poor information scent.
- **Rage Clicks**: Multiple rapid clicks in the same area — indicates frustration or broken UI elements.
- **Pages per Task**: Lower is better for navigation tasks. High page counts suggest users are lost.`

const FIRST_IMPRESSION_GUIDANCE = `# First Impression Test — Best Practices

## What It Measures
Users' gut reactions to a design shown for a brief, timed exposure (typically 5–10 seconds) — revealing perceived purpose, visual appeal, trustworthiness, and brand perception before conscious analysis kicks in.

**Key principle:** First impressions form in ~50ms and heavily influence all subsequent interactions.

## Design Setup
- 5-second exposure works for most designs. 3 seconds for simple (landing pages, logos). 8–10 seconds for complex (dashboards, dense pages).
- One design per task. A vs B comparison requires separate designs.
- Use final or near-final visual fidelity — wireframes don't trigger the same emotional responses.

## Question Writing (Critical for This Study Type)
Ask about **immediate reactions**, not detailed analysis. Participants only saw the design briefly.

### Best Question Types
- **Recall:** "What do you remember seeing?" / "What stood out most?" (open text) — tests visual hierarchy and memorability.
- **Purpose:** "What do you think this website/app is for?" (open text) — tests if the design communicates its purpose.
- **Feeling:** "How did this design make you feel?" or "Pick 3 words that describe this design" (multiple choice: professional, cluttered, modern, outdated, trustworthy, confusing, clean, playful, boring, exciting).
- **Appeal:** "How visually appealing is this design?" (5-point Likert: Very unappealing → Very appealing).
- **Trust:** "How trustworthy does this website look?" (5-point Likert) — critical for e-commerce, fintech, healthcare.
- **Comparison:** "Which design do you prefer?" (post-study question if testing multiple designs).

### Rules
- 3–5 questions per design max. Brief viewing = limited depth.
- Avoid usability questions ("Could you find the navigation?") — participants didn't interact. Use prototype test or first-click for those.
- Avoid leading: Bad: "How professional does this look?" Good: "How would you describe this design's style?"

## Recommended Question Flow
1. Open recall ("What do you remember?") — ALWAYS first, before any prompting
2. Purpose/comprehension ("What is this for?")
3. Emotional/aesthetic rating (Likert scales)
4. Word association or descriptive choice
5. Overall preference (post-study, if comparing designs)`
