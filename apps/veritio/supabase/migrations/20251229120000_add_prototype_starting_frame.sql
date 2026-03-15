-- Add starting_frame_id to prototype_test_prototypes
-- This stores the default starting frame for new tasks
-- References a frame in the prototype_test_frames table

ALTER TABLE prototype_test_prototypes
ADD COLUMN IF NOT EXISTS starting_frame_id UUID REFERENCES prototype_test_frames(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_prototype_test_prototypes_starting_frame
ON prototype_test_prototypes(starting_frame_id)
WHERE starting_frame_id IS NOT NULL;

COMMENT ON COLUMN prototype_test_prototypes.starting_frame_id IS 'Default starting frame for new tasks. When set, new tasks will default to this frame instead of the first frame.';
