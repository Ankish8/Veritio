'use client'

import { useState, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Filter, Plus, ChevronDown } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import type { SegmentFilterType, SegmentOperator } from '@/stores/segment-store'
import {
  StatusFilterConfig,
  UrlTagFilterConfig,
  CategoriesFilterConfig,
  QuestionResponseConfig,
} from './filter-configs'

type FilterStep = 'select-type' | 'configure'

interface FilterConfig {
  type: SegmentFilterType
  operator: SegmentOperator
  value: string | number | string[] | [number, number]
  questionId?: string
  questionText?: string
  tagKey?: string
}

export const SegmentDropdown = memo(function SegmentDropdown() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<FilterStep>('select-type')
  const [filterConfig, setFilterConfig] = useState<Partial<FilterConfig>>({})

  const {
    availableStatuses,
    availableUrlTags,
    availableQuestions,
    categoriesRange,
    addFilter,
  } = useSegment()

  const resetAndClose = useCallback(() => {
    setStep('select-type')
    setFilterConfig({})
    setOpen(false)
  }, [])

  const handleSelectType = useCallback((type: SegmentFilterType) => {
    setFilterConfig({ type })
    setStep('configure')
  }, [])

  const handleAddFilter = useCallback(() => {
    if (filterConfig.type && filterConfig.operator && filterConfig.value !== undefined) {
      addFilter({
        type: filterConfig.type,
        operator: filterConfig.operator,
        value: filterConfig.value,
        questionId: filterConfig.questionId,
        questionText: filterConfig.questionText,
        tagKey: filterConfig.tagKey,
      })
      resetAndClose()
    }
  }, [filterConfig, addFilter, resetAndClose])

  const canAdd = () => {
    if (!filterConfig.type || !filterConfig.operator) return false
    if (filterConfig.value === undefined || filterConfig.value === '') return false
    if (Array.isArray(filterConfig.value) && filterConfig.value.length === 0) return false
    return true
  }

  const renderTypeSelection = () => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Filter participants by:
      </p>

      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => handleSelectType('status')}
      >
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Status
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {availableStatuses.length} options
        </span>
      </Button>

      {availableUrlTags.length > 0 && (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => handleSelectType('url_tag')}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            URL Tag
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {availableUrlTags.length} tags
          </span>
        </Button>
      )}

      {categoriesRange.max > 0 && (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => handleSelectType('categories_created')}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Categories Created
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {categoriesRange.min}-{categoriesRange.max}
          </span>
        </Button>
      )}

      {availableQuestions.length > 0 && (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => handleSelectType('question_response')}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Question Response
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {availableQuestions.length} questions
          </span>
        </Button>
      )}
    </div>
  )

  const renderConfiguration = () => {
    switch (filterConfig.type) {
      case 'status':
        return (
          <StatusFilterConfig
            availableStatuses={availableStatuses}
            value={filterConfig.value as string | string[] | undefined}
            onChange={(operator, value) =>
              setFilterConfig({ ...filterConfig, operator, value })
            }
          />
        )
      case 'url_tag':
        return (
          <UrlTagFilterConfig
            availableUrlTags={availableUrlTags}
            tagKey={filterConfig.tagKey}
            value={filterConfig.value as string | undefined}
            onTagKeyChange={(key) =>
              setFilterConfig({ ...filterConfig, tagKey: key, value: undefined })
            }
            onChange={(operator, value) =>
              setFilterConfig({ ...filterConfig, operator, value })
            }
          />
        )
      case 'categories_created':
        return (
          <CategoriesFilterConfig
            categoriesRange={categoriesRange}
            operator={filterConfig.operator}
            value={filterConfig.value as number | [number, number] | undefined}
            onOperatorChange={(operator, defaultValue) =>
              setFilterConfig({ ...filterConfig, operator, value: defaultValue })
            }
            onChange={(value) => setFilterConfig({ ...filterConfig, value })}
          />
        )
      case 'question_response':
        return (
          <QuestionResponseConfig
            availableQuestions={availableQuestions}
            questionId={filterConfig.questionId}
            value={filterConfig.value as string | undefined}
            onQuestionChange={(questionId, questionText) =>
              setFilterConfig({
                ...filterConfig,
                questionId,
                questionText,
                value: undefined,
              })
            }
            onChange={(operator, value) =>
              setFilterConfig({ ...filterConfig, operator, value })
            }
          />
        )
      default:
        return null
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Add Filter
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        {step === 'select-type' ? (
          renderTypeSelection()
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('select-type')}
              >
                ← Back
              </Button>
              <span className="font-medium capitalize">
                {filterConfig.type?.replace('_', ' ')}
              </span>
            </div>
            <Separator />
            {renderConfiguration()}
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!canAdd()}
                onClick={handleAddFilter}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
})
