-- ================================================================
-- Migration: Add Figma Avatar URL
-- Description: Stores Figma user profile picture URL
-- ================================================================

-- Add figma_img_url column to store the user's Figma avatar
ALTER TABLE figma_connections
ADD COLUMN IF NOT EXISTS figma_img_url TEXT;

COMMENT ON COLUMN figma_connections.figma_img_url IS 'Figma user profile picture URL';
