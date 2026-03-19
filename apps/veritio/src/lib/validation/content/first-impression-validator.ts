import type { FirstImpressionDesign } from '../../supabase/study-flow-types'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, truncateText, findDuplicateLabels } from '../utils'

function validateFirstImpressionDesigns(designs: FirstImpressionDesign[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'first-impression-designs',
  }

  if (designs.length === 0) {
    issues.push(
      createIssue(
        'first_impression_content',
        'At least one design is required',
        navPath,
        { rule: 'min-first-impression-designs' }
      )
    )
    return issues
  }

  const nonPracticeDesigns = designs.filter(d => !d.is_practice)
  if (nonPracticeDesigns.length === 0) {
    issues.push(
      createIssue(
        'first_impression_content',
        'At least one non-practice design is required',
        navPath,
        { rule: 'no-test-designs' }
      )
    )
    return issues
  }

  for (let i = 0; i < designs.length; i++) {
    const design = designs[i]
    const designPosition = i + 1
    const designLabel = design.name
      ? truncateText(design.name, 30)
      : `Design ${designPosition}`

    if (!design.image_url) {
      issues.push(
        createIssue(
          'first_impression_content',
          `${designLabel} is missing an image`,
          { ...navPath, taskId: design.id },
          { itemId: design.id, itemLabel: designLabel, rule: 'no-design-image' }
        )
      )
    }

    if (!design.questions || design.questions.length === 0) {
      issues.push(
        createIssue(
          'first_impression_content',
          `${designLabel} needs at least one question`,
          { ...navPath, taskId: design.id },
          { itemId: design.id, itemLabel: designLabel, rule: 'no-design-questions' }
        )
      )
    }
  }

  // Check for duplicate design names using findDuplicateLabels
  const namedDesigns = designs.filter(d => d.name && d.name.trim().length > 0)
  if (namedDesigns.length > 0) {
    const designItems = namedDesigns.map(d => ({ label: d.name!, id: d.id }))
    const duplicates = findDuplicateLabels(designItems)
    for (const name of duplicates) {
      const originalDesign = namedDesigns.find(d => d.name!.trim().toLowerCase() === name.trim().toLowerCase())
      issues.push(
        createIssue(
          'first_impression_content',
          `Duplicate design name "${truncateText(originalDesign?.name || name, 25)}"`,
          navPath,
          { rule: 'duplicate-design-name' }
        )
      )
    }
  }

  return issues
}

export function validateFirstImpressionContent(
  designs: FirstImpressionDesign[]
): ValidationIssue[] {
  return validateFirstImpressionDesigns(designs)
}
