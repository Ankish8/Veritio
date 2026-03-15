import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import type { Database } from '@veritio/study-types'
import { toJson } from '../lib/supabase/json-utils'
import type { Study, StudyInsert, StudyUpdate } from './types'
import { validatePageSize } from '../lib/pagination/types'
import type { StudyDefaults } from '../lib/supabase/user-preferences-types'
import {
  getStudyPermission,
  checkStudyPermission,
  getStudyPermissionsBatch,
  getProjectPermission,
  checkProjectPermission,
  permissionDeniedError,
} from './permission-service'
import type { OrganizationRole } from '../lib/supabase/collaboration-types'
import { createStudyFlowSettingsForType } from '@veritio/study-flow/defaults'

type SupabaseClientType = SupabaseClient<Database>

export interface StudyWithParticipantCount extends Study {
  participant_count: number
}

export interface StudyWithPermission extends StudyWithParticipantCount {
  user_role: OrganizationRole
  permission_source: 'inherited' | 'explicit'
}

export interface StudyWithRelations extends Study {
  cards: Array<{ id: string; label: string; description: string | null; position: number }>
  categories: Array<{ id: string; label: string; description: string | null; position: number }>
  tree_nodes: Array<{ id: string; label: string; parent_id: string | null; position: number }>
  tasks: Array<{ id: string; question: string; correct_node_id: string | null; position: number }>
}

export async function listStudiesByProject(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string,
  options?: { cursor?: string; limit?: number }
): Promise<{ data: StudyWithPermission[] | null; total: number | null; error: Error | null }> {
  const { data: projectPermission, error: permError } = await getProjectPermission(
    supabase,
    projectId,
    userId
  )

  if (permError) {
    return { data: null, total: null, error: permError }
  }

  if (!projectPermission) {
    return { data: null, total: null, error: new Error('Project not found') }
  }

  const limit = validatePageSize(options?.limit)
  const fetchLimit = limit + 1

  let query = supabase
    .from('studies')
    .select(`
      *,
      participants:participants(count)
    `)
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (options?.cursor) {
    query = query.lt('created_at', options.cursor)
  }

  // Run page query and total count in parallel
  const countQuery = supabase
    .from('studies')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('is_archived', false)

  const [{ data: studies, error }, { count: totalCount }] = await Promise.all([query, countQuery])

  if (error) {
    return { data: null, total: null, error: new Error(error.message) }
  }

  if (!studies || studies.length === 0) {
    return { data: [], total: totalCount ?? 0, error: null }
  }

  const studyIds = studies.map((s) => s.id)
  const { data: permissionsMap, error: studyPermError } = await getStudyPermissionsBatch(
    supabase,
    studyIds,
    userId
  )

  if (studyPermError) {
    return { data: null, total: null, error: studyPermError }
  }

  const studiesWithPermissions: StudyWithPermission[] = ((studies || []) as unknown as Array<Record<string, unknown> & { id: string }>)
    .filter((s) => permissionsMap.has(s.id))
    .map((study) => {
      const permission = permissionsMap.get(study.id)
      return {
        ...study,
        participant_count: ((study.participants as Array<{ count: number }>) || [])[0]?.count || 0,
        user_role: permission?.role || projectPermission.role,
        permission_source: permission?.source || 'inherited',
      }
    }) as StudyWithPermission[]

  return { data: studiesWithPermissions, total: totalCount ?? null, error: null }
}

