-- Add attendance for additional/compensation classes in September 2026
-- September 4, 2026: ART1023 (Siya), ART1029 (Tanvi), ART1009 (Aadhya Ramayee)
-- September 3, 2026: ART1044 (Sashwin), ART1045 (Kiah)

-- First, check if these students exist in enrollments
SELECT student_id, student_first_name, student_last_name, batch_ids
FROM enrollments
WHERE student_id IN ('ART1023', 'ART1029', 'ART1009', 'ART1044', 'ART1045');

-- Delete any existing records for these dates first (in case of re-run)
DELETE FROM attendance 
WHERE student_id IN ('ART1023', 'ART1029', 'ART1009')
AND class_date = DATE '2026-09-04';

DELETE FROM attendance 
WHERE student_id IN ('ART1044', 'ART1045')
AND class_date = DATE '2026-09-03';

-- Insert attendance records for September 4, 2026 (Additional class - mark as PRESENT)
INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
SELECT 
    student_id,
    batch_ids[1]::uuid,  -- Use their first batch
    DATE '2026-09-04' as class_date,
    'PRESENT' as status,  -- Use PRESENT for additional classes
    NOW() as created_at,
    NOW() as updated_at
FROM enrollments
WHERE student_id IN ('ART1023', 'ART1029', 'ART1009')
AND status IN ('ACTIVE', 'PAUSED');

-- Insert attendance records for September 3, 2026 (Additional class - mark as PRESENT)
INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
SELECT 
    student_id,
    batch_ids[1]::uuid,  -- Use their first batch
    DATE '2026-09-03' as class_date,
    'PRESENT' as status,  -- Use PRESENT for additional classes
    NOW() as created_at,
    NOW() as updated_at
FROM enrollments
WHERE student_id IN ('ART1044', 'ART1045')
AND status IN ('ACTIVE', 'PAUSED');

-- Verify the inserted records
SELECT 
    a.student_id,
    e.student_first_name,
    e.student_last_name,
    a.class_date,
    TO_CHAR(a.class_date, 'Day, DD Mon YYYY') as formatted_date,
    a.status,
    b.name as batch_name
FROM attendance a
JOIN enrollments e ON a.student_id = e.student_id
LEFT JOIN batches b ON a.batch_id = b.id
WHERE a.student_id IN ('ART1023', 'ART1029', 'ART1009', 'ART1044', 'ART1045')
AND a.class_date IN (DATE '2026-09-03', DATE '2026-09-04')
ORDER BY a.class_date DESC, a.student_id;
