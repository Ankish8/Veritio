<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep server-side integration of PostHog into the Veritio Motia backend using `posthog-node`. A shared singleton client was created at `src/lib/posthog.ts` and wired into 14 step handler files covering the full user and study lifecycle — from new user signup through workspace initialization, study creation and launch, participant responses, team invitations, and data exports. User identification calls (`posthog.identify()`) were added at the two key signup/onboarding endpoints so backend events can be correlated with frontend sessions.

| Event name | Description | File |
|---|---|---|
| `user signed up` | A new user completes sign-up by redeeming a valid invite code | `apps/veritio/src/steps/api/invite-codes/redeem-invite-code.step.ts` |
| `workspace initialized` | A new user's personal workspace and default project are created on first login | `apps/veritio/src/steps/api/user/initialize-workspace.step.ts` |
| `project created` | A user creates a new project to organize studies within their workspace | `apps/veritio/src/steps/api/projects/create-project.step.ts` |
| `study created` | A user creates a new study of any type in a project | `apps/veritio/src/steps/api/studies/create-study.step.ts` |
| `study launched` | A user publishes a study by setting its status to active | `apps/veritio/src/steps/api/studies/update-study.step.ts` |
| `study deleted` | A user permanently deletes a study | `apps/veritio/src/steps/api/studies/delete-study.step.ts` |
| `study archived` | A user archives a study to remove it from their active view | `apps/veritio/src/steps/api/studies/archive-study.step.ts` |
| `participant started` | A participant begins a study session by creating a participation record | `apps/veritio/src/steps/api/participate/create-participant.step.ts` |
| `study response submitted` | A participant submits a card sort response | `apps/veritio/src/steps/api/participate/submit-card-sort-response.step.ts` |
| `survey completed` | A participant completes and submits all responses for a survey study | `apps/veritio/src/steps/api/participate/complete-survey.step.ts` |
| `live website response submitted` | A participant submits results for a live website test session | `apps/veritio/src/steps/api/participate/submit/live-website.step.ts` |
| `invitation sent` | A user invites a team member to join their organization | `apps/veritio/src/steps/api/invitations/create-invitation.step.ts` |
| `invitation accepted` | A user accepts an invitation and joins an organization as a team member | `apps/veritio/src/steps/api/invitations/accept-invitation.step.ts` |
| `export started` | A user initiates a data export job for a study to an integration or CSV | `apps/veritio/src/steps/api/export/create-export-job.step.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/496275/dashboard/1795030)
- [New user signups over time](https://us.posthog.com/project/496275/insights/mC2yoHKX)
- [Studies created and launched](https://us.posthog.com/project/496275/insights/uUpZ8rK8)
- [Participant-to-completion funnel](https://us.posthog.com/project/496275/insights/PLmMuxPx)
- [Study responses submitted over time](https://us.posthog.com/project/496275/insights/LGEPNtXP)
- [Team growth: invitations sent and accepted](https://us.posthog.com/project/496275/insights/HCb8a4pe)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `apps/veritio/.env.example` (or verify the root `.env.example` is the canonical source used by collaborators and bootstrap scripts).
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh signup can leave returning sessions on anonymous distinct IDs. Consider adding an `identify` call in the Better Auth session creation path or a middleware that reads the user's session on every authenticated request.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
