-- Check Avanthika's attendance to see which days she actually attends
SELECT 
    a.student_id,
    a.class_date,
    TO_CHAR(a.class_date, 'Day') as day_name,
    a.status,
    b.name as batch_name,
    b.day_of_week
FROM attendance a
LEFT JOIN batches b ON a.batch_id = b.id
WHERE a.student_id = 'ART1027'
ORDER BY a.class_date;
