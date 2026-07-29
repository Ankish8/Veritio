/**
 * The synthetic "Unclear" bucket offered to participants when a closed or hybrid
 * card sort has `includeUnclearCategory` enabled.
 *
 * It is not a real category: it means "I could not place this card". The player
 * injects it, submission validation pins its label, and analysis needs to
 * recognize it so that cards parked there are not treated as a group the
 * participant deliberately formed.
 *
 * Lives here rather than in the player so that analysis code can reference it
 * without importing from the component tree.
 */
export const UNCLEAR_CATEGORY_ID = '__unclear__'
export const UNCLEAR_CATEGORY_LABEL = 'Unclear'
