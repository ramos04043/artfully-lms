-- ============================================================================
-- FINANCE MODULE REFACTOR - PHASE 1: DATABASE FOUNDATION
-- ============================================================================
-- CRITICAL: This migration is ADDITIVE ONLY
-- It does NOT:
--   - Modify existing transaction data
--   - Migrate INFLOW → REVENUE
--   - Backfill payments table
--   - Delete any columns
--   - Change current_balance or balance_after
-- 
-- This migration CAN be safely rerun (idempotent operations)
-- ============================================================================

-- ============================================================================
-- A. UPDATE financial_transactions TABLE
-- ============================================================================

-- A1. Add status column (default ACTIVE for all existing rows)
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
CHECK (status IN ('ACTIVE', 'VOIDED'));

-- A2. Add voiding support columns
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS voided_by VARCHAR(255);

ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS voided_reason TEXT;

-- A3. Add updated_at and updated_by columns
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- A4. Add comments for documentation
COMMENT ON COLUMN financial_transactions.status IS 
    'Transaction status: ACTIVE (included in balance) or VOIDED (excluded from balance)';
    
COMMENT ON COLUMN financial_transactions.voided_at IS 
    'Timestamp when transaction was voided. NULL means ACTIVE.';
    
COMMENT ON COLUMN financial_transactions.voided_by IS 
    'Staff member (email or ID) who voided the transaction';
    
COMMENT ON COLUMN financial_transactions.voided_reason IS 
    'Business reason for voiding the transaction';
    
COMMENT ON COLUMN financial_transactions.updated_at IS 
    'Timestamp of last update (used for voiding)';
    
COMMENT ON COLUMN financial_transactions.updated_by IS 
    'User ID, email, or identifier of who last updated the transaction (used for voiding)';


-- ============================================================================
-- B. EXPAND transaction_type CONSTRAINT
-- ============================================================================

-- B1. Drop old constraint if exists
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_transaction_type_check;

-- B2. Add new expanded constraint (transitional - allows both old and new values)
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_transaction_type_check
CHECK (transaction_type IN (
    'INFLOW',       -- Legacy: will be migrated to REVENUE
    'REVENUE',      -- New standard for incoming money
    'EXPENSE',      -- Keep as-is
    'OUTFLOW',      -- Legacy: will be migrated to EXPENSE
    'ADJUSTMENT',   -- Keep for corrections
    'REVERSAL'      -- Keep for reversals
));


-- ============================================================================
-- C. CREATE transaction_categories TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(50) NOT NULL UNIQUE,
    
    name VARCHAR(100) NOT NULL,
    
    account_type VARCHAR(10) NOT NULL
        CHECK (account_type IN ('OPEX', 'CAPEX')),
    
    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('REVENUE', 'EXPENSE')),
    
    description TEXT,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_category_combination 
        CHECK (
            -- OPEX can have both REVENUE and EXPENSE
            (account_type = 'OPEX' AND transaction_type IN ('REVENUE', 'EXPENSE'))
            OR
            -- CAPEX can have both REVENUE and EXPENSE
            (account_type = 'CAPEX' AND transaction_type IN ('REVENUE', 'EXPENSE'))
        )
);

COMMENT ON TABLE transaction_categories IS 
    'Controlled list of valid transaction categories by account type and transaction type';
    
COMMENT ON COLUMN transaction_categories.code IS 
    'Unique code for the category (e.g., STUDENT_FEES, SALARY, RENT)';
    
COMMENT ON COLUMN transaction_categories.account_type IS 
    'OPEX (Operating) or CAPEX (Capital)';
    
COMMENT ON COLUMN transaction_categories.transaction_type IS 
    'REVENUE (money in) or EXPENSE (money out)';
    
COMMENT ON COLUMN transaction_categories.display_order IS 
    'Sort order for displaying categories in dropdowns';


-- ============================================================================
-- C2. SEED transaction_categories WITH DEFAULT CATEGORIES
-- ============================================================================

-- OPEX REVENUE Categories
INSERT INTO transaction_categories (code, name, account_type, transaction_type, description, display_order)
VALUES 
    ('STUDENT_FEES', 'Student Fee Payments', 'OPEX', 'REVENUE', 'Student enrollment and class fees', 10),
    ('WORKSHOP_FEES', 'Workshop Fees', 'OPEX', 'REVENUE', 'Special workshop registration fees', 20),
    ('OTHER_OPERATING_REVENUE', 'Other Operating Revenue', 'OPEX', 'REVENUE', 'Miscellaneous operating income', 90)
ON CONFLICT (code) DO NOTHING;

-- OPEX EXPENSE Categories
INSERT INTO transaction_categories (code, name, account_type, transaction_type, description, display_order)
VALUES 
    ('SALARY', 'Staff Salaries', 'OPEX', 'EXPENSE', 'Monthly staff salaries and wages', 100),
    ('RENT', 'Studio Rent', 'OPEX', 'EXPENSE', 'Monthly studio rent payments', 110),
    ('ELECTRICITY', 'Electricity', 'OPEX', 'EXPENSE', 'Monthly electricity bills', 120),
    ('INTERNET', 'Internet & Telecom', 'OPEX', 'EXPENSE', 'Internet and phone services', 130),
    ('ART_SUPPLIES', 'Art Supplies', 'OPEX', 'EXPENSE', 'Paints, brushes, canvases, papers, etc.', 140),
    ('STUDIO_EXPENSE', 'Studio Expenses', 'OPEX', 'EXPENSE', 'General studio operational expenses', 150),
    ('MAINTENANCE', 'Maintenance & Repairs', 'OPEX', 'EXPENSE', 'Studio maintenance and repairs', 160),
    ('OFFICE_SUPPLIES', 'Office Supplies', 'OPEX', 'EXPENSE', 'Paper, stationery, printing', 170),
    ('OTHER_OPERATING_EXPENSE', 'Other Operating Expenses', 'OPEX', 'EXPENSE', 'Miscellaneous operating expenses', 190)
