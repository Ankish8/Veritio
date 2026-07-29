-- Persist the id-keyed card -> category mapping for card sort responses.
--
-- Why: card_placements is keyed by category *label*, so two groups a participant
-- both named "Other" (or a custom label colliding with a predefined one) collapse
-- into a single group during analysis, inventing card pairs the participant never
-- made. The participant client already builds and submits the id-keyed mapping
-- (use-card-sort-session.ts) and the server already validates it
-- (lib/card-sort/submission-validation.ts), but submitCardSortResponse dropped it
-- before the insert. This column keeps it.
--
-- Shape: { "<cardId>": "<categoryId>" } where categoryId is either a predefined
-- category uuid or a client-generated custom category id. NULL on rows written
-- before this migration; analysis falls back to label keying for those.

ALTER TABLE card_sort_responses ADD COLUMN IF NOT EXISTS
  category_assignments JSONB;

COMMENT ON COLUMN card_sort_responses.category_assignments IS
  'cardId -> categoryId map. Group identity for analysis; card_placements holds display labels. NULL for rows predating 20260729000000.';
