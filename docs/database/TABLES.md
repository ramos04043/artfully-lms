# Database Tables Documentation

## Complete Table List (25 Tables)

### 1. Core User Management (2 tables)

#### users
- **Purpose**: Authentication and user accounts
- **Key Fields**: email, password_hash, role (ADMIN/STAFF), first_name, last_name
- **Relationships**: Referenced by staff, audit_logs, notifications

#### staff
- **Purpose**: Staff-specific information extending users
- **Key Fields**: user_id, employee_id, date_of_joining, specialization
- **Relationships**: Links to users, referenced by staff_batches

---

### 2. Student & Parent Management (4 tables)

#### students
- **Purpose**: Student profiles and information
- **Key Fields**: student_id, first_name, last_name, status, enrolled_at
- **Status Values**: ACTIVE, PAUSED, INACTIVE, GRADUATED
- **Relationships**: Referenced by student_parents, student_batches, attendance, payments

#### parents
- **Purpose**: Parent/guardian profiles
- **Key Fields**: first_name, last_name, email, phone, relationship
- **Relationships**: Referenced by student_parents

#### student_parents
- **Purpose**: Many-to-many relationship between students and parents
- **Key Fields**: student_id, parent_id, is_primary
- **Constraints**: Unique(student_id, parent_id)

---

### 3. Programmes & Batches (5 tables)

#### programmes
- **Purpose**: Art programmes (Foundation, Advanced, etc.)
- **Key Fields**: name, session_class_count, classes_per_week, fee_per_session
- **Defaults**: Foundation = 8 classes, 2 per week
- **Relationships**: Referenced by batches, sessions

#### batches
- **Purpose**: Class batches with schedules
- **Key Fields**: programme_id, name, day_of_week, start_time, end_time, max_capacity
- **Constraints**: Unique(programme_id, day_of_week, start_time)
- **Relationships**: Links to programmes, referenced by student_batches, staff_batches, attendance

#### student_batches
- **Purpose**: Students enrolled in batches
- **Key Fields**: student_id, batch_id, enrolled_at, is_active
- **Constraints**: Unique(student_id, batch_id)
- **Business Rule**: Student selects 2 batches, no same-day conflicts

#### staff_batches
- **Purpose**: Staff assigned to batches
- **Key Fields**: staff_id, batch_id, assigned_at, is_active
- **Constraints**: Unique(staff_id, batch_id)

---

### 4. Sessions & Progress (2 tables)

#### sessions
- **Purpose**: Student learning sessions (e.g., 8 classes per Foundation session)
- **Key Fields**: programme_id, name, start_date, end_date, total_classes
- **Relationships**: Links to programmes, referenced by student_sessions, fee_dues

#### student_sessions
- **Purpose**: Session enrollment and progress tracking
- **Key Fields**: student_id, session_id, classes_attended, classes_compensated, status
- **Status Values**: IN_PROGRESS, COMPLETED, CANCELLED
- **Progress Calculation**: Counts PRESENT + COMPENSATION_PRESENT

---

### 5. Attendance & Compensation (2 tables)

#### attendance
- **Purpose**: Daily attendance records
- **Key Fields**: student_id, batch_id, class_date, status, marked_by, is_locked
- **Status Values**: UNMARKED, PRESENT, ABSENT, COMPENSATION_PRESENT, HOLIDAY, CANCELLED
- **Constraints**: Unique(student_id, batch_id, class_date)
- **Business Rules**:
  - Defaults to UNMARKED
  - Staff submission locks attendance
  - Admin can correct with audit trail

#### compensations
- **Purpose**: Compensation class assignments
- **Key Fields**: student_id, original_attendance_id, compensation_batch_id, compensation_date, status
- **Status Values**: PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED
- **Business Rules**:
  - One compensation per absence
  - Validates future date
  - Checks batch capacity
  - Prevents same-day conflicts

---

### 6. Fees & Payments (2 tables)

#### fee_dues
- **Purpose**: Fee structure per session
- **Key Fields**: student_id, session_id, amount_due, amount_paid, amount_pending, status
- **Status Values**: PENDING, PARTIAL, PAID, WAIVED, CANCELLED
- **Constraints**: Unique(student_id, session_id)

#### payments
- **Purpose**: Payment transactions
- **Key Fields**: fee_due_id, student_id, amount, payment_mode, payment_date
- **Payment Modes**: BANK, CASH, UPI, CARD, CHEQUE
- **Business Rule**: Creates matching OpEX inflow transaction

---

### 7. Finance & Accounting (3 tables)

