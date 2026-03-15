'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import type { SurveyVariable } from '@/lib/supabase/survey-rules-types'

type SurveyVariableInsert = Omit<SurveyVariable, 'id' | 'study_id' | 'created_at' | 'updated_at'>
type SurveyVariableUpdate = Partial<SurveyVariableInsert>

/** Fetches and manages survey variables with SWR caching. */
export function useSurveyVariables(studyId: string | null) {
  const { data: variables, error, isLoading, isValidating, mutate } = useSWR<SurveyVariable[]>(
    studyId ? SWR_KEYS.surveyVariables(studyId) : null,
    null,
  )

  const authFetch = getAuthFetchInstance()

  const createVariable = useCallback(
    async (input: SurveyVariableInsert): Promise<SurveyVariable | null> => {
      if (!studyId) return null

      const tempVariable: SurveyVariable = {
        id: `temp-${Date.now()}`,
        study_id: studyId,
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      let createdVariable: SurveyVariable | null = null

      await mutate(
        async (currentData) => {
          const response = await authFetch(`/api/studies/${studyId}/variables`, {
            method: 'POST',
            body: JSON.stringify(input),
          })
          if (!response.ok) throw new Error('Failed to create variable')
          createdVariable = await response.json()
          return [...(currentData || []), createdVariable!]
        },
        { optimisticData: [...(variables || []), tempVariable], rollbackOnError: true, revalidate: false }
      )

      return createdVariable
    },
    [studyId, variables, authFetch, mutate]
  )

  const updateVariable = useCallback(
    async (variableId: string, updates: SurveyVariableUpdate): Promise<SurveyVariable | null> => {
      if (!studyId) return null

      let updatedVariable: SurveyVariable | null = null

      await mutate(
        async (currentData) => {
          const response = await authFetch(`/api/studies/${studyId}/variables/${variableId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
          })
          if (!response.ok) throw new Error('Failed to update variable')
          updatedVariable = await response.json()
          return (currentData || []).map((v) => (v.id === variableId ? updatedVariable! : v))
        },
        {
          optimisticData: (variables || []).map((v) =>
            v.id === variableId ? { ...v, ...updates, updated_at: new Date().toISOString() } : v
          ),
          rollbackOnError: true,
          revalidate: false,
        }
      )

      return updatedVariable
    },
    [studyId, variables, authFetch, mutate]
  )

  const deleteVariable = useCallback(
    async (variableId: string): Promise<boolean> => {
      if (!studyId) return false

      try {
        await mutate(
          async (currentData) => {
            const response = await authFetch(`/api/studies/${studyId}/variables/${variableId}`, {
              method: 'DELETE',
            })
            if (!response.ok) throw new Error('Failed to delete variable')
            return (currentData || []).filter((v) => v.id !== variableId)
          },
          { optimisticData: (variables || []).filter((v) => v.id !== variableId), rollbackOnError: true, revalidate: false }
        )
        return true
      } catch {
        return false
      }
    },
    [studyId, variables, authFetch, mutate]
  )

  const getVariableById = useCallback((variableId: string) => variables?.find((v) => v.id === variableId), [variables])

  return {
    variables: variables || [],
    isLoading,
    isSaving: isValidating,
    error: error?.message || null,
    refetch: () => mutate(),
    createVariable,
    updateVariable,
    deleteVariable,
    getVariableById,
  }
}
