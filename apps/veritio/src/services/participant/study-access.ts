import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { assignVariant, getABTestsForStudy } from '../ab-test-service'
import type { StudyForParticipation, StudyPasswordRequired, ServiceResult, StudyStatusForError } from './types'
import { getStudyStatusErrorMessage } from './types'

type SupabaseClientType = SupabaseClient<Database>

export async function getStudyByShareCode(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  password?: string,
  preview?: boolean
): Promise<ServiceResult<StudyForParticipation | StudyPasswordRequired>> {
  const { data: studyBasic, error: basicError } = await supabase
    .from('studies')
    .select('id, title, status, password, branding, study_type, response_prevention_settings')
    .or(`share_code.eq.${shareCodeOrSlug},url_slug.eq.${shareCodeOrSlug}`)
    .single()

  if (basicError || !studyBasic) {
    return { data: null, error: new Error('Study not found') }
  }

  if (!preview && studyBasic.status !== 'active') {
    const errorMessage = getStudyStatusErrorMessage(studyBasic.status as StudyStatusForError)
    return { data: null, error: new Error(errorMessage) }
  }

  if (studyBasic.password) {
    if (!password) {
      return {
        data: {
          password_required: true,
          study_id: studyBasic.id,
          title: studyBasic.title,
          branding: studyBasic.branding || {},
        } as StudyPasswordRequired,
        error: null,
      }
    }
    if (password !== studyBasic.password) {
      return { data: null, error: new Error('Incorrect password') }
    }
  }

  const studyType = studyBasic.study_type as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'

  let contentSelect = `
    id,
    title,
    description,
    purpose,
    participant_requirements,
    study_type,
    status,
    settings,
    welcome_message,
    thank_you_message,
    branding,
    language,
    response_prevention_settings,
    session_recording_settings
  `

  if (studyType === 'card_sort') {
    contentSelect += `, cards(*), categories(*)`
  } else if (studyType === 'tree_test') {
    contentSelect += `, tree_nodes(*), tasks(*)`
  }
  const questionFields = `
    id,
    section,
    position,
    question_type,
    question_text,
    question_text_html,
    description,
    is_required,
    config,
    display_logic,
    branching_logic,
    custom_section_id
  `.replace(/\s+/g, '')

  const rulesPromise = studyType === 'survey'
    ? supabase
        .from('survey_rules')
        .select('id, name, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, position')
        .eq('study_id', studyBasic.id)
        .eq('is_enabled', true)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  const customSectionsPromise = studyType === 'survey'
    ? supabase
        .from('survey_custom_sections')
        .select('id, position')
        .eq('study_id', studyBasic.id)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  const prototypePromise = studyType === 'prototype_test'
    ? supabase
        .from('prototype_test_prototypes')
        .select('*')
        .eq('study_id', studyBasic.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const prototypeFramesPromise = studyType === 'prototype_test'
    ? supabase
        .from('prototype_test_frames')
        .select('*')
        .eq('study_id', studyBasic.id)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  const prototypeTasksPromise = studyType === 'prototype_test'
    ? supabase
        .from('prototype_test_tasks')
        .select('*')
        .eq('study_id', studyBasic.id)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  const prototypeComponentInstancesPromise = studyType === 'prototype_test'
    ? (supabase as any)
        .from('prototype_test_component_instances')
        .select('instance_id, frame_node_id, relative_x, relative_y, width, height')
        .eq('study_id', studyBasic.id)
    : Promise.resolve({ data: null, error: null })

  const firstClickTasksPromise = studyType === 'first_click'
    ? supabase
        .from('first_click_tasks')
        .select(`
          *,
          image:first_click_images!first_click_images_task_id_fkey(*),
          aois:first_click_aois(*)
        `)
        .eq('study_id', studyBasic.id)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  const firstImpressionDesignsPromise = studyType === 'first_impression'
    ? (supabase as any)
        .from('first_impression_designs')
        .select('*')
        .eq('study_id', studyBasic.id)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  const liveWebsiteTasksPromise = studyType === 'live_website_test'
    ? (supabase as any)
        .from('live_website_tasks')
        .select('*')
        .eq('study_id', studyBasic.id)
        .order('order_position')
    : Promise.resolve({ data: null, error: null })

  const liveWebsiteVariantsPromise = studyType === 'live_website_test'
    ? (supabase as any)
        .from('live_website_variants')
        .select('id, name, url, weight, position')
        .eq('study_id', studyBasic.id)
        .order('position')
    : Promise.resolve({ data: null, error: null })

  // Use service role client to bypass RLS for incentive config
  const incentiveConfigPromise = (async () => {
    try {
      const adminClient = getMotiaSupabaseClient()
      return await (adminClient as any)
        .from('study_incentive_configs')
        .select('enabled, amount, currency, incentive_type, description')
        .eq('study_id', studyBasic.id)
        .maybeSingle()
    } catch {
        return { data: null, error: null }
    }
  })()

  const [studyResult, flowQuestionsResult, abTestsResult, rulesResult, customSectionsResult, prototypeResult, prototypeFramesResult, prototypeTasksResult, prototypeComponentInstancesResult, firstClickTasksResult, firstImpressionDesignsResult, liveWebsiteTasksResult, incentiveConfigResult, liveWebsiteVariantsResult] = await Promise.all([
    supabase
      .from('studies')
      .select(contentSelect)
      .eq('id', studyBasic.id)
      .single(),
    supabase
      .from('study_flow_questions')
      .select(questionFields)
      .eq('study_id', studyBasic.id)
      .order('section')
      .order('position'),
    getABTestsForStudy(supabase, studyBasic.id),
    rulesPromise,
    customSectionsPromise,
    prototypePromise,
    prototypeFramesPromise,
    prototypeTasksPromise,
    prototypeComponentInstancesPromise,
    firstClickTasksPromise,
    firstImpressionDesignsPromise,
    liveWebsiteTasksPromise,
    incentiveConfigPromise,
    liveWebsiteVariantsPromise,
  ])

  if (studyResult.error || !studyResult.data) {
    return { data: null, error: new Error('Failed to load study data') }
  }

  const study = studyResult.data as any
  const allQuestions = (flowQuestionsResult.data || []) as any[]
  const surveyRules = (rulesResult.data || []) as any[]
  const customSections = (customSectionsResult.data || []) as Array<{ id: string; position: number }>
  const incentiveConfig = incentiveConfigResult.data as any

  const screeningQuestions = allQuestions.filter(q => q.section === 'screening')
  const preStudyQuestions = allQuestions.filter(q => q.section === 'pre_study')
  const postStudyQuestions = allQuestions.filter(q => q.section === 'post_study')

  const surveyQuestionsUnsorted = allQuestions.filter(q => q.section === 'survey')
  const sectionPositionMap = new Map(customSections.map(s => [s.id, s.position]))

  const surveyQuestions = surveyQuestionsUnsorted.sort((a: any, b: any) => {
    if (!a.custom_section_id && b.custom_section_id) return -1
    if (a.custom_section_id && !b.custom_section_id) return 1

    if (a.custom_section_id && b.custom_section_id) {
      const sectionPosA = sectionPositionMap.get(a.custom_section_id) ?? Infinity
      const sectionPosB = sectionPositionMap.get(b.custom_section_id) ?? Infinity
      if (sectionPosA !== sectionPosB) {
        return sectionPosA - sectionPosB
      }
    }

    return a.position - b.position
  })

  const { data: abTests } = abTestsResult
  const enabledAbTests = abTests.filter(test => test.is_enabled)

  if (enabledAbTests.length > 0) {
    const previewParticipantId = preview
      ? `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`
      : 'preview-default'

    const applyAbTestToQuestions = (questions: typeof allQuestions) => {
      return questions.map((question: any) => {
        const abTest = enabledAbTests.find(test => test.entity_id === question.id)
        if (!abTest) return question

        const variant = assignVariant(previewParticipantId, abTest.id, abTest.split_percentage)
        const variantContent = variant === 'A' ? abTest.variant_a_content : abTest.variant_b_content
        const content = variantContent as unknown as Record<string, unknown> | null
        if (!content) return question

        return {
          ...question,
          question_text: content.question_text !== undefined ? content.question_text : question.question_text,
          question_text_html: content.question_text_html !== undefined ? content.question_text_html : question.question_text_html,
          description: content.description !== undefined ? content.description : question.description,
          config: content.options !== undefined
            ? { ...question.config, options: content.options }
            : question.config,
          _ab_test_variant: variant,
          _ab_test_id: abTest.id,
        }
      })
    }

    return {
      data: {
        ...study,
        branding: study.branding || {},
        language: study.language || 'en-US',
        cards: study.cards || [],
        categories: study.categories || [],
        tree_nodes: study.tree_nodes || [],
        tasks: study.tasks || [],
        screening_questions: applyAbTestToQuestions(screeningQuestions),
        pre_study_questions: applyAbTestToQuestions(preStudyQuestions),
        post_study_questions: applyAbTestToQuestions(postStudyQuestions),
        survey_questions: applyAbTestToQuestions(surveyQuestions),
        survey_rules: studyType === 'survey' ? surveyRules : undefined,
        prototype_test_prototype: studyType === 'prototype_test' ? prototypeResult.data : undefined,
        prototype_test_frames: studyType === 'prototype_test' ? (prototypeFramesResult.data || []) : undefined,
        prototype_test_tasks: studyType === 'prototype_test' ? (prototypeTasksResult.data || []) : undefined,
        prototype_test_component_instances: studyType === 'prototype_test' ? (prototypeComponentInstancesResult.data || []) : undefined,
        first_click_tasks: studyType === 'first_click' ? normalizeFirstClickTasks(firstClickTasksResult.data) : undefined,
        first_impression_designs: studyType === 'first_impression' ? (firstImpressionDesignsResult.data || []) : undefined,
        live_website_tasks: studyType === 'live_website_test' ? (liveWebsiteTasksResult.data || []) : undefined,
        live_website_variants: studyType === 'live_website_test' ? (liveWebsiteVariantsResult.data || []) : undefined,
        incentive_config: incentiveConfig || undefined,
      } as StudyForParticipation,
      error: null,
    }
  }

  return {
    data: {
      ...study,
      branding: study.branding || {},
      language: study.language || 'en-US',
      cards: study.cards || [],
      categories: study.categories || [],
      tree_nodes: study.tree_nodes || [],
      tasks: study.tasks || [],
      screening_questions: screeningQuestions,
      pre_study_questions: preStudyQuestions,
      post_study_questions: postStudyQuestions,
      survey_questions: surveyQuestions,
      survey_rules: studyType === 'survey' ? surveyRules : undefined,
      prototype_test_prototype: studyType === 'prototype_test' ? prototypeResult.data : undefined,
      prototype_test_frames: studyType === 'prototype_test' ? (prototypeFramesResult.data || []) : undefined,
      prototype_test_tasks: studyType === 'prototype_test' ? (prototypeTasksResult.data || []) : undefined,
      prototype_test_component_instances: studyType === 'prototype_test' ? (prototypeComponentInstancesResult.data || []) : undefined,
      first_click_tasks: studyType === 'first_click' ? normalizeFirstClickTasks(firstClickTasksResult.data) : undefined,
      first_impression_designs: studyType === 'first_impression' ? (firstImpressionDesignsResult.data || []) : undefined,
      live_website_tasks: studyType === 'live_website_test' ? (liveWebsiteTasksResult.data || []) : undefined,
      live_website_variants: studyType === 'live_website_test' ? (liveWebsiteVariantsResult.data || []) : undefined,
      incentive_config: incentiveConfig || undefined,
    } as StudyForParticipation,
    error: null,
  }
}

function normalizeFirstClickTasks(tasks: any[] | null): any[] {
  if (!tasks) return []
  return tasks.map(task => ({
    ...task,
    image: Array.isArray(task.image) ? task.image[0] ?? null : task.image ?? null,
    aois: Array.isArray(task.aois) ? task.aois : [],
  }))
}
