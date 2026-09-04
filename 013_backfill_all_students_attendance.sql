-- ============================================================================
-- Backfill ALL Students Attendance Records
-- ============================================================================
-- Created: 2024
-- Description: Bulk insert historical attendance records for all students
-- ============================================================================

DO $$
DECLARE
    v_batch_id UUID;
    v_student_id VARCHAR(50);
    v_count INTEGER := 0;
    v_total_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Starting bulk attendance backfill...';
    
    -- ========================================================================
    -- ART1003 - Anvi Mahesh
    -- Present: 24 Jul, 27 Jul, 31 Jul, 3 Aug, 7 Aug, 10 Aug, 17 Aug (7)
    -- Absent: 14 Aug (1)
    -- Compensation: 19 Aug, 3 Sep (2)
    -- ========================================================================
    v_student_id := 'ART1003';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-07', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1003: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1004 - Magizhan karthik
    -- Present: 20 Jul, 22 Jul, 27 Jul, 29 Jul, 1 Aug, 10 Aug, 12 Aug, 15 Aug, 17 Aug, 19 Aug, 22 Aug, 24 Aug, 26 Aug, 29 Aug, 31 Aug, 2 Sep (16)
    -- Absent: 25 Jul, 3 Aug, 5 Aug, 8 Aug (4)
    -- Compensation: 26 Jul, 16 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1004';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-20', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-25', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1004: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1005 - Hayan G. L
    -- Present: 23 Jul, 29 Jul, 30 Jul, 5 Aug, 6 Aug, 12 Aug, 13 Aug, 3 Sep (8)
    -- Compensation: 15 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1005';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1005: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1006 - Dakshvii Praveenraj
    -- Present: 15 Aug, 22 Aug, 23 Aug (3)
    -- Absent: 16 Aug, 29 Aug, 30 Aug (3)
    -- Compensation: 5 Aug, 6 Aug, 13 Aug (3)
    -- ========================================================================
    v_student_id := 'ART1006';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1006: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1007 - Shriniikaa .S.S
    -- Present: 22 Jul, 27 Jul, 29 Jul, 10 Aug, 12 Aug, 17 Aug, 19 Aug, 24 Aug, 31 Aug (9)
    -- Absent: 3 Aug, 5 Aug, 26 Aug, 2 Sep (4)
    -- ========================================================================
    v_student_id := 'ART1007';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1007: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1008 - Mukund .S.L
    -- Present: 22 Jul, 27 Jul, 29 Jul, 10 Aug, 12 Aug, 17 Aug, 24 Aug (7)
    -- Absent: 3 Aug, 5 Aug, 19 Aug, 26 Aug, 31 Aug (5)
    -- ========================================================================
    v_student_id := 'ART1008';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1008: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1009 - Aadhya Ramayee
    -- Present: 22 Jul, 26 Jul, 29 Jul, 1 Aug, 2 Aug, 5 Aug, 12 Aug, 15 Aug, 19 Aug, 26 Aug, 29 Aug, 30 Aug, 2 Sep (13)
    -- Absent: 25 Jul, 8 Aug, 9 Aug, 16 Aug, 22 Aug, 23 Aug (6)
    -- Compensation: 3 Aug, 24 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1009';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-25', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-09', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1009: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1010 - Aaradhayya
    -- Present: 24 Jul, 29 Jul, 31 Jul, 14 Aug, 21 Aug, 26 Aug, 28 Aug, 2 Sep (8)
    -- Absent: 5 Aug, 7 Aug, 12 Aug, 19 Aug (4)
    -- Compensation: 27 Jul, 3 Aug, 6 Aug, 9 Aug, 15 Aug, 22 Aug (6)
    -- ========================================================================
    v_student_id := 'ART1010';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-21', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-28', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-07', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-09', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1010: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1011 - Adithya Sai
    -- Present: 24 Jul, 14 Aug, 21 Aug, 26 Aug, 28 Aug, 2 Sep (6)
    -- Absent: 29 Jul, 31 Jul, 5 Aug, 7 Aug, 12 Aug, 19 Aug (6)
    -- Compensation: 27 Jul, 13 Aug, 15 Aug, 20 Aug, 22 Aug, 3 Sep (6)
    -- ========================================================================
    v_student_id := 'ART1011';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-21', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-28', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-31', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-07', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1011: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1012 - Swanika R.K
    -- Present: 24 Jul, 30 Jul, 31 Jul, 6 Aug, 7 Aug, 20 Aug, 21 Aug (7)
    -- Absent: 13 Aug, 14 Aug, 27 Aug, 28 Aug, 3 Sep (5)
    -- Compensation: 17 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1012';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-07', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-21', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-27', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-28', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1012: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1013 - Pramhodhini .S
    -- Present: 23 Jul, 25 Jul, 30 Jul, 1 Aug, 6 Aug, 13 Aug, 15 Aug, 20 Aug, 22 Aug, 27 Aug, 29 Aug, 3 Sep (12)
    -- Absent: 8 Aug (1)
    -- Compensation: 31 Jul (1)
    -- ========================================================================
    v_student_id := 'ART1013';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-25', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-31', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1013: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1014 - Maghil Vedhan
    -- Present: 22 Jul, 27 Jul, 29 Jul, 3 Aug, 5 Aug, 10 Aug, 12 Aug, 17 Aug, 19 Aug, 24 Aug (10)
    -- Absent: 26 Aug, 31 Aug, 2 Sep (3)
    -- ========================================================================
    v_student_id := 'ART1014';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1014: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1015 - Divena Murugavel
    -- Present: 25 Jul, 26 Jul, 1 Aug, 2 Aug, 8 Aug, 9 Aug, 23 Aug, 29 Aug, 30 Aug (9)
    -- Absent: 15 Aug, 16 Aug, 22 Aug (3)
    -- ========================================================================
    v_student_id := 'ART1015';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-25', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-09', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1015: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1016 - Ekantika Murugavel
    -- Present: 25 Jul, 26 Jul, 1 Aug, 2 Aug, 8 Aug, 9 Aug, 23 Aug, 29 Aug, 30 Aug (9)
    -- Absent: 15 Aug, 16 Aug, 22 Aug (3)
    -- ========================================================================
    v_student_id := 'ART1016';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-25', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-09', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1016: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1018 - Nithin Gokul
    -- Present: 27 Jul, 29 Jul, 3 Aug, 10 Aug, 12 Aug, 17 Aug, 19 Aug, 24 Aug, 31 Aug, 2 Sep (10)
    -- Absent: 5 Aug, 26 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1018';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1018: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1019 - Maanvi Adithya
    -- Present: 27 Jul, 29 Jul, 3 Aug, 10 Aug, 12 Aug, 17 Aug, 19 Aug, 24 Aug, 31 Aug, 2 Sep (10)
    -- Absent: 5 Aug, 26 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1019';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1019: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1020 - Adhiran . M
    -- Present: 30 Jul, 8 Aug, 13 Aug, 15 Aug, 22 Aug, 3 Sep (6)
    -- Absent: 6 Aug, 20 Aug, 27 Aug, 29 Aug (4)
    -- Compensation: 9 Aug, 14 Aug, 23 Aug, 26 Aug (4)
    -- ========================================================================
    v_student_id := 'ART1020';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-27', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-09', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1020: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1021 - Diyan Gaurang
    -- Present: 1 Aug, 2 Aug, 9 Aug, 15 Aug, 16 Aug, 29 Aug, 30 Aug (7)
    -- Absent: 8 Aug, 22 Aug, 23 Aug (3)
    -- ========================================================================
    v_student_id := 'ART1021';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-09', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-08', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1021: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1022 - Anvitha . S
    -- Present: 26 Jul, 2 Aug, 16 Aug (3)
    -- Absent: 23 Aug, 30 Aug (2)
    -- Compensation: 5 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1022';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1022: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1023 - Siya
    -- Present: 26 Jul, 2 Aug, 16 Aug (3)
    -- Absent: 23 Aug, 30 Aug (2)
    -- Compensation: 5 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1023';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1023: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1024 - Aara P.S
    -- Present: 12 Aug, 14 Aug, 19 Aug, 26 Aug (4)
    -- Absent: 21 Aug, 28 Aug (2)
    -- Compensation: 15 Aug, 16 Aug, 20 Aug, 29 Aug (4)
    -- ========================================================================
    v_student_id := 'ART1024';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-21', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-28', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-16', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1024: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1025 - Saashini
    -- Present: 3 Aug, 5 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1025';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1025: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1026 - Rieyaa Varma
    -- Present: 3 Aug (1)
    -- Absent: 5 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1026';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1026: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1027 - Avanthika . M
    -- Present: 8 Aug, 15 Aug, 22 Aug (3)
    -- Compensation: 6 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1027';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-08', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1027: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1028 - Shrithik . S
    -- Present: 29 Jul, 3 Aug, 5 Aug, 10 Aug, 12 Aug, 17 Aug, 19 Aug, 24 Aug, 26 Aug, 31 Aug, 2 Sep (11)
    -- Compensation: 13 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1028';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1028: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1029 - Tanvi K. S
    -- Present: 10 Aug, 12 Aug, 13 Aug, 17 Aug, 19 Aug, 20 Aug, 26 Aug, 27 Aug, 31 Aug, 2 Sep, 3 Sep (11)
    -- Absent: 24 Aug (1)
    -- Compensation: 28 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1029';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-28', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1029: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1030 - Lakshan . M
    -- Present: 12 Aug, 19 Aug, 26 Aug, 27 Aug, 2 Sep, 3 Sep (6)
    -- Absent: 13 Aug, 20 Aug (2)
    -- Compensation: 7 Aug, 14 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1030';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-12', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-20', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-07', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-14', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1030: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1031 - Harshadha Yuvaraj
    -- Present: 15 Aug, 22 Aug, 29 Aug (3)
    -- ========================================================================
    v_student_id := 'ART1031';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1031: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1032 - Nimalan . D
    -- Present: 17 Aug, 19 Aug, 2 Sep (3)
    -- Absent: 24 Aug, 26 Aug, 30 Aug (3)
    -- Compensation: 27 Aug, 3 Sep (2)
    -- ========================================================================
    v_student_id := 'ART1032';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1032: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1033 - Ridha Sabarish
    -- Present: 27 Jul, 29 Jul, 10 Aug, 17 Aug, 19 Aug (5)
    -- Absent: 3 Aug, 5 Aug, 12 Aug, 24 Aug, 26 Aug, 31 Aug, 2 Sep (7)
    -- Compensation: 6 Aug, 7 Aug, 13 Aug (3)
    -- ========================================================================
    v_student_id := 'ART1033';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-27', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-03', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-05', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-12', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-06', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-07', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-13', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1033: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1035 - Aadmika
    -- Present: 25 Jul, 26 Jul, 1 Aug (3)
    -- Absent: 2 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1035';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-07-25', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-07-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-02', 'ABSENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1035: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1036 - Shashvika . R . D
    -- Present: 29 Aug, 30 Aug, 31 Aug (3)
    -- Compensation: 28 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1036';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-28', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1036: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1037 - Tejuswari . C
    -- Present: 29 Aug, 30 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1037';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1037: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1038 - Nakshatra . C
    -- Present: 29 Aug, 30 Aug (2)
    -- ========================================================================
    v_student_id := 'ART1038';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1038: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1039 - Anikha Aashik
    -- Present: 16 Aug, 22 Aug, 23 Aug, 29 Aug, 30 Aug (5)
    -- Absent: 15 Aug (1)
    -- Compensation: 10 Aug (1)
    -- ========================================================================
    v_student_id := 'ART1039';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-16', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-23', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-30', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'ABSENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-10', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1039: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1040 - Aheera
    -- Present: 17 Aug, 19 Aug, 24 Aug, 26 Aug, 31 Aug, 2 Sep (6)
    -- ========================================================================
    v_student_id := 'ART1040';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-17', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-19', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-24', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-26', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-31', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1040: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1041 - Advika
    -- Present: 1 Aug, 15 Aug, 22 Aug, 29 Aug (4)
    -- ========================================================================
    v_student_id := 'ART1041';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-08-01', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-15', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-22', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-08-29', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1041: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1042 - Nilan Arya
    -- Present: 2 Sep (1)
    -- ========================================================================
    v_student_id := 'ART1042';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1042: % records', v_count;
    END IF;

    -- ========================================================================
    -- ART1043 - Rithika
    -- Present: 2 Sep (1)
    -- Compensation: 3 Sep (1)
    -- ========================================================================
    v_student_id := 'ART1043';
    SELECT batch_ids[1] INTO v_batch_id FROM enrollments WHERE student_id = v_student_id AND status = 'ACTIVE' LIMIT 1;
    IF v_batch_id IS NOT NULL THEN
        INSERT INTO attendance (student_id, batch_id, class_date, status, created_at, updated_at) VALUES
            (v_student_id, v_batch_id, '2024-09-02', 'PRESENT', NOW(), NOW()),
            (v_student_id, v_batch_id, '2024-09-03', 'PRESENT', NOW(), NOW());
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_total_count := v_total_count + v_count;
        RAISE NOTICE '✅ ART1043: % records', v_count;
    END IF;

    -- ========================================================================
    -- Summary
    -- ========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '🎉 BULK ATTENDANCE BACKFILL COMPLETED!';
    RAISE NOTICE '🎉 Total records inserted: %', v_total_count;
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '';

END $$;

-- ============================================================================
-- Verification Query
-- ============================================================================
SELECT 
    student_id,
    COUNT(*) as total_classes,
    SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as compensation_count,
    ROUND(
        (SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::numeric / 
         NULLIF(COUNT(*)::numeric, 0)) * 100, 
        1
    ) as attendance_percentage
FROM attendance
WHERE student_id LIKE 'ART%'
GROUP BY student_id
ORDER BY student_id;

