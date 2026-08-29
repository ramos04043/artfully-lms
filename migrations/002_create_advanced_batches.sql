-- Migration: Create Advanced Programme Batches
-- Purpose: Create batches for Advanced students on each day (except Tuesday which is a holiday)
-- Advanced classes run from 11:00 AM to 8:00 PM every day (Monday, Wednesday, Thursday, Friday, Saturday, Sunday)
-- This allows staff to be assigned to Advanced batches just like Foundation batches

-- Create Advanced programme if it doesn't exist
INSERT INTO programmes (name, description, session_class_count, classes_per_week, fee_per_session, is_active)
SELECT 'Advanced Art', 'Advanced level art programme for experienced students - 11 AM to 8 PM daily (Tuesday holiday)', 8, 2, 0, true
WHERE NOT EXISTS (
    SELECT 1 FROM programmes WHERE name = 'Advanced Art'
);

-- Create Advanced batches for each day (except Tuesday which is a holiday)
DO $$
DECLARE
    advanced_programme_id UUID;
BEGIN
    -- Get the Advanced programme ID
    SELECT id INTO advanced_programme_id 
    FROM programmes 
    WHERE name = 'Advanced Art' 
    LIMIT 1;
    
    -- Create batch for MONDAY (11 AM - 8 PM)
    INSERT INTO batches (name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active)
    SELECT 'Advanced - Monday', 'MONDAY', '11:00', '20:00', 15, advanced_programme_id, true
    WHERE NOT EXISTS (
        SELECT 1 FROM batches WHERE name = 'Advanced - Monday' AND day_of_week = 'MONDAY'
    );
    
    -- Create batch for WEDNESDAY (11 AM - 8 PM)
    INSERT INTO batches (name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active)
    SELECT 'Advanced - Wednesday', 'WEDNESDAY', '11:00', '20:00', 15, advanced_programme_id, true
    WHERE NOT EXISTS (
        SELECT 1 FROM batches WHERE name = 'Advanced - Wednesday' AND day_of_week = 'WEDNESDAY'
    );
    
    -- Create batch for THURSDAY (11 AM - 8 PM)
    INSERT INTO batches (name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active)
    SELECT 'Advanced - Thursday', 'THURSDAY', '11:00', '20:00', 15, advanced_programme_id, true
    WHERE NOT EXISTS (
        SELECT 1 FROM batches WHERE name = 'Advanced - Thursday' AND day_of_week = 'THURSDAY'
    );
    
    -- Create batch for FRIDAY (11 AM - 8 PM)
    INSERT INTO batches (name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active)
    SELECT 'Advanced - Friday', 'FRIDAY', '11:00', '20:00', 15, advanced_programme_id, true
    WHERE NOT EXISTS (
        SELECT 1 FROM batches WHERE name = 'Advanced - Friday' AND day_of_week = 'FRIDAY'
    );
    
    -- Create batch for SATURDAY (11 AM - 8 PM)
    INSERT INTO batches (name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active)
    SELECT 'Advanced - Saturday', 'SATURDAY', '11:00', '20:00', 15, advanced_programme_id, true
    WHERE NOT EXISTS (
        SELECT 1 FROM batches WHERE name = 'Advanced - Saturday' AND day_of_week = 'SATURDAY'
    );
    
    -- Create batch for SUNDAY (11 AM - 8 PM)
    INSERT INTO batches (name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active)
    SELECT 'Advanced - Sunday', 'SUNDAY', '11:00', '20:00', 15, advanced_programme_id, true
    WHERE NOT EXISTS (
        SELECT 1 FROM batches WHERE name = 'Advanced - Sunday' AND day_of_week = 'SUNDAY'
    );
    
    RAISE NOTICE 'Advanced batches created successfully! (11 AM - 8 PM, Tuesday is holiday)';
END $$;

-- Verify the batches were created
SELECT 
    b.name,
    b.day_of_week,
    b.start_time,
    b.end_time,
    b.max_capacity,
    p.name as programme_name
FROM batches b
JOIN programmes p ON b.programme_id = p.id
WHERE p.name = 'Advanced Art'
ORDER BY 
    CASE b.day_of_week
        WHEN 'MONDAY' THEN 1
        WHEN 'WEDNESDAY' THEN 3
        WHEN 'THURSDAY' THEN 4
        WHEN 'FRIDAY' THEN 5
        WHEN 'SATURDAY' THEN 6
        WHEN 'SUNDAY' THEN 7
    END;
