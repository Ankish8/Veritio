-- ================================================================
-- Migration: Add Builder Fallback Contexts
-- Description: Add generic 'builder' contexts so articles show when study type can't be detected
-- ================================================================

-- Add builder.details fallback to all "Getting Started" articles
UPDATE knowledge_articles
SET contexts = array_cat(contexts, ARRAY['builder', 'builder.details'])
WHERE slug IN (
  'getting-started-prototype-testing',
  'getting-started-card-sorting',
  'getting-started-tree-testing',
  'getting-started-surveys',
  'welcome-to-optimal',
  'creating-your-first-project'
)
AND NOT 'builder.details' = ANY(contexts);

-- Add builder fallback to all study type best practices
UPDATE knowledge_articles
SET contexts = array_cat(contexts, ARRAY['builder', 'builder.details'])
WHERE slug IN (
  'prototype-test-best-practices',
  'card-sort-best-practices',
  'tree-test-best-practices',
  'survey-best-practices'
)
AND NOT 'builder.details' = ANY(contexts);

-- Add builder.study-flow to study flow articles
UPDATE knowledge_articles
SET contexts = array_cat(contexts, ARRAY['builder.study-flow'])
WHERE slug IN (
  'customizing-study-flow',
  'creating-screening-questions',
  'survey-logic-branching'
)
AND NOT 'builder.study-flow' = ANY(contexts);

-- Add builder.branding to branding article
UPDATE knowledge_articles
SET contexts = array_cat(contexts, ARRAY['builder.branding'])
WHERE slug = 'customizing-study-branding'
AND NOT 'builder.branding' = ANY(contexts);

-- Add builder.settings to settings article
UPDATE knowledge_articles
SET contexts = array_cat(contexts, ARRAY['builder.settings'])
WHERE slug = 'study-settings-configuration'
AND NOT 'builder.settings' = ANY(contexts);

-- Clean up any duplicate contexts that may have been added
-- (This is a safeguard, PostgreSQL arrays can have duplicates)
