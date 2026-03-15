'use client'
import { Switch } from '@veritio/ui/components/switch'
import { Label } from '@veritio/ui/components/label'
import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import { cn } from '@veritio/ui'
import {
  BranchTargetSelector,
  BranchTargetValue,
  getBranchTargetRowClass,
} from './branch-target-selector'
import { ValueEditor, type ConditionValueUpdate } from '../shared/condition-value-editors'
import {
  getOperatorsForQuestion,
  getDefaultOperator,
  type DisplayLogicOperatorDef,
} from '@veritio/prototype-test/lib/study-flow/display-logic-operators'
import type {
  StudyFlowQuestion,
  SurveyCustomSection,
  EnhancedSurveyBranchingLogic,
  EnhancedBranchingRule,
  EnhancedBranchingOperator,
  SurveyBranchTarget,
} from '../../../../lib/supabase/study-flow-types'
// TYPES

interface EnhancedBranchingEditorProps {
  question: StudyFlowQuestion
  branchingLogic: EnhancedSurveyBranchingLogic | null
  onBranchingLogicChange: (logic: EnhancedSurveyBranchingLogic | null) => void
  allQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
  currentQuestionId: string
  currentSectionId?: string | null
  currentQuestionPosition?: number
  flowSection?: string
  disabled?: boolean
  onCreateSection?: () => void
}
// CONSTANTS
const EMPTY_STATE_OPERATORS = ['is_empty', 'is_not_empty', 'is_not_answered']
// MAIN COMPONENT

