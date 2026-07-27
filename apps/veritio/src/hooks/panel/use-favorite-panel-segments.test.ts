import { describe, expect, it } from 'vitest'
import { preferencesToRow } from '@/lib/supabase/user-preferences-types'
import { sortFavoritePanelSegments } from './use-favorite-panel-segments'

describe('favorite panel segments', () => {
  it('sorts favorites first and keeps a deterministic name order', () => {
    const segments = [
      { id: '3', name: 'Returning customers' },
      { id: '1', name: 'Admins' },
      { id: '2', name: 'Designers' },
    ]

    expect(sortFavoritePanelSegments(segments, ['3']).map(({ id }) => id)).toEqual(['3', '1', '2'])
    expect(segments.map(({ id }) => id)).toEqual(['3', '1', '2'])
  })

  it('maps a partial workspace update to only the persisted favorite IDs', () => {
    const favoriteIds = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]

    expect(
      preferencesToRow('user-1', {
        workspace: { favoritePanelSegmentIds: favoriteIds },
      }),
    ).toEqual({
      user_id: 'user-1',
      favorite_panel_segment_ids: favoriteIds,
    })
  })
})
