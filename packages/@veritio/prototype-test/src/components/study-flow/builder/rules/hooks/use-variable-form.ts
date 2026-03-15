import { useState, useEffect, useMemo, useCallback } from 'react'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type {
  SurveyVariable,
  VariableType,
  VariableFormula,
  ScoreFormula,
  ClassificationFormula,
  CounterFormula,
  ScoreComponent,
  ClassificationRange,
} from '@veritio/prototype-test/lib/supabase/survey-rules-types'

export interface VariableFormState {
  name: string
  description: string
  variable_type: VariableType
  // Score
  scoreQuestions: ScoreComponent[]
  aggregation: 'sum' | 'average' | 'min' | 'max'
  defaultValue: number
  // Classification
  sourceVariable: string
  ranges: ClassificationRange[]
  defaultLabel: string
  // Counter
  counterQuestionId: string
  countValues: string[]
}

const defaultFormState: VariableFormState = {
  name: '',
  description: '',
  variable_type: 'score',
  scoreQuestions: [],
  aggregation: 'sum',
  defaultValue: 0,
  sourceVariable: '',
  ranges: [],
  defaultLabel: 'Unknown',
  counterQuestionId: '',
  countValues: [],
}

export interface UseVariableFormOptions {
  variable: SurveyVariable | null
  questions: StudyFlowQuestion[]
  isOpen: boolean
}
export function useVariableForm({ variable, questions, isOpen }: UseVariableFormOptions) {
  const [formState, setFormState] = useState<VariableFormState>(defaultFormState)

  // Filter to numeric questions (likert, nps, rating, etc.)
  const numericQuestions = useMemo(
    () => questions.filter((q) =>
      ['likert', 'nps', 'rating', 'number', 'slider'].includes(q.question_type)
    ),
    [questions]
  )

  // Filter to choice questions for counter
  const choiceQuestions = useMemo(
    () => questions.filter((q) =>
      ['single_choice', 'multiple_choice', 'dropdown'].includes(q.question_type)
    ),
    [questions]
  )

  // Load variable data when editing
  useEffect(() => {
    if (variable) {
      const config = variable.config
      setFormState({
        name: variable.name,
        description: variable.description || '',
        variable_type: variable.variable_type,
        scoreQuestions: config.type === 'score' ? config.questions : [],
        aggregation: config.type === 'score' ? config.aggregation : 'sum',
        defaultValue: config.type === 'score' ? (config.defaultValue ?? 0) : 0,
        sourceVariable: config.type === 'classification' ? config.sourceVariable : '',
        ranges: config.type === 'classification' ? config.ranges : [],
        defaultLabel: config.type === 'classification' ? config.defaultLabel : 'Unknown',
        counterQuestionId: config.type === 'counter' ? config.questionId : '',
        countValues: config.type === 'counter' ? config.countValues : [],
      })
    } else {
      setFormState({
        ...defaultFormState,
        name: `Variable ${Date.now().toString().slice(-4)}`,
      })
    }
  }, [variable, isOpen])

  // Build formula from form state
  const buildFormula = useCallback((): VariableFormula => {
    switch (formState.variable_type) {
      case 'score':
        return {
          type: 'score',
          questions: formState.scoreQuestions,
          aggregation: formState.aggregation,
          defaultValue: formState.defaultValue,
        } as ScoreFormula

      case 'classification':
        return {
          type: 'classification',
          sourceVariable: formState.sourceVariable,
          ranges: formState.ranges,
          defaultLabel: formState.defaultLabel,
        } as ClassificationFormula

      case 'counter':
        return {
          type: 'counter',
          questionId: formState.counterQuestionId,
          countValues: formState.countValues,
        } as CounterFormula
    }
  }, [formState])

  // Validation
  const isValid = useMemo(() => {
    if (!formState.name.trim()) return false

    switch (formState.variable_type) {
      case 'score':
        return formState.scoreQuestions.length > 0
      case 'classification':
        return !!formState.sourceVariable && formState.ranges.length > 0
      case 'counter':
        return !!formState.counterQuestionId && formState.countValues.length > 0
    }
  }, [formState])

  // Update helpers
  const updateField = useCallback(<K extends keyof VariableFormState>(
    key: K,
    value: VariableFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }, [])

  return {
    formState,
    setFormState,
    updateField,
    numericQuestions,
    choiceQuestions,
    buildFormula,
    isValid,
  }
}
