# 🗄️ ZendBX Database Setup Guide

## Overview

This guide will help you set up the database tables in ZendBX and create your first admin user.

## Prerequisites

- ✅ ZendBX account created
- ✅ Project created (artschoollms)
- ✅ Anon key and project slug configured in `.env`

## Step 1: Create Database Tables

You need to execute the SQL schema in ZendBX to create all the required tables.

### Option A: Using ZendBX Dashboard

1. Go to your ZendBX dashboard: https://dashboard.zendbx.in
2. Navigate to your project: **artschoollms**
3. Go to **SQL Editor** or **Database** section
4. Copy and paste the schema from `docs/database/schema.sql`
5. Execute the SQL

### Option B: Using SQL Client

If ZendBX provides database connection details:

1. Connect to your ZendBX PostgreSQL database using a SQL client (pgAdmin, DBeaver, etc.)
2. Execute the schema from `docs/database/schema.sql`

## Step 2: Create Your First Admin User

After the tables are created, you need to create an admin user account.

### Using ZendBX Dashboard

1. Go to **SQL Editor** in your ZendBX dashboard
2. Execute this SQL to create an admin user:

```sql
-- Create admin user
INSERT INTO users (
  email,
  password_hash,
  role,
  first_name,
  last_name,
  phone,
  is_active
) VALUES (
  'admin@artschool.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeGuEh.h4m9u', -- password: admin123
  'ADMIN',
  'Admin',
  'User',
  '+1234567890',
  true
);
```

**Important**: The password hash above is for `admin123`. You should change this password immediately after first login!

### Alternative: Sign Up Through UI

You can also sign up through the application:

1. Visit http://localhost:3000/
2. Click "Don't have an account? Sign up"
3. Enter your details
4. Sign up will create a ZendBX auth user

**However**, you still need to manually add the user to the `users` table with the ADMIN role:

```sql
-- After signing up through UI, add user to users table
INSERT INTO users (
  email,
  password_hash,
  role,
  first_name,
  last_name,
  is_active
) VALUES (
  'youremail@example.com',  -- Use the email you signed up with
  'zendbx_managed',          -- Password managed by ZendBX auth
  'ADMIN',                   -- Set role to ADMIN
  'Your',
  'Name',
  true
);
```

## Step 3: Test Login

1. Go to http://localhost:3000/
2. Enter admin credentials:
   - Email: `admin@artschool.com`
   - Password: `admin123`
3. You should be redirected to the admin dashboard

## Step 4: Create Additional Staff Users

To create staff users:

1. Sign up through the UI (creates ZendBX auth user)
2. Add to users table with STAFF role:

```sql
INSERT INTO users (
  email,
  password_hash,
  role,
  first_name,
  last_name,
  is_active
) VALUES (
  'staff@artschool.com',
  'zendbx_managed',
  'STAFF',
  'Staff',
  'Member',
  true
);
```

3. Optionally, create a staff profile:

```sql
INSERT INTO staff (
  user_id,
  employee_id,
  date_of_joining,
  specialization,
  is_active
) 
SELECT 
  id,
  'STAFF001',
  CURRENT_DATE,
  'Art Instructor',
  true
FROM users
WHERE email = 'staff@artschool.com';
```

## Step 5: Verify Table Structure

Check that all tables were created successfully:

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
-- users
-- staff
-- students
-- parents
-- student_parents
-- batches
-- batch_staff
-- batch_schedules
-- enrollments
-- sessions
-- attendance
-- compensation_sessions
-- compensation_attendance
-- payments
-- transactions
-- capex
-- opex
-- notifications
-- audit_logs
```

## Important Tables

### Core Tables
- **users** - System users (admin/staff) with authentication
- **staff** - Extended staff information
- **students** - Student records
- **batches** - Class batches
- **enrollments** - Student-batch relationships

### Attendance & Sessions
- **sessions** - Class sessions
- **attendance** - Student attendance records
- **compensation_sessions** - Makeup sessions
- **compensation_attendance** - Makeup attendance

### Finance
- **payments** - Student fee payments
- **transactions** - All financial transactions
- **capex** - Capital expenditure
- **opex** - Operational expenditure

### System
- **notifications** - System notifications
- **audit_logs** - Activity audit trail

## Row Level Security (RLS)

ZendBX may have Row Level Security enabled. You might need to set up policies:

```sql
-- Example: Allow authenticated users to read their own user record
CREATE POLICY "Users can view own record"
ON users FOR SELECT
USING (auth.uid() = id);

-- Example: Allow admins to view all users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);
```

Check ZendBX documentation for specific RLS configuration.

## Troubleshooting

### Issue: "User profile not found" after login

**Cause**: User exists in ZendBX auth but not in the `users` table.

**Solution**: Add the user to the users table:
```sql
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES ('user@example.com', 'zendbx_managed', 'STAFF', 'First', 'Last', true);
```

### Issue: "Permission denied" errors

**Cause**: Row Level Security (RLS) policies blocking access.

**Solution**: 
1. Check RLS policies in ZendBX dashboard
2. Ensure policies allow authenticated users to access data
3. Temporarily disable RLS for testing (not recommended for production)

### Issue: Can't create admin user

**Cause**: Schema not created or connection issues.

**Solution**:
1. Verify schema was executed successfully
2. Check database connection in ZendBX dashboard
3. Review error logs in ZendBX

## Next Steps

After database setup:

1. ✅ Login as admin
2. ✅ Create staff users
3. ✅ Add students through the UI
4. ✅ Create batches
5. ✅ Enroll students in batches
6. ✅ Start taking attendance

## Security Best Practices

1. **Change default passwords** immediately
2. **Use strong passwords** for all accounts
3. **Enable RLS policies** to protect data
4. **Regular backups** of your ZendBX database
5. **Audit logs** to track all activities
6. **Limit admin access** to trusted personnel only

## Support

- **ZendBX Documentation**: https://zendbx.in/docs
- **Schema Reference**: `docs/database/TABLES.md`
- **SQL Schema**: `docs/database/schema.sql`

---

**Status**: Ready for database initialization  
**Last Updated**: 2026-08-14
