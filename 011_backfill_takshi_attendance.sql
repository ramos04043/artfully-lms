-- ============================================================================
-- Backfill Attendance Records for J.B. Takshi (ART1001)
-- ============================================================================
-- Created: 2024
-- Description: Insert historical attendance records for student ART1001 (Takshi)
-- 
-- Attendance Records:
-- Present: July 24, July 27, Aug 10, Aug 14, Aug 17, Aug 21, Aug 24 (7 classes)
-- Absent: Aug 3 (1 class)
-- Total: 8 classes, 87.5% attendance
-- ============================================================================

-- Step 1: Find Takshi's batch_id and insert attendance
DO $$
DECLARE
    v_batch_id UUID;
    v_student_id VARCHAR(50) := 'ART1001';
    v_count INTEGER := 0;
BEGIN
    -- Get the first active batch_id for student ART1001 from enrollments
    -- The batch_ids column is an array, so we take the first one
    SELECT batch_ids[1] INTO v_batch_id
    FROM enrollments
    WHERE student_id = v_student_id
      AND status = 'ACTIVE'
    LIMIT 1;

    -- Check if batch_id was found
    IF v_batch_id IS NULL THEN
        RAISE EXCEPTION 'No active batch found for student %. Please check enrollments table.', v_student_id;
    END IF;

    RAISE NOTICE 'Found batch_id: % for student: %', v_batch_id, v_student_id;

    -- Step 2: Insert PRESENT attendance records (7 classes)
    INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
    VALUES
        -- July 2024 - Corrected dates
        (v_student_id, v_batch_id, '2024-07-24', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
        
        -- August 2024
        (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-14', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-21', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % PRESENT records', v_count;

    -- Step 3: Insert ABSENT attendance record (1 class)
    INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
    VALUES
        (v_student_id, v_batch_id, '2024-08-03', 'ABSENT', NOW(), NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % ABSENT record', v_count;

    RAISE NOTICE '✅ Successfully completed attendance backfill for %', v_student_id;
    RAISE NOTICE '📊 Summary: 7 PRESENT + 1 ABSENT = 8 total records';

END $$;

-- Step 4: Verify the inserted records
SELECT 
    student_id,
    class_date,
    status,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as marked_at
FROM attendance
WHERE student_id = 'ART1001'
ORDER BY class_date;

-- ============================================================================
-- ALTERNATIVE: Manual Insert (if the above doesn't work)
-- ============================================================================
-- First, find the batch_id manually:
-- 
-- SELECT student_id, batch_ids FROM enrollments WHERE student_id = 'ART1001';
--
-- Then replace 'YOUR_BATCH_ID_HERE' below with the actual UUID and run:

/*
-- Replace YOUR_BATCH_ID_HERE with actual batch UUID from enrollments
INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
VALUES
    -- PRESENT records (7 classes)
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-07-24', 'PRESENT', NOW(), NOW()),
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-07-27', 'PRESENT', NOW(), NOW()),
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-08-10', 'PRESENT', NOW(), NOW()),
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-08-14', 'PRESENT', NOW(), NOW()),
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-08-17', 'PRESENT', NOW(), NOW()),
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-08-21', 'PRESENT', NOW(), NOW()),
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-08-24', 'PRESENT', NOW(), NOW()),
    
    -- ABSENT record (1 class)
    ('ART1001', 'YOUR_BATCH_ID_HERE', '2024-08-03', 'ABSENT', NOW(), NOW());
*/

-- ============================================================================
-- Summary:
-- Student: ART1001 (J.B. Takshi)
-- Total Records: 8 (7 Present + 1 Absent)
-- Dates:
--   Present: July 24, 27, Aug 10, 14, 17, 21, 24
--   Absent: Aug 3
-- Attendance Rate: 87.5% (7 present out of 8 classes)
-- ============================================================================
