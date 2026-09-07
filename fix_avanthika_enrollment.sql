-- Fix Avanthika's enrollment - she should ONLY be in SATURDAY batch
-- Remove any other days (Friday, Thursday, etc.) and set only SATURDAY

-- Step 1: First check what she currently has (cast batch_id to text for comparison)
SELECT 
    e.student_id,
    e.student_first_name,
    e.batch_ids,
    e.student_school_name as stored_days,
    b.name as batch_name,
    b.day_of_week
FROM enrollments e
CROSS JOIN LATERAL unnest(e.batch_ids) as batch_id
JOIN batches b ON b.id::text = batch_id
WHERE e.student_id = 'ART1027';

-- Step 2: Update Avanthika's enrollment to ONLY SATURDAY
DO $$
DECLARE
    v_saturday_batch_id TEXT;
BEGIN
    -- Get Saturday batch ID (cast to text since batch_ids is text array)
    SELECT b.id::text INTO v_saturday_batch_id
    FROM batches b
    JOIN programmes p ON b.programme_id = p.id
    WHERE p.name = 'Advanced Art'
    AND b.day_of_week = 'SATURDAY'
    AND b.is_active = true
    LIMIT 1;

    RAISE NOTICE 'Saturday batch ID: %', v_saturday_batch_id;

    -- Replace batch_ids with ONLY Saturday batch (as text array)
    UPDATE enrollments
    SET batch_ids = ARRAY[v_saturday_batch_id],
        student_school_name = 'SATURDAY'
    WHERE student_id = 'ART1027';

    RAISE NOTICE 'Updated ART1027 enrollment: set to SATURDAY only';
END $$;

-- Step 3: Verify the change (cast batch_id to text for comparison)
SELECT 
    e.student_id,
    e.student_first_name,
    e.batch_ids,
    e.student_school_name as stored_days,
    b.name as batch_name,
    b.day_of_week
FROM enrollments e
CROSS JOIN LATERAL unnest(e.batch_ids) as batch_id
JOIN batches b ON b.id::text = batch_id
WHERE e.student_id = 'ART1027';
