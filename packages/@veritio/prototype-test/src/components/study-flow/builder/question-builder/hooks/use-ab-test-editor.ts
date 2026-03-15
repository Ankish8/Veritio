'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { useABTests } from '@veritio/prototype-test/hooks'
import { useYjsOptional } from '@veritio/prototype-test/components/yjs/yjs-provider'
import type { StudyFlowQuestion, ChoiceOption, SurveyBranchingLogic } from '../../../../../lib/supabase/study-flow-types'
import type { Json } from '../../../../../lib/supabase/study-flow-types'
export interface ABTestVariantContent {
  question_text?: string
  question_text_html?: string
  description?: string
  options?: ChoiceOption[]
  survey_branching_logic?: SurveyBranchingLogic | null
  shuffle?: boolean
  allowOther?: boolean
  otherLabel?: string
}
const toJson = (content: ABTestVariantContent): Json => content as unknown as Json
type VariantField = keyof ABTestVariantContent
export function useABTestEditor(question: StudyFlowQuestion) {
  const { studyId, isHydrated } = useStudyFlowBuilderStore()
  const yjs = useYjsOptional()

  // CRITICAL: Only fetch A/B tests when:
  // 1. Zustand has hydrated (studyId is available from localStorage)
  // 2. studyId matches the question's study
  // This prevents fetching stale data when localStorage has a different studyId
  const shouldFetch = isHydrated && studyId === question.study_id

  const {
    getABTestForQuestion,
    createABTest,
    updateABTest,
    deleteABTest,
    isLoading: isDataLoading,
    isMutating,
    refetch: refetchABTests,
    mutate: mutateABTests,
  } = useABTests(shouldFetch ? studyId : null)

  const abTest = getABTestForQuestion(question.id)

  // Track previous refetch to avoid loops
  const lastYjsRefetchRef = useRef<string | null>(null)

  // Listen for Yjs updates to AB test state (for real-time sync)
  // When another collaborator toggles AB testing, we'll get instant optimistic update + server refetch
  useEffect(() => {
    if (!yjs?.doc || !shouldFetch) return

    const abTestsMap = yjs.doc.getMap('abTestStates')

    const handleAbTestChange = () => {
      // Get the current AB test state from Yjs
      const yjsState = abTestsMap.get(question.id) as { enabled: boolean; updatedAt: number } | undefined
      if (!yjsState) return

      // Avoid processing our own updates (compare timestamps)
      const stateKey = `${question.id}:${yjsState.updatedAt}`
      if (lastYjsRefetchRef.current === stateKey) return
      lastYjsRefetchRef.current = stateKey

      // Update local state immediately for instant UI feedback
      setLocalIsEnabled(yjsState.enabled)

      // Then revalidate from server to get full AB test data (async, in background)
      // This ensures we have the complete AB test object with variant content
      mutateABTests(undefined, { revalidate: true })
    }

    abTestsMap.observe(handleAbTestChange)
    return () => abTestsMap.unobserve(handleAbTestChange)
  }, [yjs?.doc, question.id, shouldFetch, mutateABTests])

  // Disable toggle only during actual mutation (create/delete)
  // Note: We don't disable during initial loading because:
  // 1. createABTest() already handles the loading check internally
  // 2. The user should be able to interact once the UI is rendered
  // 3. Disabling during loading causes poor UX when SWR revalidates in background
  const isToggleDisabled = isMutating

  // Local A/B enabled state for UI feedback
  const [localIsEnabled, setLocalIsEnabled] = useState(!!abTest)

  // Local split value for smooth slider dragging
  const [localSplitValue, setLocalSplitValue] = useState(abTest?.split_percentage ?? 50)

  // Pending content for immediate UI feedback when enabling A/B testing
  // This stores the content we're creating before the optimistic update completes
  const [pendingVariantAContent, setPendingVariantAContent] = useState<ABTestVariantContent | null>(null)

  // Derived states: detect if description/options are included (from store data)
  const serverIncludeDescription = abTest
    ? 'description' in (abTest.variant_a_content as object) ||
      'description' in (abTest.variant_b_content as object)
    : false

  const serverIncludeOptions = abTest
    ? 'options' in (abTest.variant_a_content as object) ||
      'options' in (abTest.variant_b_content as object)
    : false

  // Local states for immediate UI feedback
  const [localIncludeDescription, setLocalIncludeDescription] = useState(serverIncludeDescription)
  const [localIncludeOptions, setLocalIncludeOptions] = useState(serverIncludeOptions)

  // Sync local states when abTest changes
  useEffect(() => {
    setLocalIsEnabled(!!abTest)
    if (abTest) {
      setLocalSplitValue(abTest.split_percentage)
      setLocalIncludeDescription(serverIncludeDescription)
      setLocalIncludeOptions(serverIncludeOptions)
      // Clear pending content once real abTest is available
      setPendingVariantAContent(null)
    } else {
      // Reset local states when AB testing is disabled
      setLocalIncludeDescription(false)
      setLocalIncludeOptions(false)
    }
  }, [abTest, serverIncludeDescription, serverIncludeOptions])
  const broadcastAbTestState = useCallback(
    (enabled: boolean) => {
      if (!yjs?.doc) return

      const abTestsMap = yjs.doc.getMap('abTestStates')
      const timestamp = Date.now()

      // Update our own ref to avoid refetching our own update
      lastYjsRefetchRef.current = `${question.id}:${timestamp}`

      // Broadcast the change to other collaborators
      abTestsMap.set(question.id, { enabled, updatedAt: timestamp })
    },
    [yjs?.doc, question.id]
  )
  const handleToggle = useCallback(
    async (enabled: boolean) => {
      // CRITICAL: Don't allow toggle while loading or mutating
      if (isToggleDisabled) {
        // A/B test toggle blocked - operation in progress
        return
      }

      // Prevent duplicate operations
      if (enabled && (localIsEnabled || abTest)) {
        return // Already enabled
      }
      if (!enabled && !localIsEnabled && !abTest) {
        return // Already disabled
      }

      if (enabled) {
        // Get LATEST question text from Zustand store FIRST
        const currentState = useStudyFlowBuilderStore.getState()
        const allQuestions = [
          ...currentState.screeningQuestions,
          ...currentState.preStudyQuestions,
          ...currentState.surveyQuestions,
          ...currentState.postStudyQuestions,
        ]
        const latestQuestion = allQuestions.find(q => q.id === question.id)

        // CRITICAL: Clear Yjs fragments for A/B variants before enabling
        // This ensures the CollaborativeEditor will initialize with our content
        // (it only initializes if fragment.length === 0)
        if (yjs?.doc) {
          try {
            const variantAPath = `question.${question.id}.abTest.variantA`
            const variantBPath = `question.${question.id}.abTest.variantB`
            const fragmentA = yjs.doc.getXmlFragment(variantAPath)
            const fragmentB = yjs.doc.getXmlFragment(variantBPath)
            // Clear existing content so CollaborativeEditor will use initialContent
            if (fragmentA.length > 0) {
              fragmentA.delete(0, fragmentA.length)
            }
            if (fragmentB.length > 0) {
              fragmentB.delete(0, fragmentB.length)
            }
          } catch (e) {
            // Failed to clear Yjs fragments for A/B test
          }
        }

        // CRITICAL: Set pending content BEFORE changing localIsEnabled
        // This ensures the UI has content when it renders in A/B mode
        const pendingContent: ABTestVariantContent = {
          question_text: latestQuestion?.question_text || '',
          question_text_html: latestQuestion?.question_text_html || '',
        }
        setPendingVariantAContent(pendingContent)

        // NOW change the enabled state (React batches these updates in React 18+)
        setLocalIsEnabled(true)
        broadcastAbTestState(true)

        // Create AB test and handle potential failures
        const result = await createABTest(question.id, toJson(pendingContent), toJson({
          question_text: '',
          question_text_html: '',
        }))

        // If creation failed (loading, duplicate, race condition), revert UI state
        if (!result) {
          // A/B test creation failed, reverting UI state
          setLocalIsEnabled(false)
          setPendingVariantAContent(null)
          broadcastAbTestState(false) // Broadcast the revert to collaborators
        }
      } else {
        setLocalIsEnabled(false)
        broadcastAbTestState(false)
        // CRITICAL: Sync Variant A content back to the main question BEFORE deleting
        if (abTest) {
          const variantAContent = abTest.variant_a_content as ABTestVariantContent
          const currentState = useStudyFlowBuilderStore.getState()

          // Sync question text from Variant A back to the main question
          if (variantAContent.question_text !== undefined || variantAContent.question_text_html !== undefined) {
            currentState.updateQuestion(question.id, {
              question_text: variantAContent.question_text || '',
              question_text_html: variantAContent.question_text_html || '',
            })
          }

          // Sync description if it was included in A/B test
          if (variantAContent.description !== undefined) {
            currentState.updateQuestion(question.id, {
              description: variantAContent.description || null,
            })
          }

          // Sync options if they were included in A/B test (for choice questions)
          if (variantAContent.options !== undefined) {
            const currentQuestion = [...currentState.screeningQuestions, ...currentState.preStudyQuestions, ...currentState.surveyQuestions, ...currentState.postStudyQuestions].find(q => q.id === question.id)
            if (currentQuestion) {
              currentState.updateQuestion(question.id, {
                config: {
                  ...currentQuestion.config,
                  options: variantAContent.options,
                  shuffle: variantAContent.shuffle,
                  allowOther: variantAContent.allowOther,
                  otherLabel: variantAContent.otherLabel,
                },
                survey_branching_logic: variantAContent.survey_branching_logic ?? null,
              })
            }
          }
        }

        // Now delete the A/B test
        deleteABTest(question.id)
      }
    },
    [question.id, createABTest, deleteABTest, localIsEnabled, abTest, isToggleDisabled, broadcastAbTestState]
  )
  const createVariantFieldHandler = useCallback(
    <T>(field: VariantField) => ({
      a: (value: T) => {
        if (!abTest) return
        updateABTest(question.id, {
          variant_a_content: toJson({ ...(abTest.variant_a_content as ABTestVariantContent), [field]: value }),
        })
      },
      b: (value: T) => {
        if (!abTest) return
        updateABTest(question.id, {
          variant_b_content: toJson({ ...(abTest.variant_b_content as ABTestVariantContent), [field]: value }),
        })
      },
    }),
    [abTest, question.id, updateABTest]
  )

  // Generate all variant field handlers using the factory
  const variantHandlers = useMemo(() => ({
    description: createVariantFieldHandler<string>('description'),
    options: createVariantFieldHandler<ChoiceOption[]>('options'),
    branchingLogic: createVariantFieldHandler<SurveyBranchingLogic | null>('survey_branching_logic'),
    shuffle: createVariantFieldHandler<boolean>('shuffle'),
    allowOther: createVariantFieldHandler<boolean>('allowOther'),
    otherLabel: createVariantFieldHandler<string>('otherLabel'),
  }), [createVariantFieldHandler])
  const handleVariantTextChange = useCallback(
    (variant: 'a' | 'b', html: string) => {
      if (!abTest) return
      const plainText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      const key = variant === 'a' ? 'variant_a_content' : 'variant_b_content'
      updateABTest(question.id, {
        [key]: toJson({
          ...(abTest[key] as ABTestVariantContent),
          question_text: plainText,
          question_text_html: html,
        }),
      })
    },
    [abTest, question.id, updateABTest]
  )
  const handleSplitChange = useCallback(
    (value: number) => {
      if (!abTest) return
      updateABTest(question.id, { split_percentage: value })
    },
    [abTest, question.id, updateABTest]
  )
  const handleIncludeDescriptionToggle = useCallback(
    (include: boolean) => {
      if (!abTest) return
      setLocalIncludeDescription(include)
      if (include) {
        updateABTest(question.id, {
          variant_a_content: toJson({ ...(abTest.variant_a_content as ABTestVariantContent), description: question.description || '' }),
          variant_b_content: toJson({ ...(abTest.variant_b_content as ABTestVariantContent), description: '' }),
        })
      } else {
        const { description: _a, ...variantAWithoutDesc } = abTest.variant_a_content as ABTestVariantContent
        const { description: _b, ...variantBWithoutDesc } = abTest.variant_b_content as ABTestVariantContent
        updateABTest(question.id, {
          variant_a_content: toJson(variantAWithoutDesc),
          variant_b_content: toJson(variantBWithoutDesc),
        })
      }
    },
    [abTest, question.id, question.description, updateABTest]
  )
  const handleIncludeOptionsToggle = useCallback(
    (include: boolean) => {
      if (!abTest) return
      setLocalIncludeOptions(include)
      const config = question.config as { options?: ChoiceOption[]; shuffle?: boolean; allowOther?: boolean; otherLabel?: string }
      if (include) {
        const optionsContent = {
          options: config.options || [],
          shuffle: config.shuffle ?? false,
          allowOther: config.allowOther ?? false,
          otherLabel: config.otherLabel ?? '',
        }
        updateABTest(question.id, {
          variant_a_content: toJson({ ...(abTest.variant_a_content as ABTestVariantContent), ...optionsContent }),
          variant_b_content: toJson({ ...(abTest.variant_b_content as ABTestVariantContent), ...optionsContent }),
        })
      } else {
        const { options: _a, shuffle: _sa, allowOther: _aoa, otherLabel: _ola, ...variantAWithoutOpts } = abTest.variant_a_content as ABTestVariantContent
        const { options: _b, shuffle: _sb, allowOther: _aob, otherLabel: _olb, ...variantBWithoutOpts } = abTest.variant_b_content as ABTestVariantContent
        updateABTest(question.id, {
          variant_a_content: toJson(variantAWithoutOpts),
          variant_b_content: toJson(variantBWithoutOpts),
        })
      }
    },
    [abTest, question.id, question.config, updateABTest]
  )

  // Get variant content with proper typing
  // Use pending content as fallback when enabling A/B testing (before optimistic update completes)
  const variantAContent = (abTest?.variant_a_content || pendingVariantAContent || {}) as ABTestVariantContent
  const variantBContent = (abTest?.variant_b_content || {}) as ABTestVariantContent

  return {
    // State
    abTest,
    isEnabled: localIsEnabled,
    isToggleDisabled, // Use this to disable the Switch component
    localSplitValue,
    setLocalSplitValue,
    includeDescription: localIncludeDescription,
    includeOptions: localIncludeOptions,
    variantAContent,
    variantBContent,

    // Core handlers
    handleToggle,
    handleSplitChange,
    handleIncludeDescriptionToggle,
    handleIncludeOptionsToggle,

    // Unified text handler (special case - updates both text and html)
    handleVariantTextChange,

    // Factory-generated variant handlers (use as: variantHandlers.description.a(value))
    variantHandlers,

    // Legacy API (for backwards compatibility) - delegates to factory handlers
    handleVariantATextChange: (html: string) => handleVariantTextChange('a', html),
    handleVariantBTextChange: (html: string) => handleVariantTextChange('b', html),
    handleVariantADescriptionChange: variantHandlers.description.a,
    handleVariantBDescriptionChange: variantHandlers.description.b,
    handleVariantAOptionsChange: variantHandlers.options.a,
    handleVariantBOptionsChange: variantHandlers.options.b,
    handleVariantABranchingLogicChange: variantHandlers.branchingLogic.a,
    handleVariantBBranchingLogicChange: variantHandlers.branchingLogic.b,
    handleVariantAShuffleChange: variantHandlers.shuffle.a,
    handleVariantBShuffleChange: variantHandlers.shuffle.b,
    handleVariantAAllowOtherChange: variantHandlers.allowOther.a,
    handleVariantBAllowOtherChange: variantHandlers.allowOther.b,
    handleVariantAOtherLabelChange: variantHandlers.otherLabel.a,
    handleVariantBOtherLabelChange: variantHandlers.otherLabel.b,
  }
}