#### financial_accounts
- **Purpose**: CapEX/OpEX Bank/Cash accounts
- **Key Fields**: account_type, account_mode, account_name, current_balance
- **Account Types**: CAPEX, OPEX
- **Account Modes**: BANK, CASH
- **Constraints**: Unique(account_type, account_mode)

#### financial_transactions
- **Purpose**: Immutable financial ledger
- **Key Fields**: account_id, transaction_type, amount, balance_after, transaction_date
- **Transaction Types**: INFLOW, OUTFLOW, ADJUSTMENT, REVERSAL
- **Business Rules**:
  - Immutable (no updates)
  - Corrections use REVERSAL + new transaction
  - Records balance snapshot

#### expenses
- **Purpose**: Studio expense records
- **Key Fields**: account_id, category, amount, expense_date, vendor_name, status
- **Status Values**: PENDING, APPROVED, REJECTED
- **Links**: Creates financial_transaction when approved

---

### 8. Operations (2 tables)

#### holidays
- **Purpose**: Holiday calendar
- **Key Fields**: name, holiday_date, description, is_active
- **Business Rule**: Attendance marked as HOLIDAY automatically

#### class_cancellations
- **Purpose**: Cancelled classes
- **Key Fields**: batch_id, cancellation_date, reason, cancelled_by
- **Business Rule**: Attendance marked as CANCELLED for affected students

---

### 9. Notifications & Communication (2 tables)

#### notifications
- **Purpose**: System notifications for Admin/Staff
- **Key Fields**: user_id, type, title, message, priority, status
- **Priority Values**: LOW, NORMAL, HIGH, URGENT
- **Status Values**: UNREAD, READ, ARCHIVED
- **Events**: Student absence, pending fees, session completion, etc.

#### email_events
- **Purpose**: Email delivery tracking
- **Key Fields**: recipient_email, subject, body, email_type, status
- **Status Values**: QUEUED, SENT, FAILED, RETRYING
- **Business Rule**: Async processing, failures logged but don't block operations

---

### 10. Audit & Lifecycle (2 tables)

#### subscription_events
- **Purpose**: Student lifecycle events
- **Key Fields**: student_id, event_type, event_date, previous_status, new_status
- **Event Types**: ENROLLED, PAUSED, RESUMED, BATCH_CHANGED, GRADUATED, INACTIVE
- **Purpose**: Track complete student journey

#### audit_logs
- **Purpose**: Complete audit trail for sensitive operations
- **Key Fields**: user_id, action, entity_type, entity_id, old_values, new_values
- **Audited Actions**:
  - Attendance corrections
  - Batch changes
  - Pause/resume
  - Payment reversals
  - Finance adjustments
  - Compensation cancellations
  - Staff permission changes

---

### 11. System Configuration (1 table)

#### app_settings
- **Purpose**: System configuration
- **Key Fields**: setting_key, setting_value, value_type, description, is_public
- **Value Types**: STRING, NUMBER, BOOLEAN, JSON
- **Examples**:
  - studio_name
  - max_batch_capacity
  - enable_email_notifications
  - attendance_lock_after_submit

---

## Key Relationships

```
users → staff
students ← student_parents → parents
programmes → batches ← student_batches → students
programmes → sessions ← student_sessions → students
staff → staff_batches → batches
students → attendance ← batches
attendance → compensations
students → fee_dues ← sessions
fee_dues → payments
financial_accounts → financial_transactions
financial_accounts → expenses
batches → class_cancellations
users → notifications
students → subscription_events
users → audit_logs
```

## Indexes Summary

All tables have optimized indexes on:
- Foreign keys
- Frequently queried fields
- Date ranges
- Status fields
- Composite unique constraints

## Triggers

All tables with `updated_at` field have automatic triggers to update timestamp on modifications.

## Business Constraints

1. **Enrollment**: Student cannot select 2 batches on the same day
2. **Capacity**: Batch enrollment cannot exceed max_capacity
3. **Attendance**: Unique constraint prevents duplicate attendance for same student/batch/date
4. **Compensation**: Validates future date, capacity, no same-day conflicts
5. **Payments**: Automatically creates matching financial transactions
6. **Finance**: Immutable ledger, corrections via reversals
7. **Sessions**: Progress counts only PRESENT and COMPENSATION_PRESENT

## Data Integrity

- Cascading deletes where appropriate
- Foreign key constraints enforced
- Check constraints on enum fields
- Unique constraints prevent duplicates
- Immutable tables (financial_transactions, audit_logs)
