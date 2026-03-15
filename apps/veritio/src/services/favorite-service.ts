import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, FavoriteEntityType, FavoriteWithEntity } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export async function listFavorites(
  supabase: SupabaseClientType,
  userId: string,
  limit: number = 10
): Promise<{ data: FavoriteWithEntity[] | null; error: Error | null }> {
  const { data: favorites, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!favorites || favorites.length === 0) {
    return { data: [], error: null }
  }

  const projectIds = favorites
    .filter(f => f.entity_type === 'project')
    .map(f => f.entity_id)
  const studyIds = favorites
    .filter(f => f.entity_type === 'study')
    .map(f => f.entity_id)

  const projectsMap = new Map<string, { id: string; name: string }>()
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)
      .eq('is_archived', false)

    projects?.forEach(p => projectsMap.set(p.id, p))
  }

  const studiesMap = new Map<string, { id: string; title: string; study_type: 'card_sort' | 'tree_test'; status: string }>()
  if (studyIds.length > 0) {
    const { data: studies } = await supabase
      .from('studies')
      .select('id, title, study_type, status')
      .in('id', studyIds)
      .eq('is_archived', false)

    studies?.forEach(s => studiesMap.set(s.id, s as { id: string; title: string; study_type: 'card_sort' | 'tree_test'; status: string }))
  }

  const favoritesWithEntities: FavoriteWithEntity[] = favorites
    .map(fav => {
      if (fav.entity_type === 'project') {
        const project = projectsMap.get(fav.entity_id)
        if (!project) return null // Skip if project was deleted or archived
        return { ...fav, project } as FavoriteWithEntity
      } else {
        const study = studiesMap.get(fav.entity_id)
        if (!study) return null // Skip if study was deleted or archived
        return { ...fav, study } as FavoriteWithEntity
      }
    })
    .filter((f): f is FavoriteWithEntity => f !== null)

  return { data: favoritesWithEntities, error: null }
}

export async function isFavorite(
  supabase: SupabaseClientType,
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string
): Promise<{ isFavorite: boolean; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle()

  if (error) {
    return { isFavorite: false, error: new Error(error.message) }
  }

  return { isFavorite: !!data, error: null }
}

export async function toggleFavorite(
  supabase: SupabaseClientType,
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string
): Promise<{ isFavorite: boolean; error: Error | null }> {
  const { data: existing, error: checkError } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle()

  if (checkError) {
    return { isFavorite: false, error: new Error(checkError.message) }
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      return { isFavorite: true, error: new Error(deleteError.message) }
    }

    return { isFavorite: false, error: null }
  } else {
    const { error: insertError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
      })

    if (insertError) {
      return { isFavorite: false, error: new Error(insertError.message) }
    }

    return { isFavorite: true, error: null }
  }
}