export async function getStudy(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: (StudyWithRelations & { participant_count: number; user_role?: OrganizationRole }) | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(supabase, studyId, userId)

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission) {
    return { data: null, error: new Error('Study not found') }
  }

  const { data: study, error } = await supabase
    .from('studies')
    .select(`
      *,
      cards(*),
      categories(*),
      tree_nodes(*),
      tasks(*),
      participants(count)
    `)
    .eq('id', studyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Study not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  // Auto-generate share_code for legacy studies
  if (!study.share_code) {
    const newShareCode = nanoid(10)
    const { error: updateError } = await supabase
      .from('studies')
      .update({ share_code: newShareCode })
      .eq('id', studyId)

    if (!updateError) {
      study.share_code = newShareCode
    }
  }

  const participantsAgg = (study as Record<string, unknown>).participants
  let participantCount = 0

  if (participantsAgg !== undefined && participantsAgg !== null) {
    if (Array.isArray(participantsAgg) && participantsAgg.length > 0) {
      const first = participantsAgg[0] as { count?: number } | undefined
      participantCount = first?.count ?? 0
    } else if (typeof participantsAgg === 'object' && 'count' in participantsAgg) {
      participantCount = (participantsAgg as { count: number }).count ?? 0
    } else if (typeof participantsAgg === 'number') {
      participantCount = participantsAgg
    }
  }

  const studyWithCount = {
    ...study,
    participant_count: participantCount,
    user_role: permission.role,
  }

  return { data: studyWithCount as StudyWithRelations & { participant_count: number; user_role?: OrganizationRole }, error: null }
}

