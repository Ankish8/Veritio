# Branding Style Dropdowns

## Goal

Replace the browser-native controls in the branding tab's **Style & Appearance** section with Veritio's design-system select while fixing clipping and inconsistent spacing.

## Approved design

- Use the existing `@/components/ui/select` primitives so the controls match the application and retain keyboard, focus, disabled, and portal behavior.
- Keep the three fields in an equal-width three-column grid when space permits.
- Stack the fields at narrow widths so labels, values, and chevrons never collide.
- Show only each option's concise label in the closed trigger.
- Show the label and supporting description in the open menu.
- Keep the existing store setters and values unchanged so persistence behavior is unaffected.

## Implementation

1. Replace `NativeSelectField` with a reusable design-system select field inside `style-section.tsx`.
2. Replace fixed pixel widths and wrapping flex layout with a responsive grid and consistent gaps.
3. Give triggers a full-width, compact height and ensure selected text can truncate without covering the chevron.
4. Render menu descriptions as secondary text with sufficient menu width.
5. Keep read-only disabling and value-change guards intact.

## Verification

- Run focused TypeScript/lint or component checks for the changed file.
- Verify all three menus open and align correctly in the branding tab.
- Verify mouse and keyboard selection, read-only behavior where available, responsive stacking, and reload persistence.
