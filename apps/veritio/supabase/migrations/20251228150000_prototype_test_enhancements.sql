-- ============================================================================
-- Prototype Test Feature Enhancements
-- ============================================================================
-- This migration adds support for:
-- 1. Task flow types (task_flow vs free_flow)
-- 2. Password-protected Figma prototypes
-- 3. Enhanced settings (interactive components, instruction position)
-- ============================================================================

-- Add flow_type to prototype_test_tasks
-- task_flow: Participant completes a specific task with success criteria
-- free_flow: Participant explores freely and answers questions
ALTER TABLE prototype_test_tasks
ADD COLUMN IF NOT EXISTS flow_type TEXT DEFAULT 'task_flow'
CHECK (flow_type IN ('task_flow', 'free_flow'));

-- Add password field to prototype_test_prototypes
-- Stores the password for password-protected Figma prototypes
-- This is provided to participants before they view the prototype
ALTER TABLE prototype_test_prototypes
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add comment explaining the password field usage
COMMENT ON COLUMN prototype_test_prototypes.password IS
'Password for password-protected Figma prototypes. Shown to participants before loading the prototype.';

-- Add comment explaining flow_type
COMMENT ON COLUMN prototype_test_tasks.flow_type IS
'Task flow type: task_flow = complete specific task with success criteria, free_flow = explore freely and answer questions';
