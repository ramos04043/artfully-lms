-- ============================================================================
-- PHASE 3.1: ADD VOIDED STATUS TO PAYMENTS
-- ============================================================================
-- Purpose: Add VOIDED status to payments.status constraint
-- Safe to run: Yes (adds value to existing constraint)
-- Rollback: Can be reversed by removing VOIDED from constraint
-- ============================================================================

-- Step 1: Check for existing VOIDED or REVERSED payments
-- This helps us understand if any data cleanup is needed
SELECT 
    'Existing payment statuses' as check_type,
    status,
    COUNT(*) as count
FROM payments
GROUP BY status
ORDER BY count DESC;

-- Step 2: Find the exact constraint name
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass 
AND contype = 'c' 
AND pg_get_constraintdef(oid) LIKE '%status%';

-- Step 3: Drop existing constraint and add new one with VOIDED
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments 
ADD CONSTRAINT payments_status_check
CHECK (
    status IN (
        'PENDING',
        'COMPLETED',
        'FAILED',
        'REVERSED',  -- For actual refund/reversal operations
        'VOIDED'     -- For corrections/cancellations
    )
);

-- Step 4: Add comment explaining status semantics
COMMENT ON COLUMN payments.status IS 
'Payment status: PENDING (awaiting completion), COMPLETED (successful payment), FAILED (payment failed), REVERSED (actual refund issued), VOIDED (correction/cancellation without refund)';

-- Step 5: Verify the constraint was created
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass 
AND contype = 'c' 
AND conname = 'payments_status_check';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- - Added VOIDED status to payments.status constraint
-- - REVERSED remains for actual refund operations
-- - VOIDED is for corrections/cancellations
-- - Constraint is named payments_status_check
-- 
-- To test: Try updating a payment status to VOIDED
-- Example: UPDATE payments SET status = 'VOIDED' WHERE id = '<payment_id>';
-- ============================================================================
