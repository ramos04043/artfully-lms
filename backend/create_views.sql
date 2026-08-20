-- ============================================================================
-- CRITICAL: Run this SQL in ZendBX Console
-- This creates the missing views that are causing 500 errors
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS enrollments CASCADE;
DROP VIEW IF EXISTS fee_due CASCADE;

-- Create enrollments view that maps to student_batches
-- This provides a unified enrollment interface for the frontend
CREATE OR REPLACE VIEW enrollments AS
SELECT 
    sb.id,
    sb.student_id,
    s.student_id AS student_number,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.email AS student_email,
    s.phone AS student_phone,
    s.date_of_birth,
    s.gender,
    s.address,
    sb.batch_id,
    ARRAY_AGG(DISTINCT sb2.batch_id) AS batch_ids,
    sb.effective_from AS enrolled_at,
    CASE 
        WHEN sb.is_active = true AND s.status = 'ACTIVE' THEN 'ACTIVE'
        WHEN s.status = 'PAUSED' THEN 'PAUSED'
        WHEN s.status IN ('LEFT', 'INACTIVE') THEN 'INACTIVE'
        ELSE 'INACTIVE'
    END AS status,
    sb.created_at,
    sb.updated_at
FROM student_batches sb
INNER JOIN students s ON sb.student_id = s.id
LEFT JOIN student_batches sb2 ON sb2.student_id = s.id AND sb2.is_active = true
WHERE sb.is_active = true
GROUP BY 
    sb.id, sb.student_id, s.student_id, s.first_name, s.last_name, 
    s.email, s.phone, s.date_of_birth, s.gender, s.address,
    sb.batch_id, sb.effective_from, sb.is_active, s.status, sb.created_at, sb.updated_at;

-- Create fee_due view that maps to fee_dues table
-- This handles singular/plural naming mismatch
CREATE OR REPLACE VIEW fee_due AS
SELECT * FROM fee_dues;

-- Verify views were created successfully
SELECT 'enrollments' AS view_name, COUNT(*) AS record_count FROM enrollments
UNION ALL
SELECT 'fee_due' AS view_name, COUNT(*) AS record_count FROM fee_due;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see counts above, the views were created successfully!
-- The backend API can now access these views as tables.
-- ============================================================================
