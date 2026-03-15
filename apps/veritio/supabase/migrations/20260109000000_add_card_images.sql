-- Add image support to card sort cards
-- Migration: 20260109000000_add_card_images.sql

-- Add image column to cards table
-- Image is stored as JSON: {url: string, alt?: string, filename?: string}
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS image jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN cards.image IS 'Card image for visual card sorting. JSON format: {url: string, alt?: string, filename?: string}';

-- Create index for queries that filter by cards with images
CREATE INDEX IF NOT EXISTS idx_cards_has_image
ON cards ((image IS NOT NULL))
WHERE image IS NOT NULL;
