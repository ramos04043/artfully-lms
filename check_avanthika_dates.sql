-- Check what days Avanthika's attendance dates are
-- From the attendance bulk insert: 2026-08-08, 2026-08-15, 2026-08-22, 2026-08-06

SELECT 
    date_val,
    TO_CHAR(date_val, 'Day') as day_name,
    TO_CHAR(date_val, 'DD Mon') as formatted_date
FROM (
    VALUES 
        (DATE '2026-08-06'),
        (DATE '2026-08-08'),
        (DATE '2026-08-15'),
        (DATE '2026-08-22')
) AS dates(date_val)
ORDER BY date_val;

-- August 2026 calendar check:
-- 2026-08-06 = Thursday
-- 2026-08-08 = Saturday
-- 2026-08-15 = Saturday
-- 2026-08-22 = Saturday
-- So Avanthika attends on: THURSDAY and SATURDAY (not FRIDAY!)