export function EnhancedBranchingEditor({
  question,
  branchingLogic,
  onBranchingLogicChange,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  disabled = false,
  onCreateSection,
}: EnhancedBranchingEditorProps) {
  const isRequired = question.is_required ?? false
  const branchingEnabled = branchingLogic !== null && branchingLogic !== undefined

  // Get operators for this question type, filtering based on required state
  const availableOperators = getOperatorsForQuestion(question).filter(
    (op) => !isRequired || !EMPTY_STATE_OPERATORS.includes(op.value)
  )

  // Toggle branching on/off
  const handleToggleBranching = (enabled: boolean) => {
    if (enabled) {
      const defaultOp = availableOperators[0]?.value || 'is_answered'
      onBranchingLogicChange({
        type: 'enhanced',
        rules: [
          {
            id: crypto.randomUUID(),
            operator: defaultOp as EnhancedBranchingOperator,
            target: 'continue',
          },
        ],
        defaultTarget: 'continue',
      })
    } else {
      onBranchingLogicChange(null)
    }
  }

  // Add a new rule
  const handleAddRule = () => {
    if (!branchingLogic) return
    const defaultOp = availableOperators[0]?.value || 'is_answered'
    onBranchingLogicChange({
      ...branchingLogic,
      rules: [
        ...branchingLogic.rules,
        {
          id: crypto.randomUUID(),
          operator: defaultOp as EnhancedBranchingOperator,
          target: 'continue',
        },
      ],
    })
  }

  // Update a rule
  const handleUpdateRule = (index: number, updates: Partial<EnhancedBranchingRule>) => {
    if (!branchingLogic) return
    const newRules = [...branchingLogic.rules]
    newRules[index] = { ...newRules[index], ...updates }
    onBranchingLogicChange({
      ...branchingLogic,
      rules: newRules,
    })
  }

  // Remove a rule
  const handleRemoveRule = (index: number) => {
    if (!branchingLogic) return
    onBranchingLogicChange({
      ...branchingLogic,
      rules: branchingLogic.rules.filter((_, i) => i !== index),
    })
  }

  // Update default target
  const handleUpdateDefaultTarget = (targetValue: BranchTargetValue) => {
    if (!branchingLogic) return
    onBranchingLogicChange({
      ...branchingLogic,
      defaultTarget: targetValue.target,
      defaultTargetId: targetValue.targetId,
    })
  }

  return (
    <div className="space-y-3">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Branching</Label>
          <p className="text-xs text-muted-foreground">
            Control participant flow based on selections
          </p>
        </div>
        <Switch
          checked={branchingEnabled}
          onCheckedChange={handleToggleBranching}
          disabled={disabled}
        />
      </div>

      {/* Branching Rules */}
      {branchingEnabled && branchingLogic && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
          {/* Rules */}
          <div className="space-y-2">
            {branchingLogic.rules.map((rule, index) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                question={question}
                operators={availableOperators}
                allQuestions={allQuestions}
                customSections={customSections}
                currentQuestionId={currentQuestionId}
                currentSectionId={currentSectionId}
                currentQuestionPosition={currentQuestionPosition}
                flowSection={flowSection}
                onUpdate={(updates) => handleUpdateRule(index, updates)}
                onRemove={() => handleRemoveRule(index)}
                disabled={disabled}
                onCreateSection={onCreateSection}
                showRemove={branchingLogic.rules.length > 1}
              />
            ))}
          </div>

          {/* Add Rule Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRule}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>

          {/* Default Target */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">
                Otherwise
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <BranchTargetSelector
                value={{
                  target: branchingLogic.defaultTarget,
                  targetId: branchingLogic.defaultTargetId,
                }}
                onChange={handleUpdateDefaultTarget}
                questions={allQuestions}
                sections={customSections}
                currentQuestionId={currentQuestionId}
                currentSectionId={currentSectionId ?? undefined}
                currentQuestionPosition={currentQuestionPosition}
                flowSection={flowSection}
                disabled={disabled}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// RULE ROW COMPONENT

interface RuleRowProps {
  rule: EnhancedBranchingRule
  question: StudyFlowQuestion
  operators: DisplayLogicOperatorDef[]
  allQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
  currentQuestionId: string
  currentSectionId?: string | null
  currentQuestionPosition?: number
  flowSection?: string
  onUpdate: (updates: Partial<EnhancedBranchingRule>) => void
  onRemove: () => void
  disabled: boolean
  onCreateSection?: () => void
  showRemove: boolean
}

function RuleRow({
  rule,
  question,
  operators,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  onUpdate,
  onRemove,
  disabled,
  onCreateSection,
  showRemove,
}: RuleRowProps) {
  const currentOperator = operators.find((op) => op.value === rule.operator)
  const rowClass = getBranchTargetRowClass(rule.target)

  // Handle operator change - reset values if UI type changes
  const handleOperatorChange = (newOperatorValue: string) => {
    const newOp = operators.find((op) => op.value === newOperatorValue)
    const oldOp = currentOperator

    // If value UI type changed, reset values
    if (oldOp?.valueUI !== newOp?.valueUI) {
      onUpdate({
        operator: newOperatorValue as EnhancedBranchingOperator,
        value: undefined,
        values: undefined,
        minValue: undefined,
        maxValue: undefined,
        rowId: undefined,
        columnId: undefined,
        columnIds: undefined,
        itemId: undefined,
        secondItemId: undefined,
        position: undefined,
        scaleId: undefined,
      })
    } else {
      onUpdate({ operator: newOperatorValue as EnhancedBranchingOperator })
    }
  }

  // Handle value updates
  const handleValueUpdate = (updates: ConditionValueUpdate) => {
    onUpdate(updates as Partial<EnhancedBranchingRule>)
  }

  // Handle target change
  const handleTargetChange = (targetValue: BranchTargetValue) => {
    onUpdate({
      target: targetValue.target,
      targetId: targetValue.targetId,
    })
  }

  return (
    <div
      className={cn(
        'rounded border p-2 space-y-2 transition-colors',
        rowClass || 'bg-background'
      )}
    >
      {/* Condition Row: "If answer [operator] [value]" */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground shrink-0">If answer</span>

        {/* Operator Selector */}
        <Select
          value={rule.operator}
          onValueChange={handleOperatorChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Editor */}
        {currentOperator && (
          <ValueEditor
            condition={rule}
            operator={currentOperator}
            sourceQuestion={question}
            onUpdate={handleValueUpdate}
          />
        )}
      </div>

      {/* Target Row: "then → [target]" */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">then</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <BranchTargetSelector
          value={{ target: rule.target, targetId: rule.targetId }}
          onChange={handleTargetChange}
          questions={allQuestions}
          sections={customSections}
          currentQuestionId={currentQuestionId}
          currentSectionId={currentSectionId ?? undefined}
          currentQuestionPosition={currentQuestionPosition}
          flowSection={flowSection}
          disabled={disabled}
          className="flex-1"
        />

        {/* Remove Button */}
        {showRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            className="shrink-0 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
