-- Check all Advanced Art batches and their days
SELECT 
    b.id,
    b.name,
    b.day_of_week,
    b.start_time,
    b.end_time,
    p.name as programme_name,
    b.is_active
FROM batches b
JOIN programmes p ON b.programme_id = p.id
WHERE p.name = 'Advanced Art'
ORDER BY 
    CASE b.day_of_week
        WHEN 'MONDAY' THEN 1
        WHEN 'TUESDAY' THEN 2
        WHEN 'WEDNESDAY' THEN 3
        WHEN 'THURSDAY' THEN 4
        WHEN 'FRIDAY' THEN 5
        WHEN 'SATURDAY' THEN 6
        WHEN 'SUNDAY' THEN 7
    END;
