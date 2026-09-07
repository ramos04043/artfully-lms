-- Check total enrollments by status
SELECT 
    status,
    COUNT(*) as total_enrollments,
    COUNT(DISTINCT student_id) as unique_students
FROM enrollments
GROUP BY status
ORDER BY status;

-- Check all students with their programmes
SELECT 
    e.student_id,
    e.student_first_name,
    e.student_last_name,
    e.status,
    e.batch_ids,
    b.name as batch_name,
    p.name as programme_name
FROM enrollments e
LEFT JOIN batches b ON b.id = e.batch_ids[1]::uuid
LEFT JOIN programmes p ON p.id = b.programme_id
ORDER BY e.student_id;

-- Count students by programme
SELECT 
    p.name as programme_name,
    e.status,
    COUNT(DISTINCT e.student_id) as student_count
FROM enrollments e
LEFT JOIN batches b ON b.id = e.batch_ids[1]::uuid
LEFT JOIN programmes p ON p.id = b.programme_id
GROUP BY p.name, e.status
ORDER BY p.name, e.status;

-- Check for any enrollments without batch_ids
SELECT 
    student_id,
    student_first_name,
    student_last_name,
    status,
    batch_ids
FROM enrollments
WHERE batch_ids IS NULL OR batch_ids = '{}';
