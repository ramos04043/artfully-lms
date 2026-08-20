-- ============================================================================
-- ART STUDIO MANAGEMENT SYSTEM
-- ZendBX PostgreSQL Database Schema
-- Admin Portal + Staff Portal
-- SAFE / RERUNNABLE VERSION
-- ============================================================================


-- ============================================================================
-- 1. CORE USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('ADMIN', 'STAFF')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    date_of_birth DATE,
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    date_of_joining DATE NOT NULL,
    specialization VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 2. STUDENT & PARENT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    school_name VARCHAR(255),
    grade VARCHAR(20),
    medical_conditions TEXT,
    profile_image_url TEXT,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20) NOT NULL,
    parent_email VARCHAR(255),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (
            status IN (
                'ACTIVE',
                'PAUSED',
                'INACTIVE',
                'LEFT',
                'GRADUATED'
            )
        ),

    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paused_at TIMESTAMP WITH TIME ZONE,
    paused_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    relationship VARCHAR(50) NOT NULL,
    occupation VARCHAR(100),
    address TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS student_parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    parent_id UUID NOT NULL
        REFERENCES parents(id)
        ON DELETE CASCADE,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, parent_id)
);


-- ============================================================================
-- 3. PROGRAMMES & BATCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    session_class_count INTEGER NOT NULL DEFAULT 8
        CHECK (session_class_count > 0),

    classes_per_week INTEGER NOT NULL DEFAULT 2
        CHECK (classes_per_week > 0),

    duration_weeks INTEGER
        CHECK (duration_weeks IS NULL OR duration_weeks > 0),

    fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0
        CHECK (fee_per_session >= 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    programme_id UUID NOT NULL
        REFERENCES programmes(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,

    day_of_week VARCHAR(20) NOT NULL
        CHECK (
            day_of_week IN (
                'MONDAY',
                'TUESDAY',
                'WEDNESDAY',
                'THURSDAY',
                'FRIDAY',
                'SATURDAY',
                'SUNDAY'
            )
        ),

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    max_capacity INTEGER NOT NULL DEFAULT 15
        CHECK (max_capacity > 0),

    current_enrollment INTEGER NOT NULL DEFAULT 0
        CHECK (current_enrollment >= 0),

    room_number VARCHAR(50),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_time > start_time),

    UNIQUE(programme_id, day_of_week, start_time)
);


CREATE TABLE IF NOT EXISTS student_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,

    effective_to DATE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        effective_to IS NULL
        OR effective_to >= effective_from
    )
);


CREATE TABLE IF NOT EXISTS staff_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    staff_id UUID NOT NULL
        REFERENCES staff(id)
        ON DELETE CASCADE,

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(staff_id, batch_id)
);


-- ============================================================================
-- 4. SESSIONS & STUDENT PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    programme_id UUID NOT NULL
        REFERENCES programmes(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    total_classes INTEGER NOT NULL DEFAULT 8
        CHECK (total_classes > 0),

    fee_due_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (
            status IN (
                'DRAFT',
                'ACTIVE',
                'CLOSED'
            )
        ),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_date >= start_date)
);


CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    session_id UUID NOT NULL
        REFERENCES sessions(id)
        ON DELETE CASCADE,

    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    classes_attended INTEGER NOT NULL DEFAULT 0
        CHECK (classes_attended >= 0),

    classes_compensated INTEGER NOT NULL DEFAULT 0
        CHECK (classes_compensated >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (
            status IN (
                'IN_PROGRESS',
                'COMPLETED',
                'PAUSED',
                'CANCELLED'
            )
        ),

    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, session_id)
);


-- ============================================================================
-- 5. ATTENDANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Changed from UUID to VARCHAR to match enrollment system
    -- Stores student_id strings like "STU26268836"
    student_id VARCHAR(50) NOT NULL,

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    session_id UUID
        REFERENCES sessions(id)
        ON DELETE SET NULL,

    class_date DATE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'UNMARKED'
        CHECK (
            status IN (
                'UNMARKED',
                'PRESENT',
                'ABSENT',
                'COMPENSATION_PRESENT',
                'HOLIDAY',
                'CANCELLED'
            )
        ),

    marked_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    marked_at TIMESTAMP WITH TIME ZONE,

    is_locked BOOLEAN NOT NULL DEFAULT FALSE,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, batch_id, class_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance(batch_id, class_date);


