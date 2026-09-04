-- ============================================================================
-- Backfill Attendance Records for Thukira .S (ART1002)
-- ============================================================================
-- Created: 2024
-- Description: Insert historical attendance records for student ART1002 (Thukira .S)
-- 
-- Attendance Records:
-- Present: 20 Jul, 22 Jul, 27 Jul, 29 Jul, 10 Aug, 12 Aug, 17 Aug, 19 Aug, 24 Aug, 26 Aug, 31 Aug, 2 Sep (12 classes)
-- Absent: 3 Aug, 5 Aug (2 classes)
-- Total: 14 classes, 85.7% attendance
-- ============================================================================

DO $$
DECLARE
    v_batch_id UUID;
    v_student_id VARCHAR(50) := 'ART1002';
    v_count INTEGER := 0;
BEGIN
    -- Get the first active batch_id for student ART1002 from enrollments
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

    -- Insert PRESENT attendance records (12 classes)
    INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
    VALUES
        -- July 2024
        (v_student_id, v_batch_id, '2024-07-20', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-07-22', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
        
        -- August 2024
        (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
        
        -- September 2024
        (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % PRESENT records', v_count;

    -- Insert ABSENT attendance records (2 classes)
    INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at)
    VALUES
        (v_student_id, v_batch_id, '2024-08-03', 'ABSENT', NOW(), NOW()),
        (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % ABSENT records', v_count;

    RAISE NOTICE '✅ Successfully completed attendance backfill for %', v_student_id;
    RAISE NOTICE '📊 Summary: 12 PRESENT + 2 ABSENT = 14 total records (85.7%% attendance)';

END $$;

-- Verify the inserted records
SELECT 
    student_id,
    class_date,
    status,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as marked_at
FROM attendance
WHERE student_id = 'ART1002'
ORDER BY class_date;

-- ============================================================================
-- Summary:
-- Student: ART1002 (Thukira .S)
-- Total Records: 14 (12 Present + 2 Absent)
-- Dates:
--   Present: July 20, 22, 27, 29, Aug 10, 12, 17, 19, 24, 26, 31, Sep 2
--   Absent: Aug 3, 5
-- Attendance Rate: 85.7% (12 present out of 14 classes)
-- ============================================================================
