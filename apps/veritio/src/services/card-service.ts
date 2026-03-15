import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { Card, CardImage } from './types'
import { createCrudService, cardsConfig, type CardBulkItem } from '../lib/crud-factory/index'

type SupabaseClientType = SupabaseClient<Database>

const cardCrudService = createCrudService(cardsConfig)

export async function listCards(
  supabase: SupabaseClientType,
  studyId: string,
  userId?: string
): Promise<{ data: Card[] | null; error: Error | null }> {
  return cardCrudService.list(supabase, studyId, userId)
}

export function invalidateCardsCache(studyId: string): void {
  cardCrudService.invalidateCache(studyId)
}

export async function getCard(
  supabase: SupabaseClientType,
  cardId: string,
  studyId: string
): Promise<{ data: Card | null; error: Error | null }> {
  return cardCrudService.get(supabase, cardId, studyId)
}

export async function createCard(
  supabase: SupabaseClientType,
  studyId: string,
  input: { label: string; description?: string | null; position?: number; image?: CardImage | null }
): Promise<{ data: Card | null; error: Error | null }> {
  return cardCrudService.create(supabase, studyId, input)
}

export async function updateCard(
  supabase: SupabaseClientType,
  cardId: string,
  studyId: string,
  input: { label?: string; description?: string | null; position?: number; image?: CardImage | null }
): Promise<{ data: Card | null; error: Error | null }> {
  return cardCrudService.update(supabase, cardId, studyId, input)
}

export async function deleteCard(
  supabase: SupabaseClientType,
  cardId: string,
  studyId: string
): Promise<{ success: boolean; error: Error | null }> {
  return cardCrudService.delete(supabase, cardId, studyId)
}

export async function bulkUpdateCards(
  supabase: SupabaseClientType,
  studyId: string,
  cards: Array<{ id: string; label?: string; description?: string | null; position?: number; image?: CardImage | null }>
): Promise<{ data: Card[] | null; error: Error | null }> {
  return cardCrudService.bulkUpdate(supabase, studyId, cards as CardBulkItem[])
}
