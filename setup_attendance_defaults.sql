-- Set up proper defaults for attendance table

-- Set default for id column
ALTER TABLE proj_b2d90696.attendance 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Set default for marked_at
ALTER TABLE proj_b2d90696.attendance 
ALTER COLUMN marked_at SET DEFAULT NOW();

-- Set default for is_locked
ALTER TABLE proj_b2d90696.attendance 
ALTER COLUMN is_locked SET DEFAULT false;

-- Set default for created_at
ALTER TABLE proj_b2d90696.attendance 
ALTER COLUMN created_at SET DEFAULT NOW();

-- Set default for updated_at
ALTER TABLE proj_b2d90696.attendance 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Create unique constraint to prevent duplicate attendance records
ALTER TABLE proj_b2d90696.attendance 
ADD CONSTRAINT unique_attendance_per_student_batch_date 
UNIQUE (student_id, batch_id, class_date);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id 
ON proj_b2d90696.attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_batch_id 
ON proj_b2d90696.attendance(batch_id);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date 
ON proj_b2d90696.attendance(class_date);

CREATE INDEX IF NOT EXISTS idx_attendance_batch_date 
ON proj_b2d90696.attendance(batch_id, class_date);

-- Verify the setup
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'proj_b2d90696' 
  AND table_name = 'attendance'
ORDER BY ordinal_position;
