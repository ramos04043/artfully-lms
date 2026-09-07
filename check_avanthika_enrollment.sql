-- Check Avanthika's current enrollment and batch assignments
SELECT 
    e.student_id,
    e.student_first_name,
    e.student_last_name,
    e.status,
    e.batch_ids,
    e.student_school_name as stored_days,
    e.created_at
FROM enrollments e
WHERE e.student_id = 'ART1027';

-- Check what batches these IDs correspond to
SELECT 
    b.id,
    b.name,
    b.day_of_week,
    b.start_time,
    b.end_time,
    p.name as programme_name
FROM batches b
JOIN programmes p ON b.programme_id = p.id
WHERE b.id IN (
    SELECT unnest(batch_ids) 
    FROM enrollments 
    WHERE student_id = 'ART1027'
);