export async function createStudy(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string,
  input: { title: string; study_type: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'; description?: string | null },
  userDefaults?: StudyDefaults,
  initialSettings?: Record<string, unknown>
): Promise<{ data: Study | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkProjectPermission(
    supabase,
    projectId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('creating a study', 'editor', userRole) }
  }

  let defaultSettings: Record<string, boolean | string | number | null>
  let welcomeMessage: string

  switch (input.study_type) {
    case 'card_sort':
      defaultSettings = {
        mode: 'open',
        randomizeCards: true,
        allowSkip: false,
        showProgress: true,
      }
      welcomeMessage = 'Welcome! In this study, you will sort cards into groups that make sense to you.'
      break
    case 'tree_test':
      defaultSettings = {
        randomizeTasks: false,
        showBreadcrumbs: true,
        allowBack: true,
        showTaskProgress: true,
      }
      welcomeMessage = 'Welcome! In this study, you will navigate a menu structure to find specific items.'
      break
    case 'survey':
      defaultSettings = {
        showOneQuestionPerPage: true,
        randomizeQuestions: false,
        showProgressBar: true,
        allowSkipQuestions: false,
      }
      welcomeMessage = 'Welcome! Please take a few minutes to complete this survey.'
      break
    case 'prototype_test':
      defaultSettings = {
        randomizeTasks: true,
        allowSkipTasks: true,
        showTaskProgress: true,
        dontRandomizeFirstTask: true,
        clickableAreaFlashing: true,
        tasksEndAutomatically: true,
        showEachParticipantTasks: 'all',
      }
      welcomeMessage = 'Welcome! In this study, you will interact with an interactive prototype to complete a series of tasks.'
      break
    case 'first_click':
      defaultSettings = {
        allowSkipTasks: true,
        startTasksImmediately: false,
        randomizeTasks: true,
        dontRandomizeFirstTask: true,
        showTaskProgress: true,
        showEachParticipantTasks: 'all',
        imageScaling: 'scale_on_small',
      }
      welcomeMessage = 'Welcome! In this study, you will click on images to indicate where you would first click to complete a task.'
      break
    case 'first_impression':
      defaultSettings = {
        exposureDurationMs: 5000,
        countdownDurationMs: 3000,
        showTimerToParticipant: true,
        showProgressIndicator: true,
        questionDisplayMode: 'one_per_page',
        randomizeQuestions: false,
        designAssignmentMode: 'random_single',
        allowPracticeDesign: false,
      }
      welcomeMessage = 'Welcome! In this study, you will view a design briefly and then answer questions about your first impressions.'
      break
    case 'live_website_test':
      defaultSettings = {
        allowSkipTasks: true,
        showTaskProgress: true,
        defaultTimeLimitSeconds: null,
        recordScreen: true,
        recordWebcam: false,
        recordMicrophone: true,
        allowMobile: false,
        mode: 'url_only',
      }
      welcomeMessage = 'Welcome! In this study, you will complete tasks on a live website.'
      break
  }

  // Merge initial_settings from use-case cards over type defaults
  const studyFlowDefaults = createStudyFlowSettingsForType(input.study_type)
  const mergedSettings = {
    ...(initialSettings ? { ...defaultSettings, ...initialSettings } : defaultSettings),
    studyFlow: studyFlowDefaults,
  } as Record<string, any>

  const insertData: StudyInsert = {
    project_id: projectId,
    user_id: userId,
    title: input.title.trim(),
    study_type: input.study_type,
    description: input.description?.trim() || null,
    share_code: nanoid(10),
    settings: mergedSettings,
    welcome_message: welcomeMessage,
    thank_you_message: 'Thank you for participating in our study!',
    // Apply user defaults if provided
    ...(userDefaults && {
      language: userDefaults.settings.language,
      closing_rule: toJson({
        type: userDefaults.settings.closingRuleType,
        // Note: specific dates/counts are set per-study, not from defaults
      }),
      response_prevention_settings: toJson({
        level: userDefaults.settings.responsePreventionLevel,
      }),
      email_notification_settings: toJson({
        enabled: userDefaults.notifications.enabled,
        triggers: {
          everyResponse: userDefaults.notifications.everyResponse,
          milestones: {
            enabled: userDefaults.notifications.milestones,
            values: userDefaults.notifications.milestoneValues,
          },
          dailyDigest: userDefaults.notifications.dailyDigest,
          onClose: userDefaults.notifications.onClose,
        },
        maxEmailsPerHour: 10,
        milestonesReached: [],
      }),
      branding: toJson({
        primaryColor: userDefaults.branding.primaryColor,
        backgroundColor: userDefaults.branding.backgroundColor,
        stylePreset: userDefaults.branding.stylePreset,
        radiusOption: userDefaults.branding.radiusOption,
        themeMode: userDefaults.branding.themeMode,
        logoSize: userDefaults.branding.logoSize,
        ...(userDefaults.branding.logoUrl && {
          logo: { url: userDefaults.branding.logoUrl },
        }),
      }),
    }),
  }

  const { data: study, error } = await supabase
    .from('studies')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.message.includes('foreign key')) {
      return { data: null, error: new Error('Project not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: study, error: null }
}

export async function updateStudy(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  input: {
    title?: string
    description?: string | null
    settings?: Record<string, unknown>
    welcome_message?: string | null
    thank_you_message?: string | null
    status?: 'draft' | 'active' | 'paused' | 'completed'
    // Details tab fields
    purpose?: string | null
    participant_requirements?: string | null
    folder_id?: string | null
    file_attachments?: Array<{ id: string; name: string; url: string; size?: number; type?: string }> | null
    // Settings tab fields
    url_slug?: string | null
    language?: string
    password?: string | null
    session_recording_settings?: Record<string, unknown> | null
    closing_rule?: { type: string; date?: string | null; participantCount?: number | null }
    response_prevention_settings?: { level: string } | null
    email_notification_settings?: Record<string, unknown> | null
    // Branding tab fields
    branding?: Record<string, unknown>
    // Sharing tab fields
    sharing_settings?: Record<string, unknown>
  }
): Promise<{ data: Study | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkStudyPermission(
    supabase,
    studyId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('updating a study', 'editor', userRole) }
  }

  // Extended type: session_recording_settings and sharing_settings added via migration
  const updates: StudyUpdate & {
    updated_at: string
    launched_at?: string
    session_recording_settings?: ReturnType<typeof toJson>
    sharing_settings?: ReturnType<typeof toJson>
  } = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.settings !== undefined) updates.settings = toJson(input.settings)
  if (input.welcome_message !== undefined) updates.welcome_message = input.welcome_message?.trim() || null
  if (input.thank_you_message !== undefined) updates.thank_you_message = input.thank_you_message?.trim() || null

  if (input.purpose !== undefined) updates.purpose = input.purpose?.trim() || null
  if (input.participant_requirements !== undefined) updates.participant_requirements = input.participant_requirements?.trim() || null
  if (input.folder_id !== undefined) updates.folder_id = input.folder_id || null
  if (input.file_attachments !== undefined) updates.file_attachments = toJson(input.file_attachments)

  if (input.url_slug !== undefined) updates.url_slug = input.url_slug?.trim().toLowerCase() || null
  if (input.language !== undefined) updates.language = input.language
  if (input.password !== undefined) updates.password = input.password || null
  if (input.session_recording_settings !== undefined) updates.session_recording_settings = toJson(input.session_recording_settings)
  if (input.closing_rule !== undefined) updates.closing_rule = toJson(input.closing_rule)
  if (input.response_prevention_settings !== undefined) updates.response_prevention_settings = toJson(input.response_prevention_settings)
  if (input.email_notification_settings !== undefined) updates.email_notification_settings = toJson(input.email_notification_settings)

  if (input.branding !== undefined) updates.branding = toJson(input.branding)

  if (input.sharing_settings !== undefined) updates.sharing_settings = toJson(input.sharing_settings)

  // Set launched_at only on FIRST activation (preserve on resume)
  if (input.status !== undefined) {
    updates.status = input.status
    if (input.status === 'active') {
      const { data: existing } = await supabase
        .from('studies')
        .select('launched_at')
        .eq('id', studyId)
        .single()

      if (!existing?.launched_at) {
        updates.launched_at = new Date().toISOString()
      }
    }
  }

  const { data: study, error } = await supabase
    .from('studies')
    .update(updates)
    .eq('id', studyId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Study not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: study, error: null }
}