-- ============================================================================
-- 6. COMPENSATION CLASSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS compensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    original_attendance_id UUID NOT NULL UNIQUE
        REFERENCES attendance(id)
        ON DELETE CASCADE,

    original_batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    original_date DATE NOT NULL,

    compensation_batch_id UUID
        REFERENCES batches(id)
        ON DELETE SET NULL,

    compensation_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL'
        CHECK (
            status IN (
                'PENDING_APPROVAL',
                'ASSIGNED',
                'ATTENDED',
                'EXPIRED',
                'CANCELLED',
                'REJECTED'
            )
        ),

    approved_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    approved_at TIMESTAMP WITH TIME ZONE,

    rejection_reason TEXT,

    attendance_id UUID
        REFERENCES attendance(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 7. FEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS fee_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    session_id UUID NOT NULL
        REFERENCES sessions(id)
        ON DELETE CASCADE,

    amount_due DECIMAL(10,2) NOT NULL
        CHECK (amount_due >= 0),

    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0
        CHECK (amount_paid >= 0),

    amount_pending DECIMAL(10,2) NOT NULL DEFAULT 0
        CHECK (amount_pending >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'PARTIAL',
                'PAID',
                'WAIVED',
                'CANCELLED'
            )
        ),

    due_date DATE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, session_id)
);


CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fee_due_id UUID NOT NULL
        REFERENCES fee_dues(id)
        ON DELETE RESTRICT,

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE RESTRICT,

    amount DECIMAL(10,2) NOT NULL
        CHECK (amount > 0),

    payment_mode VARCHAR(20) NOT NULL
        CHECK (
            payment_mode IN (
                'BANK',
                'CASH'
            )
        ),

    payment_date DATE NOT NULL,

    transaction_reference VARCHAR(100),

    notes TEXT,

    received_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
        CHECK (
            status IN (
                'PENDING',
                'COMPLETED',
                'FAILED',
                'REVERSED'
            )
        ),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 8. FINANCIAL ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_type VARCHAR(20) NOT NULL
        CHECK (
            account_type IN (
                'CAPEX',
                'OPEX'
            )
        ),

    account_mode VARCHAR(20) NOT NULL
        CHECK (
            account_mode IN (
                'BANK',
                'CASH'
            )
        ),

    account_name VARCHAR(100) NOT NULL,

    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,

    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(account_type, account_mode)
);


CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES financial_accounts(id)
        ON DELETE RESTRICT,

    transaction_type VARCHAR(20) NOT NULL
        CHECK (
            transaction_type IN (
                'INFLOW',
                'EXPENSE',
                'ADJUSTMENT',
                'REVERSAL'
            )
        ),

    amount DECIMAL(15,2) NOT NULL
        CHECK (amount > 0),

    balance_after DECIMAL(15,2),

    category VARCHAR(100),

    description TEXT NOT NULL,

    reference_type VARCHAR(50),

    reference_id UUID,

    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,

    reversed_by_transaction_id UUID
        REFERENCES financial_transactions(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES financial_accounts(id)
        ON DELETE RESTRICT,

    category VARCHAR(100) NOT NULL,

    amount DECIMAL(10,2) NOT NULL
        CHECK (amount > 0),

    expense_date DATE NOT NULL,

    vendor_name VARCHAR(255),

    description TEXT NOT NULL,

    receipt_url TEXT,

    payment_mode VARCHAR(20) NOT NULL
        CHECK (
            payment_mode IN (
                'BANK',
                'CASH'
            )
        ),

    created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    approved_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
        CHECK (
            status IN (
                'PENDING',
                'APPROVED',
                'REJECTED'
            )
        ),

    transaction_id UUID
        REFERENCES financial_transactions(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 9. HOLIDAYS & CLASS CANCELLATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    holiday_date DATE NOT NULL UNIQUE,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS class_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    batch_id UUID NOT NULL
        REFERENCES batches(id)
        ON DELETE CASCADE,

    cancellation_date DATE NOT NULL,

    reason TEXT NOT NULL,

    cancelled_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    notify_parents BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(batch_id, cancellation_date)
);


-- ============================================================================
-- 10. NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (
            priority IN (
                'LOW',
                'NORMAL',
                'HIGH',
                'URGENT'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'UNREAD'
        CHECK (
            status IN (
                'UNREAD',
                'READ',
                'ARCHIVED'
            )
        ),

    reference_type VARCHAR(50),

    reference_id UUID,

    read_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipient_email VARCHAR(255) NOT NULL,

    recipient_name VARCHAR(255),

    subject VARCHAR(500) NOT NULL,

    body TEXT NOT NULL,

    email_type VARCHAR(50) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
        CHECK (
            status IN (
                'QUEUED',
                'SENT',
                'FAILED',
                'RETRYING'
            )
        ),

    sent_at TIMESTAMP WITH TIME ZONE,

    failed_reason TEXT,

    retry_count INTEGER NOT NULL DEFAULT 0
        CHECK (retry_count >= 0),

    reference_type VARCHAR(50),

    reference_id UUID,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 11. STUDENT LIFECYCLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL
        REFERENCES students(id)
        ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL
        CHECK (
            event_type IN (
                'ENROLLED',
                'PAUSED',
                'RESUMED',
                'BATCH_CHANGED',
                'LEFT',
                'REJOINED',
                'GRADUATED',
                'INACTIVE'
            )
        ),

    event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    previous_status VARCHAR(20),

    new_status VARCHAR(20),

    reason TEXT,

    metadata JSONB,

    created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 12. APP SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    setting_key VARCHAR(100) UNIQUE NOT NULL,

    setting_value TEXT NOT NULL,

    value_type VARCHAR(20) NOT NULL
        CHECK (
            value_type IN (
                'STRING',
                'NUMBER',
                'BOOLEAN',
                'JSON'
            )
        ),

    description TEXT,

    is_public BOOLEAN NOT NULL DEFAULT FALSE,

    updated_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 14. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);


CREATE INDEX IF NOT EXISTS idx_staff_user_id
ON staff(user_id);


CREATE INDEX IF NOT EXISTS idx_students_student_id
ON students(student_id);

CREATE INDEX IF NOT EXISTS idx_students_status
ON students(status);


CREATE INDEX IF NOT EXISTS idx_student_parents_student
ON student_parents(student_id);

CREATE INDEX IF NOT EXISTS idx_student_parents_parent
ON student_parents(parent_id);


CREATE INDEX IF NOT EXISTS idx_programmes_active
ON programmes(is_active);


CREATE INDEX IF NOT EXISTS idx_batches_programme
ON batches(programme_id);

CREATE INDEX IF NOT EXISTS idx_batches_day
ON batches(day_of_week);

CREATE INDEX IF NOT EXISTS idx_batches_active
ON batches(is_active);


CREATE INDEX IF NOT EXISTS idx_student_batches_student
ON student_batches(student_id);

CREATE INDEX IF NOT EXISTS idx_student_batches_batch
ON student_batches(batch_id);

CREATE INDEX IF NOT EXISTS idx_student_batches_active
ON student_batches(student_id, is_active);


CREATE INDEX IF NOT EXISTS idx_staff_batches_staff
ON staff_batches(staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_batches_batch
ON staff_batches(batch_id);


CREATE INDEX IF NOT EXISTS idx_sessions_programme
ON sessions(programme_id);

CREATE INDEX IF NOT EXISTS idx_sessions_dates
ON sessions(start_date, end_date);


CREATE INDEX IF NOT EXISTS idx_student_sessions_student
ON student_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_student_sessions_session
ON student_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_student_sessions_status
ON student_sessions(status);


CREATE INDEX IF NOT EXISTS idx_attendance_student
ON attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_batch
ON attendance(batch_id);

CREATE INDEX IF NOT EXISTS idx_attendance_date
ON attendance(class_date);

CREATE INDEX IF NOT EXISTS idx_attendance_status
ON attendance(status);


CREATE INDEX IF NOT EXISTS idx_compensations_student
ON compensations(student_id);

CREATE INDEX IF NOT EXISTS idx_compensations_status
ON compensations(status);

CREATE INDEX IF NOT EXISTS idx_compensations_date
ON compensations(compensation_date);


CREATE INDEX IF NOT EXISTS idx_fee_dues_student
ON fee_dues(student_id);

CREATE INDEX IF NOT EXISTS idx_fee_dues_session
ON fee_dues(session_id);

CREATE INDEX IF NOT EXISTS idx_fee_dues_status
ON fee_dues(status);


CREATE INDEX IF NOT EXISTS idx_payments_fee_due
ON payments(fee_due_id);

CREATE INDEX IF NOT EXISTS idx_payments_student
ON payments(student_id);

CREATE INDEX IF NOT EXISTS idx_payments_date
ON payments(payment_date);


CREATE INDEX IF NOT EXISTS idx_financial_transactions_account
ON financial_transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_date
ON financial_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference
ON financial_transactions(reference_type, reference_id);


CREATE INDEX IF NOT EXISTS idx_expenses_account
ON expenses(account_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_expenses_status
ON expenses(status);


CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
ON notifications(status);


CREATE INDEX IF NOT EXISTS idx_email_events_status
ON email_events(status);

CREATE INDEX IF NOT EXISTS idx_email_events_type
ON email_events(email_type);


CREATE INDEX IF NOT EXISTS idx_subscription_events_student
ON subscription_events(student_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_date
ON subscription_events(event_date);


-- ============================================================================
-- 15. UPDATED_AT FUNCTION
--
-- IMPORTANT:
-- Unique Art Studio function name is used intentionally.
-- This avoids the ZendBX error:
-- "must be owner of function update_updated_at_column"
-- ============================================================================

CREATE OR REPLACE FUNCTION art_studio_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;
$$;


-- ============================================================================
-- 16. UPDATED_AT TRIGGERS
-- Drop only triggers belonging to our own tables.
-- We DO NOT touch ZendBX's existing update_updated_at_column function.
-- ============================================================================


DROP TRIGGER IF EXISTS art_studio_users_updated_at
ON users;

CREATE TRIGGER art_studio_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_staff_updated_at
ON staff;

CREATE TRIGGER art_studio_staff_updated_at
BEFORE UPDATE ON staff
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_students_updated_at
ON students;

CREATE TRIGGER art_studio_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_parents_updated_at
ON parents;

CREATE TRIGGER art_studio_parents_updated_at
BEFORE UPDATE ON parents
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_programmes_updated_at
ON programmes;

CREATE TRIGGER art_studio_programmes_updated_at
BEFORE UPDATE ON programmes
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_batches_updated_at
ON batches;

CREATE TRIGGER art_studio_batches_updated_at
BEFORE UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_student_batches_updated_at
ON student_batches;

CREATE TRIGGER art_studio_student_batches_updated_at
BEFORE UPDATE ON student_batches
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_sessions_updated_at
ON sessions;

CREATE TRIGGER art_studio_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_student_sessions_updated_at
ON student_sessions;

CREATE TRIGGER art_studio_student_sessions_updated_at
BEFORE UPDATE ON student_sessions
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_attendance_updated_at
ON attendance;

CREATE TRIGGER art_studio_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_compensations_updated_at
ON compensations;

CREATE TRIGGER art_studio_compensations_updated_at
BEFORE UPDATE ON compensations
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_fee_dues_updated_at
ON fee_dues;

CREATE TRIGGER art_studio_fee_dues_updated_at
BEFORE UPDATE ON fee_dues
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_payments_updated_at
ON payments;

CREATE TRIGGER art_studio_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_financial_accounts_updated_at
ON financial_accounts;

CREATE TRIGGER art_studio_financial_accounts_updated_at
BEFORE UPDATE ON financial_accounts
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_expenses_updated_at
ON expenses;

CREATE TRIGGER art_studio_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_holidays_updated_at
ON holidays;

CREATE TRIGGER art_studio_holidays_updated_at
BEFORE UPDATE ON holidays
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_email_events_updated_at
ON email_events;

CREATE TRIGGER art_studio_email_events_updated_at
BEFORE UPDATE ON email_events
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


DROP TRIGGER IF EXISTS art_studio_app_settings_updated_at
ON app_settings;

CREATE TRIGGER art_studio_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION art_studio_set_updated_at();


-- ============================================================================
-- 17. DEFAULT PROGRAMME
-- ============================================================================

INSERT INTO programmes (
    name,
    description,
    session_class_count,
    classes_per_week,
    fee_per_session,
    is_active
)
VALUES (
    'Foundation',
    'Foundation art programme',
    8,
    2,
    0,
    TRUE
)
ON CONFLICT (name)
DO NOTHING;


-- ============================================================================
-- 18. DEFAULT FINANCIAL ACCOUNTS
-- ============================================================================

INSERT INTO financial_accounts (
    account_type,
    account_mode,
    account_name,
    opening_balance,
    current_balance
)
VALUES

(
    'CAPEX',
    'BANK',
    'CapEX Bank',
    0,
    0
),

(
    'CAPEX',
    'CASH',
    'CapEX Cash',
    0,
    0
),

(
    'OPEX',
    'BANK',
    'OpEX Bank',
    0,
    0
),

(
    'OPEX',
    'CASH',
    'OpEX Cash',
    0,
    0
)

ON CONFLICT (account_type, account_mode)
DO NOTHING;


-- ============================================================================
-- 19. DEFAULT APP SETTINGS
-- ============================================================================

INSERT INTO app_settings (
    setting_key,
    setting_value,
    value_type,
    description,
    is_public
)
VALUES

(
    'studio_name',
    'Art Studio',
    'STRING',
    'Art studio name',
    TRUE
),

(
    'default_batch_capacity',
    '15',
    'NUMBER',
    'Default maximum students per batch',
    FALSE
),

(
    'default_session_class_count',
    '8',
    'NUMBER',
    'Default classes required per session',
    FALSE
),

(
    'default_classes_per_week',
    '2',
    'NUMBER',
    'Default classes per week',
    FALSE
),

(
    'attendance_lock_after_submit',
    'true',
    'BOOLEAN',
    'Lock Staff attendance after submission',
    FALSE
),

(
    'compensation_requires_admin_approval',
    'true',
    'BOOLEAN',
    'Admin approval required before compensation assignment',
    FALSE
),

(
    'allow_negative_financial_balance',
    'false',
    'BOOLEAN',
    'Allow expenses to exceed account balance',
    FALSE
),

(
    'enable_email_notifications',
    'true',
    'BOOLEAN',
    'Enable notification email engine',
    FALSE
),

(
    'enable_absence_notifications',
    'true',
    'BOOLEAN',
    'Create Admin notification when student is absent',
    FALSE
)

ON CONFLICT (setting_key)
DO NOTHING;


-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================


-- ============================================================================
-- VIEWS FOR BACKWARDS COMPATIBILITY
-- ============================================================================

-- Create enrollments view that maps to student_batches with student details
-- This view provides a unified enrollment interface expected by the frontend
DROP VIEW IF EXISTS enrollments CASCADE;
CREATE OR REPLACE VIEW enrollments AS
SELECT 
    sb.id,
    sb.student_id,
    s.student_id AS student_number,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.email AS student_email,
    s.phone AS student_phone,
    s.date_of_birth,
    s.gender,
    s.address,
    sb.batch_id,
    ARRAY_AGG(DISTINCT sb2.batch_id) AS batch_ids,
    sb.effective_from AS enrolled_at,
    CASE 
        WHEN sb.is_active = true AND s.status = 'ACTIVE' THEN 'ACTIVE'
        WHEN s.status = 'PAUSED' THEN 'PAUSED'
        WHEN s.status IN ('LEFT', 'INACTIVE') THEN 'INACTIVE'
        ELSE 'INACTIVE'
    END AS status,
    sb.created_at,
    sb.updated_at
FROM student_batches sb
INNER JOIN students s ON sb.student_id = s.id
LEFT JOIN student_batches sb2 ON sb2.student_id = s.id AND sb2.is_active = true
WHERE sb.is_active = true
GROUP BY 
    sb.id, sb.student_id, s.student_id, s.first_name, s.last_name, 
    s.email, s.phone, s.date_of_birth, s.gender, s.address,
    sb.batch_id, sb.effective_from, sb.is_active, s.status, sb.created_at, sb.updated_at;

-- Create fee_due view (singular) that maps to fee_dues (plural)
DROP VIEW IF EXISTS fee_due CASCADE;
CREATE OR REPLACE VIEW fee_due AS
SELECT * FROM fee_dues;

-- Grant permissions on views
-- GRANT SELECT, INSERT, UPDATE, DELETE ON enrollments TO anon, authenticated, service_role;
-- GRANT SELECT ON fee_due TO anon, authenticated, service_role;
