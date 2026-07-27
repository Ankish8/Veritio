-- Competitor-informed workflow polish:
-- 1. Optional card-sort category limits.
-- 2. Per-account favorite participant-panel segments.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS min_cards integer,
  ADD COLUMN IF NOT EXISTS max_cards integer;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_min_cards_non_negative,
  DROP CONSTRAINT IF EXISTS categories_max_cards_non_negative,
  DROP CONSTRAINT IF EXISTS categories_card_limits_ordered;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_min_cards_non_negative
    CHECK (min_cards IS NULL OR min_cards >= 0),
  ADD CONSTRAINT categories_max_cards_non_negative
    CHECK (max_cards IS NULL OR max_cards >= 0),
  ADD CONSTRAINT categories_card_limits_ordered
    CHECK (min_cards IS NULL OR max_cards IS NULL OR min_cards <= max_cards);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS favorite_panel_segment_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.categories.min_cards IS
  'Minimum cards a participant must place in this predefined category.';
COMMENT ON COLUMN public.categories.max_cards IS
  'Maximum cards a participant may place in this predefined category.';
COMMENT ON COLUMN public.user_preferences.favorite_panel_segment_ids IS
  'Panel segment IDs favorited by this account.';
