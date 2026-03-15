/**
 * Base Results Service - Template Method Pattern
 * Minimal stub mirroring apps/veritio/src/services/results/base-results-service.ts
 * to resolve imports from within the @veritio/prototype-test package.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import {
  fetchAllParticipants,
  fetchAllFlowResponses,
  FLOW_QUESTION_COLUMNS,
} from './pagination'
import type { ServiceResult } from './types'

// Use `any` to accept SupabaseClient with any Database schema (app vs package)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = SupabaseClient<any>
// TYPES

export interface BaseStudyMetadata {
  id: string
  title: string
  description: string | null
  study_type: string
  status: string | null
  share_code: string | null
  settings: unknown
  launched_at: string | null
  created_at: string | null
}

export interface ParticipantStats {
  totalParticipants: number
  completedParticipants: number
  abandonedParticipants: number
  completionRate: number
  avgCompletionTimeMs: number
}

export interface BaseResultsData {
  study: BaseStudyMetadata
  participants: unknown[]
  flowQuestions: unknown[]
  flowResponses: unknown[]
  stats: ParticipantStats
}

export interface StudySpecificData {
  [key: string]: unknown
}
// BASE RESULTS SERVICE

export abstract class BaseResultsService<
  TStudySpecificData extends StudySpecificData = StudySpecificData,
  TAnalysis = unknown
> {
  protected abstract expectedStudyType: string

  async getOverview(
    supabase: SupabaseClientType,
    studyId: string
  ): Promise<ServiceResult<BaseResultsData & TStudySpecificData & { analysis: TAnalysis | null }>> {
    const studyResult = await this.fetchStudy(supabase, studyId)
    if (!studyResult.data) {
      return { data: null, error: studyResult.error || new Error('Study not found') }
    }

    const validationError = this.validateStudyType(studyResult.data)
    if (validationError) {
      return { data: null, error: validationError }
    }

    const smallTablesData = await this.fetchSmallTables(supabase, studyId)

    const [participants, flowResponses] = await Promise.all([
      fetchAllParticipants(supabase, studyId),
      fetchAllFlowResponses(supabase, studyId),
    ])

    const largeTablesData = await this.fetchLargeTables(supabase, studyId)

    const { data: flowQuestions } = await supabase
      .from('study_flow_questions')
      .select(FLOW_QUESTION_COLUMNS)
      .eq('study_id', studyId)
      .order('section')
      .order('position')

    const stats = this.calculateStats(participants)

    const analysis = await this.computeAnalysis({
      study: studyResult.data,
      participants,
      flowQuestions: flowQuestions || [],
      flowResponses,
      stats,
      ...smallTablesData,
      ...largeTablesData,
    })

    return {
      data: {
        study: studyResult.data,
        participants,
        flowQuestions: flowQuestions || [],
        flowResponses,
        stats,
        ...smallTablesData,
        ...largeTablesData,
        analysis,
      } as BaseResultsData & TStudySpecificData & { analysis: TAnalysis | null },
      error: null,
    }
  }

  protected async fetchStudy(
    supabase: SupabaseClientType,
    studyId: string
  ): Promise<ServiceResult<BaseStudyMetadata>> {
    const { data: study, error } = await supabase
      .from('studies')
      .select(`
        id, title, description, study_type, status, share_code,
        settings, launched_at, created_at
      `)
      .eq('id', studyId)
      .single()

    if (error || !study) {
      return { data: null, error: new Error('Study not found') }
    }

    return { data: study as BaseStudyMetadata, error: null }
  }

  protected validateStudyType(study: BaseStudyMetadata): Error | null {
    if (study.study_type !== this.expectedStudyType) {
      return new Error(
        `This endpoint is only for ${this.expectedStudyType} studies, but study is type ${study.study_type}`
      )
    }
    return null
  }

  protected calculateStats(participants: any[]): ParticipantStats {
    const totalParticipants = participants.length
    const completedParticipants = participants.filter((p) => p.status === 'completed').length
    const abandonedParticipants = participants.filter((p) => p.status === 'abandoned').length

    const completionRate =
      totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0

    const completedWithTimes = participants.filter(
      (p) => p.status === 'completed' && p.started_at && p.completed_at
    )

    const avgCompletionTimeMs =
      completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum: number, p: any) => {
            const duration =
              new Date(p.completed_at).getTime() - new Date(p.started_at).getTime()
            return sum + duration
          }, 0) / completedWithTimes.length
        : 0

    return {
      totalParticipants,
      completedParticipants,
      abandonedParticipants,
      completionRate,
      avgCompletionTimeMs,
    }
  }

  protected abstract fetchSmallTables(
    supabase: SupabaseClientType,
    studyId: string
  ): Promise<TStudySpecificData>

  protected abstract fetchLargeTables(
    supabase: SupabaseClientType,
    studyId: string
  ): Promise<{ responses: unknown[] }>

  protected abstract computeAnalysis(
    data: BaseResultsData & TStudySpecificData & { responses: unknown[] }
  ): Promise<TAnalysis | null>
}
// FACTORY FUNCTION

export function createResultsService<TStudySpecificData extends StudySpecificData, TAnalysis>(config: {
  studyType: string
  fetchSmallTables: (supabase: SupabaseClientType, studyId: string) => Promise<TStudySpecificData>
  fetchLargeTables: (
    supabase: SupabaseClientType,
    studyId: string
  ) => Promise<{ responses: unknown[] }>
  computeAnalysis: (
    data: BaseResultsData & TStudySpecificData & { responses: unknown[] }
  ) => Promise<TAnalysis | null>
}) {
  return new (class extends BaseResultsService<TStudySpecificData, TAnalysis> {
    protected expectedStudyType = config.studyType

    protected async fetchSmallTables(supabase: SupabaseClientType, studyId: string) {
      return config.fetchSmallTables(supabase, studyId)
    }

    protected async fetchLargeTables(supabase: SupabaseClientType, studyId: string) {
      return config.fetchLargeTables(supabase, studyId)
    }

    protected async computeAnalysis(
      data: BaseResultsData & TStudySpecificData & { responses: unknown[] }
    ) {
      return config.computeAnalysis(data)
    }
  })()
}