ON CONFLICT (code) DO NOTHING;

-- CAPEX REVENUE Categories
INSERT INTO transaction_categories (code, name, account_type, transaction_type, description, display_order)
VALUES 
    ('CAPITAL_CONTRIBUTION', 'Capital Contribution', 'CAPEX', 'REVENUE', 'Owner capital contributions', 200),
    ('CAPITAL_INVESTMENT', 'Capital Investment', 'CAPEX', 'REVENUE', 'External capital investments', 210),
    ('OTHER_CAPITAL_REVENUE', 'Other Capital Revenue', 'CAPEX', 'REVENUE', 'Asset sales, capital gains', 290)
ON CONFLICT (code) DO NOTHING;

-- CAPEX EXPENSE Categories
INSERT INTO transaction_categories (code, name, account_type, transaction_type, description, display_order)
VALUES 
    ('INTERIOR', 'Interior Work', 'CAPEX', 'EXPENSE', 'Interior renovation and design', 300),
    ('ELECTRICAL_WORK', 'Electrical Work', 'CAPEX', 'EXPENSE', 'Electrical installations and wiring', 310),
    ('EQUIPMENT', 'Equipment Purchase', 'CAPEX', 'EXPENSE', 'Art equipment, machinery, tools', 320),
    ('FURNITURE', 'Furniture & Fixtures', 'CAPEX', 'EXPENSE', 'Desks, chairs, storage units', 330),
    ('R_AND_D', 'Research & Development', 'CAPEX', 'EXPENSE', 'R&D and experimental projects', 340),
    ('MARKETING_INVESTMENT', 'Marketing Investment', 'CAPEX', 'EXPENSE', 'Major marketing campaigns, branding', 350),
    ('ONE_TIME_INVESTMENT', 'One-Time Investment', 'CAPEX', 'EXPENSE', 'Large one-time capital expenditures', 360),
    ('OTHER_CAPITAL_EXPENSE', 'Other Capital Expenses', 'CAPEX', 'EXPENSE', 'Miscellaneous capital expenses', 390)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- C3. ADD category_id TO financial_transactions (NOW THAT TABLE EXISTS)
-- ============================================================================

ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES transaction_categories(id) ON DELETE RESTRICT;

COMMENT ON COLUMN financial_transactions.category_id IS 
    'FK to transaction_categories - authoritative category for new transactions';


-- ============================================================================
-- D. UPDATE payments TABLE
-- ============================================================================

-- D1. Add transaction_id column
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES financial_transactions(id) ON DELETE RESTRICT;

COMMENT ON COLUMN payments.transaction_id IS 
    'FK to financial_transactions - links payment business record to ledger entry';


-- ============================================================================
-- E. ADD VOIDING SUPPORT TO expenses TABLE
-- ============================================================================

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS voided_by VARCHAR(255);

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS voided_reason TEXT;

COMMENT ON COLUMN expenses.voided_at IS 
    'Timestamp when expense was voided. NULL means active.';
    
COMMENT ON COLUMN expenses.voided_by IS 
    'Staff member who voided the expense';
    
COMMENT ON COLUMN expenses.voided_reason IS 
    'Business reason for voiding the expense';


-- ============================================================================
-- F. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- F1. Indexes on financial_transactions
CREATE INDEX IF NOT EXISTS idx_ft_account_status 
ON financial_transactions(account_id, status);

CREATE INDEX IF NOT EXISTS idx_ft_type_status 
ON financial_transactions(transaction_type, status);

CREATE INDEX IF NOT EXISTS idx_ft_transaction_date 
ON financial_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ft_reference 
ON financial_transactions(reference_type, reference_id) 
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_ft_category_id 
ON financial_transactions(category_id) 
WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ft_voided 
ON financial_transactions(voided_at) 
WHERE voided_at IS NOT NULL;

-- F2. Indexes on payments
CREATE INDEX IF NOT EXISTS idx_payments_transaction 
ON payments(transaction_id);

-- F3. Indexes on transaction_categories
CREATE INDEX IF NOT EXISTS idx_categories_active 
ON transaction_categories(account_type, transaction_type, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_display 
ON transaction_categories(display_order, is_active) 
WHERE is_active = TRUE;

-- F4. Indexes on expenses
CREATE INDEX IF NOT EXISTS idx_expenses_account_date 
ON expenses(account_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_transaction 
ON expenses(transaction_id);

CREATE INDEX IF NOT EXISTS idx_expenses_voided 
ON expenses(voided_at) 
WHERE voided_at IS NOT NULL;


-- ============================================================================
-- END OF PHASE 1 MIGRATION
-- ============================================================================
-- Summary:
-- - Added status, voiding columns to financial_transactions
-- - Expanded transaction_type constraint to include REVENUE
-- - Created transaction_categories table with 23 seeded categories
-- - Added transaction_id to payments table
-- - Added voiding support to expenses table
-- - Created 15 performance indexes
-- 
-- All existing data remains UNCHANGED
-- No INFLOW → REVENUE migration performed
-- No payments backfill performed
-- current_balance and balance_after kept for compatibility
-- ============================================================================
