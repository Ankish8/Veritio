'use client'

import useSWR from 'swr'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'

export interface AnnotationStyle {
  x: number
  y: number
  width?: number
  height?: number
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  borderWidth?: number
  borderColor?: string
  opacity?: number
  shapeType?: 'rectangle' | 'circle' | 'arrow' | 'line'
  blurRadius?: number
  rotation?: number
}

export interface RecordingAnnotation {
  id: string
  recording_id: string
  start_ms: number
  end_ms: number
  annotation_type: 'text' | 'shape' | 'blur' | 'highlight'
  content: string | null
  style: AnnotationStyle
  layer: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateAnnotationInput {
  start_ms: number
  end_ms: number
  annotation_type: 'text' | 'shape' | 'blur' | 'highlight'
  content?: string | null
  style: AnnotationStyle
  layer?: number
}

export interface UpdateAnnotationInput {
  start_ms?: number
  end_ms?: number
  content?: string | null
  style?: Partial<AnnotationStyle>
  layer?: number
}

export function useRecordingAnnotations(studyId: string | null, recordingId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: RecordingAnnotation[] }>(
    studyId && recordingId
      ? `/api/studies/${studyId}/recordings/${recordingId}/annotations`
      : null
  )

  const createAnnotation = async (input: CreateAnnotationInput) => {
    if (!studyId || !recordingId) throw new Error('Study and recording IDs required')

    const authFetch = getAuthFetchInstance()
    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/annotations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create annotation')
    }

    const result = await response.json()
    await mutate()
    return result.data as RecordingAnnotation
  }

  const updateAnnotation = async (annotationId: string, input: UpdateAnnotationInput) => {
    if (!studyId || !recordingId) throw new Error('Study and recording IDs required')

    const authFetch = getAuthFetchInstance()
    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/annotations/${annotationId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update annotation')
    }

    const result = await response.json()
    await mutate()
    return result.data as RecordingAnnotation
  }

  const deleteAnnotation = async (annotationId: string) => {
    if (!studyId || !recordingId) throw new Error('Study and recording IDs required')

    const authFetch = getAuthFetchInstance()
    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/annotations/${annotationId}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete annotation')
    }

    await mutate()
  }

  return {
    annotations: data?.data ?? [],
    isLoading,
    error,
    mutate,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  }
}
