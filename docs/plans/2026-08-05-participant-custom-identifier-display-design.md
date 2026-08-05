# Structured Custom Participant Identifiers

## Problem

Participant identity values can be collected through custom demographic fields, but result views only resolve the canonical `firstName`, `lastName`, and `email` keys. A custom field labelled `First Name` therefore captures valid data under its UUID while every result surface falls back to `P1`, `P2`, and so on.

The affected live study has five valid names stored under one custom-field UUID. Its built-in `firstName` field is disabled and its display setting still targets `fullName`, so this is a display-contract mismatch rather than data loss.

## Goals

- Allow an enabled custom demographic field to be the primary or secondary participant identifier.
- Make participant-number display explicit instead of relying on an accidental fallback.
- Prevent a study from launching with display settings that cannot resolve any collected field.
- Restore the affected live study without rewriting or deleting participant responses.
- Preserve the existing `P{n}` fallback when a configured value is genuinely absent.

## Design

### Display field contract

Extend `ParticipantDisplayField` with:

- `participantNumber`
- ``custom:${string}``

The participant display resolver will read `custom:<id>` from the demographic data using the exact custom field ID. `participantNumber` will resolve directly to `P{index}`. Canonical fields and the existing primary-to-secondary fallback remain unchanged.

### Builder behavior

The Display Settings selectors will be generated from the enabled demographic fields:

- `Full Name` is available when first or last name is enabled.
- Canonical first name, last name, and email options are available only when their corresponding fields are enabled.
- Every enabled custom field is available as `custom:<field-id>` using its configured question text as the label.
- `Participant Number` is always available, and `None` remains available for the secondary field.

When the selected display field becomes invalid, the builder must surface a validation issue before launch rather than silently promising a name and showing participant numbers later.

### Existing study repair

Add a precise, idempotent migration for study `37b58306-110a-4b99-892c-14b40c2e1a5d` that changes only its participant display settings:

- primary: `custom:553d5fb6-77ba-4574-99e9-99ebcdad680c`
- secondary: `none`

The participant metadata remains untouched. Existing and future responses continue using the same custom-field UUID, avoiding a split identity format while the study is live.

The migration must guard on the study ID and the expected custom field so it is safe to re-run and cannot affect unrelated studies.

## Error handling and compatibility

- Unknown or removed custom field references resolve through the existing fallback chain.
- Older studies with canonical display settings continue to behave unchanged.
- Anonymous studies continue to display participant numbers.
- Custom values are rendered only after string normalization; empty or non-string values are treated as absent.

## Verification

- Unit tests for canonical fields, custom fields, participant number, missing custom fields, and primary-to-secondary fallback.
- Validation tests covering valid custom identifiers and stale/uncollected display fields.
- Focused type checks for the affected packages and app.
- Render-level verification that the affected study resolves the five UUID-backed values as participant names after the migration is applied.
