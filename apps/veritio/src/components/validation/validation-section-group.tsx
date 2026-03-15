'use client'

import { ValidationIssueItem } from './validation-issue-item'
import type { ValidationIssue, ValidationSectionId } from '@/lib/validation'

interface ValidationSectionGroupProps {
  sectionId: ValidationSectionId
  issues: ValidationIssue[]
  onNavigate: (issue: ValidationIssue) => void
}

export function ValidationSectionGroup({
  issues,
  onNavigate,
}: ValidationSectionGroupProps) {
  if (issues.length === 0) return null

  return (
    <div className="space-y-1">
      {issues.map((issue) => (
        <ValidationIssueItem
          key={issue.id}
          issue={issue}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}
