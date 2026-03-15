-- Migration: Clear all card descriptions
-- This simplifies the card model - cards now only use the label field in the builder
-- Existing descriptions are cleared as requested by user

UPDATE cards SET description = NULL WHERE description IS NOT NULL;
