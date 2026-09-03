-- Migration: Simplify Advanced batches to one batch per day (11:00-20:00)
-- Strategy: Keep Morning batches, update their times, delete Afternoon/Evening

DO $$
DECLARE
    v_programme_id UUID;
    v_monday_batch_id UUID;
    v_wednesday_batch_id UUID;
    v_thursday_batch_id UUID;
    v_friday_batch_id UUID;
    v_saturday_batch_id UUID;
    v_sunday_batch_id UUID;
BEGIN
    -- Step 1: Get Advanced Art programme ID
    SELECT id INTO v_programme_id
    FROM programmes
    WHERE name = 'Advanced Art'
    LIMIT 1;

    IF v_programme_id IS NULL THEN
        RAISE EXCEPTION 'Advanced Art programme not found';
    END IF;

    -- Step 2: Get the existing Morning batch IDs (we'll keep these)
    SELECT id INTO v_monday_batch_id FROM batches 
    WHERE programme_id = v_programme_id AND day_of_week = 'MONDAY' AND name LIKE 'Advanced Morning%';
    
    SELECT id INTO v_wednesday_batch_id FROM batches 
    WHERE programme_id = v_programme_id AND day_of_week = 'WEDNESDAY' AND name LIKE 'Advanced Morning%';
    
    SELECT id INTO v_thursday_batch_id FROM batches 
    WHERE programme_id = v_programme_id AND day_of_week = 'THURSDAY' AND name LIKE 'Advanced Morning%';
    
    SELECT id INTO v_friday_batch_id FROM batches 
    WHERE programme_id = v_programme_id AND day_of_week = 'FRIDAY' AND name LIKE 'Advanced Morning%';
    
    SELECT id INTO v_saturday_batch_id FROM batches 
    WHERE programme_id = v_programme_id AND day_of_week = 'SATURDAY' AND name LIKE 'Advanced Morning%';
    
    SELECT id INTO v_sunday_batch_id FROM batches 
    WHERE programme_id = v_programme_id AND day_of_week = 'SUNDAY' AND name LIKE 'Advanced Morning%';

    -- Step 3: Migrate students from Afternoon/Evening batches to Morning batch for each day
    
    -- MONDAY: Replace Afternoon/Evening with Morning batch
    UPDATE enrollments
    SET batch_ids = (
        SELECT ARRAY_AGG(DISTINCT batch_id::uuid)
        FROM (
            SELECT unnest(batch_ids)::uuid as batch_id
            FROM enrollments e2
            WHERE e2.id = enrollments.id
        ) sub
        WHERE batch_id::text NOT IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'MONDAY' 
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    )
    WHERE student_grade LIKE 'ADVANCED%'
    AND EXISTS (
        SELECT 1 FROM unnest(batch_ids) as batch_id
        WHERE batch_id::text IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'MONDAY'
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    );
    
    -- Add Morning batch if student has MONDAY in any slot
    UPDATE enrollments
    SET batch_ids = array_append(batch_ids, v_monday_batch_id)
    WHERE student_grade LIKE 'ADVANCED%'
    AND student_school_name LIKE '%MONDAY%'
    AND NOT (batch_ids @> ARRAY[v_monday_batch_id]);

    -- WEDNESDAY: Replace Afternoon/Evening with Morning batch
    UPDATE enrollments
    SET batch_ids = (
        SELECT ARRAY_AGG(DISTINCT batch_id::uuid)
        FROM (
            SELECT unnest(batch_ids)::uuid as batch_id
            FROM enrollments e2
            WHERE e2.id = enrollments.id
        ) sub
        WHERE batch_id::text NOT IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'WEDNESDAY' 
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    )
    WHERE student_grade LIKE 'ADVANCED%'
    AND EXISTS (
        SELECT 1 FROM unnest(batch_ids) as batch_id
        WHERE batch_id::text IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'WEDNESDAY'
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    );
    
    UPDATE enrollments
    SET batch_ids = array_append(batch_ids, v_wednesday_batch_id)
    WHERE student_grade LIKE 'ADVANCED%'
    AND student_school_name LIKE '%WEDNESDAY%'
    AND NOT (batch_ids @> ARRAY[v_wednesday_batch_id]);

    -- THURSDAY: Replace Afternoon/Evening with Morning batch
    UPDATE enrollments
    SET batch_ids = (
        SELECT ARRAY_AGG(DISTINCT batch_id::uuid)
        FROM (
            SELECT unnest(batch_ids)::uuid as batch_id
            FROM enrollments e2
            WHERE e2.id = enrollments.id
        ) sub
        WHERE batch_id::text NOT IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'THURSDAY' 
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    )
    WHERE student_grade LIKE 'ADVANCED%'
    AND EXISTS (
        SELECT 1 FROM unnest(batch_ids) as batch_id
        WHERE batch_id::text IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'THURSDAY'
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    );
    
    UPDATE enrollments
    SET batch_ids = array_append(batch_ids, v_thursday_batch_id)
    WHERE student_grade LIKE 'ADVANCED%'
    AND student_school_name LIKE '%THURSDAY%'
    AND NOT (batch_ids @> ARRAY[v_thursday_batch_id]);

    -- FRIDAY: Replace Afternoon/Evening with Morning batch
    UPDATE enrollments
    SET batch_ids = (
        SELECT ARRAY_AGG(DISTINCT batch_id::uuid)
        FROM (
            SELECT unnest(batch_ids)::uuid as batch_id
            FROM enrollments e2
            WHERE e2.id = enrollments.id
        ) sub
        WHERE batch_id::text NOT IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'FRIDAY' 
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    )
    WHERE student_grade LIKE 'ADVANCED%'
    AND EXISTS (
        SELECT 1 FROM unnest(batch_ids) as batch_id
        WHERE batch_id::text IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'FRIDAY'
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    );
    
    UPDATE enrollments
    SET batch_ids = array_append(batch_ids, v_friday_batch_id)
    WHERE student_grade LIKE 'ADVANCED%'
    AND student_school_name LIKE '%FRIDAY%'
    AND NOT (batch_ids @> ARRAY[v_friday_batch_id]);

    -- SATURDAY: Replace Afternoon/Evening with Morning batch
    UPDATE enrollments
    SET batch_ids = (
        SELECT ARRAY_AGG(DISTINCT batch_id::uuid)
        FROM (
            SELECT unnest(batch_ids)::uuid as batch_id
            FROM enrollments e2
            WHERE e2.id = enrollments.id
        ) sub
        WHERE batch_id::text NOT IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'SATURDAY' 
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    )
    WHERE student_grade LIKE 'ADVANCED%'
    AND EXISTS (
        SELECT 1 FROM unnest(batch_ids) as batch_id
        WHERE batch_id::text IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'SATURDAY'
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    );
    
    UPDATE enrollments
    SET batch_ids = array_append(batch_ids, v_saturday_batch_id)
    WHERE student_grade LIKE 'ADVANCED%'
    AND student_school_name LIKE '%SATURDAY%'
    AND NOT (batch_ids @> ARRAY[v_saturday_batch_id]);

    -- SUNDAY: Replace Afternoon/Evening with Morning batch
    UPDATE enrollments
    SET batch_ids = (
        SELECT ARRAY_AGG(DISTINCT batch_id::uuid)
        FROM (
            SELECT unnest(batch_ids)::uuid as batch_id
            FROM enrollments e2
            WHERE e2.id = enrollments.id
        ) sub
        WHERE batch_id::text NOT IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'SUNDAY' 
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    )
    WHERE student_grade LIKE 'ADVANCED%'
    AND EXISTS (
        SELECT 1 FROM unnest(batch_ids) as batch_id
        WHERE batch_id::text IN (
            SELECT id::text FROM batches 
            WHERE programme_id = v_programme_id 
            AND day_of_week = 'SUNDAY'
            AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%')
        )
    );
    
    UPDATE enrollments
    SET batch_ids = array_append(batch_ids, v_sunday_batch_id)
    WHERE student_grade LIKE 'ADVANCED%'
    AND student_school_name LIKE '%SUNDAY%'
    AND NOT (batch_ids @> ARRAY[v_sunday_batch_id]);

    -- Step 4: Delete Afternoon and Evening batches
    DELETE FROM batches
    WHERE programme_id = v_programme_id
    AND (name LIKE 'Advanced Afternoon%' OR name LIKE 'Advanced Evening%');

    -- Step 5: Update Morning batches to all-day (11:00-20:00) and rename
    UPDATE batches
    SET 
        name = 'Advanced - ' || 
            CASE day_of_week
                WHEN 'MONDAY' THEN 'Monday'
                WHEN 'WEDNESDAY' THEN 'Wednesday'
                WHEN 'THURSDAY' THEN 'Thursday'
                WHEN 'FRIDAY' THEN 'Friday'
                WHEN 'SATURDAY' THEN 'Saturday'
                WHEN 'SUNDAY' THEN 'Sunday'
            END,
        start_time = '11:00:00',
        end_time = '20:00:00'
    WHERE programme_id = v_programme_id
    AND name LIKE 'Advanced Morning%';

    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Now have 6 Advanced batches (one per day, 11:00-20:00)';

END $$;

-- Verify the new batches
SELECT 
    b.name,
    b.day_of_week,
    b.start_time,
    b.end_time,
    b.max_capacity,
    COUNT(DISTINCT e.id) as enrolled_students
FROM batches b
JOIN programmes p ON b.programme_id = p.id
LEFT JOIN enrollments e ON e.batch_ids @> ARRAY[b.id]
WHERE p.name = 'Advanced Art'
GROUP BY b.id, b.name, b.day_of_week, b.start_time, b.end_time, b.max_capacity
ORDER BY 
    CASE b.day_of_week
        WHEN 'MONDAY' THEN 1
        WHEN 'WEDNESDAY' THEN 2
        WHEN 'THURSDAY' THEN 3
        WHEN 'FRIDAY' THEN 4
        WHEN 'SATURDAY' THEN 5
        WHEN 'SUNDAY' THEN 6
    END;
