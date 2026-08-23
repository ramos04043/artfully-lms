-- ============================================================================
-- UPDATE STUDENT IDs FROM STU TO ART FORMAT
-- ============================================================================
-- This script converts existing student IDs from STU format to ART format
-- Changes: STU12345678 → ART1001, ART1002, etc. (sequential)
-- ============================================================================

-- Step 1: Preview current student IDs
SELECT student_id, first_name, last_name, created_at
FROM students
ORDER BY created_at;

-- ============================================================================
-- Step 2: Create temporary mapping table
-- ============================================================================

-- Drop existing mapping table if it exists
DROP TABLE IF EXISTS student_id_mapping;

CREATE TEMP TABLE student_id_mapping AS
SELECT 
    student_id AS old_id,
    'ART' || (ROW_NUMBER() OVER (ORDER BY created_at) + 1000)::TEXT AS new_id
FROM students
ORDER BY created_at;

-- Step 3: Preview the ID mapping
SELECT * FROM student_id_mapping ORDER BY new_id;

-- ============================================================================
-- Step 4: APPLY THE CHANGES - Update all student IDs
-- ============================================================================
-- WARNING: This will update student IDs across multiple tables
-- Make sure you have a backup before running this!

-- Update students table (student_id is VARCHAR)
UPDATE students s
SET student_id = m.new_id
FROM student_id_mapping m
WHERE s.student_id = m.old_id;

-- Update enrollments table (student_id is VARCHAR - stores strings like "STU18365652")
UPDATE enrollments e
SET student_id = m.new_id
FROM student_id_mapping m
WHERE e.student_id = m.old_id;

-- Update attendance table (student_id is VARCHAR - stores the string like "STU12345")
UPDATE attendance a
SET student_id = m.new_id
FROM student_id_mapping m
WHERE a.student_id = m.old_id;

-- Note: payments, student_batches, fee_due tables use UUID references to students.id
-- These don't need updating as they reference the UUID primary key, not the student_id VARCHAR field

-- ============================================================================
-- Step 5: Verify the changes
-- ============================================================================

-- Check students table
SELECT student_id, first_name, last_name, created_at
FROM students
ORDER BY student_id;

-- Check enrollments view (should show new student_id)
SELECT id, student_id, student_first_name, student_last_name
FROM enrollments
ORDER BY student_id
LIMIT 20;

-- Check attendance records
SELECT DISTINCT student_id, COUNT(*) as attendance_count
FROM attendance
GROUP BY student_id
ORDER BY student_id;

-- Note: Other tables (payments, student_batches, fee_due) use UUID foreign keys
-- and reference students.id (UUID), not students.student_id (VARCHAR)
-- So they don't need verification for this change

-- ============================================================================
-- Step 6: Clean up
-- ============================================================================
DROP TABLE IF EXISTS student_id_mapping;

-- ============================================================================
-- ROLLBACK OPTION (Keep this for reference only - DO NOT RUN)
-- ============================================================================
-- If you need to rollback, you would need to restore from backup
-- as the original STU IDs are timestamp-based and cannot be regenerated

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run Step 1 to see current student IDs
-- 2. Run Step 2 to create the temporary mapping table
-- 3. Run Step 3 to preview the new ID mapping (ART1001, ART1002, etc.)
-- 4. Review the mapping carefully!
-- 5. Run Step 4 to apply all changes (students, enrollments, attendance, payments)
-- 6. Run Step 5 to verify all tables are updated correctly
-- 7. Run Step 6 to clean up temporary table
--
-- IMPORTANT: Make a backup before running Step 4!
-- ============================================================================
