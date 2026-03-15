'use client'
import { useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@veritio/ui/components/dialog'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import { Textarea } from '@veritio/ui/components/textarea'
import { KeyboardShortcutHint, EscapeHint } from '@veritio/ui/components/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { useSurveyRulesStore, useVariable } from '@veritio/prototype-test/stores'
import { useVariableForm } from './hooks/use-variable-form'
import {
  ScoreVariableConfig,
  ClassificationVariableConfig,
  CounterVariableConfig,
} from './variable-configs'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { SurveyVariable, VariableType } from '@veritio/prototype-test/lib/supabase/survey-rules-types'

interface VariableEditorDialogProps {
  isOpen: boolean
  onClose: () => void
  variableId: string | null
  studyId: string
  questions: StudyFlowQuestion[]
  existingVariables: SurveyVariable[]
}

export function VariableEditorDialog({
  isOpen,
  onClose,
  variableId,
  studyId,
  questions,
  existingVariables,
}: VariableEditorDialogProps) {
  const variable = useVariable(variableId)
  const { createVariable, updateVariable, isSaving } = useSurveyRulesStore()

  const {
    formState,
    updateField,
    numericQuestions,
    choiceQuestions,
    buildFormula,
    isValid,
  } = useVariableForm({ variable: variable ?? null, questions, isOpen })

  const handleSave = useCallback(async () => {
    const config = buildFormula()

    if (variableId) {
      await updateVariable(variableId, {
        name: formState.name,
        description: formState.description || null,
        variable_type: formState.variable_type,
        config,
      })
    } else {
      await createVariable({
        name: formState.name,
        description: formState.description || undefined,
        variable_type: formState.variable_type,
        config,
      })
    }
    onClose()
  }, [buildFormula, variableId, formState, updateVariable, createVariable, onClose])

  // Keyboard shortcuts: Cmd+Enter to save (when valid and not saving)
  useKeyboardShortcut({
    enabled: isOpen && isValid && !isSaving,
    onCmdEnter: handleSave,
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {variableId ? 'Edit Variable' : 'Create Score Variable'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Variable Name</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., satisfaction_score"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formState.variable_type}
                onValueChange={(value: VariableType) => updateField('variable_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score (aggregate numeric values)</SelectItem>
                  <SelectItem value="classification">Classification (group by ranges)</SelectItem>
                  <SelectItem value="counter">Counter (count specific answers)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formState.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe what this variable measures..."
              rows={2}
            />
          </div>

          {/* Score Configuration */}
          {formState.variable_type === 'score' && (
            <ScoreVariableConfig
              questions={formState.scoreQuestions}
              numericQuestions={numericQuestions}
              aggregation={formState.aggregation}
              defaultValue={formState.defaultValue}
              onQuestionsChange={(q) => updateField('scoreQuestions', q)}
              onAggregationChange={(v) => updateField('aggregation', v)}
              onDefaultValueChange={(v) => updateField('defaultValue', v)}
            />
          )}

          {/* Classification Configuration */}
          {formState.variable_type === 'classification' && (
            <ClassificationVariableConfig
              sourceVariable={formState.sourceVariable}
              ranges={formState.ranges}
              defaultLabel={formState.defaultLabel}
              scoreVariables={existingVariables}
              currentVariableId={variableId}
              onSourceVariableChange={(v) => updateField('sourceVariable', v)}
              onRangesChange={(r) => updateField('ranges', r)}
              onDefaultLabelChange={(v) => updateField('defaultLabel', v)}
            />
          )}

          {/* Counter Configuration */}
          {formState.variable_type === 'counter' && (
            <CounterVariableConfig
              questionId={formState.counterQuestionId}
              countValues={formState.countValues}
              choiceQuestions={choiceQuestions}
              onQuestionChange={(q) => updateField('counterQuestionId', q)}
              onCountValuesChange={(v) => updateField('countValues', v)}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
            <EscapeHint />
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isValid}>
            {isSaving ? 'Saving...' : variableId ? 'Save Changes' : 'Create Variable'}
            {!isSaving && <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
