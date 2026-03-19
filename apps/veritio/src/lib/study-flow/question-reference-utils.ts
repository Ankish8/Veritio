/**
 * Question Reference Utilities
 *
 * Functions for finding and cleaning question references within branching logic.
 * Used when deleting questions that may be referenced by other questions' conditions.
 */

import type {
  StudyFlowQuestion,
} from '../supabase/study-flow-types';

/**
 * Find all questions that reference a given question ID in their branching conditions.
 * Uses a Set for O(1) duplicate checking.
 */
export function findQuestionsReferencingId(
  questionIdToCheck: string,
  allQuestions: StudyFlowQuestion[]
): string[] {
  const referencingIds = new Set<string>();

  for (const question of allQuestions) {
    if (question.id === questionIdToCheck) continue;

    if (hasBranchingReference(question.branching_logic, questionIdToCheck)) {
      referencingIds.add(question.id);
      continue;
    }

    if (hasBranchingReference(question.survey_branching_logic, questionIdToCheck)) {
      referencingIds.add(question.id);
    }
  }

  return Array.from(referencingIds);
}

/**
 * Check whether a branching logic JSON blob references a given question ID
 * in any of its rule conditions.
 */
function hasBranchingReference(
  branchingLogic: unknown,
  questionId: string
): boolean {
  if (!branchingLogic || typeof branchingLogic !== 'object') return false;

  const logic = branchingLogic as {
    rules?: Array<{ conditions?: Array<{ questionId?: string }> }>;
  };

  if (!logic.rules) return false;

  for (const rule of logic.rules) {
    if (rule.conditions?.some((c) => c.questionId === questionId)) {
      return true;
    }
  }

  return false;
}

/**
 * Remove all conditions that reference a given question ID from a question's
 * branching logic. Returns the updated question with cleaned conditions.
 */
export function removeConditionReferences(
  question: StudyFlowQuestion,
  referencedQuestionId: string
): StudyFlowQuestion {
  const updated = { ...question };

  if (updated.branching_logic) {
    updated.branching_logic = cleanBranchingLogicField(
      updated.branching_logic,
      referencedQuestionId
    ) as typeof updated.branching_logic;
  }

  if (updated.survey_branching_logic) {
    updated.survey_branching_logic = cleanBranchingLogicField(
      updated.survey_branching_logic,
      referencedQuestionId
    ) as typeof updated.survey_branching_logic;
  }

  return updated;
}

/**
 * Clean a single branching logic JSON field by removing any conditions
 * that reference the given question ID. Localizes the `as any` cast
 * to this one helper instead of spreading it across the caller.
 */
function cleanBranchingLogicField(
  branchingLogic: unknown,
  referencedQuestionId: string
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logic = branchingLogic as any;
  if (!logic.rules || !Array.isArray(logic.rules)) {
    return branchingLogic;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanedRules = logic.rules.map((rule: any) => {
    if (!rule.conditions) return rule;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanedConditions = rule.conditions.filter(
      (c: { questionId?: string }) => c.questionId !== referencedQuestionId
    );
    return {
      ...rule,
      conditions: cleanedConditions.length > 0 ? cleanedConditions : undefined,
      matchAll: cleanedConditions.length > 0 ? rule.matchAll : undefined,
    };
  });

  return {
    ...logic,
    rules: cleanedRules,
  };
}