export async function deleteStudy(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkStudyPermission(
    supabase,
    studyId,
    userId,
    'manager'
  )

  if (permError) {
    return { success: false, error: permError }
  }

  if (!allowed) {
    return { success: false, error: permissionDeniedError('deleting a study', 'manager', userRole) }
  }

  const { error, count } = await supabase
    .from('studies')
    .delete({ count: 'exact' })
    .eq('id', studyId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  if (count === 0) {
    return { success: false, error: new Error('Study not found') }
  }

  return { success: true, error: null }
}

export async function archiveStudy(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: Study | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkStudyPermission(
    supabase,
    studyId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('archiving a study', 'editor', userRole) }
  }

  const { data: study, error } = await supabase
    .from('studies')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', studyId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Study not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: study, error: null }
}

export async function restoreStudy(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: Study | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkStudyPermission(
    supabase,
    studyId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('restoring a study', 'editor', userRole) }
  }

  const { data: study, error } = await supabase
    .from('studies')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .eq('id', studyId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Study not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: study, error: null }
}

export async function listArchivedStudies(
  supabase: SupabaseClientType,
  userId: string,
  organizationId?: string
): Promise<{ data: StudyWithPermission[] | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) {
    return { data: [], error: null }
  }

  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id')
    .in('organization_id', organizationId ? [organizationId] : orgIds)

  if (projError) {
    return { data: null, error: new Error(projError.message) }
  }

  const projectIds = projects?.map((p) => p.id) || []

  if (projectIds.length === 0) {
    return { data: [], error: null }
  }

  const { data: studies, error } = await supabase
    .from('studies')
    .select(`
      *,
      participants:participants(count)
    `)
    .in('project_id', projectIds)
    .eq('is_archived', true)
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!studies || studies.length === 0) {
    return { data: [], error: null }
  }

  const studyIds = studies.map((s) => s.id)
  const { data: permissionsMap, error: permError } = await getStudyPermissionsBatch(
    supabase,
    studyIds,
    userId
  )

  if (permError) {
    return { data: null, error: permError }
  }

  const studiesWithPermissions: StudyWithPermission[] = ((studies || []) as unknown as Array<Record<string, unknown> & { id: string }>)
    .filter((s) => permissionsMap.has(s.id))
    .map((study) => {
      const permission = permissionsMap.get(study.id)
      return {
        ...study,
        participant_count: ((study.participants as Array<{ count: number }>) || [])[0]?.count || 0,
        user_role: permission?.role || 'viewer',
        permission_source: permission?.source || 'inherited',
      }
    }) as StudyWithPermission[]

  return { data: studiesWithPermissions, error: null }
}
