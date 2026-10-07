-- ============================================================================
-- DISABLE RLS ON APP_USERS TABLE
-- ============================================================================
-- This allows the backend to query the app_users table
-- Run this in ZendBX Console → SQL Editor
-- ============================================================================

-- First, find the correct schema for app_users
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename = 'app_users';

-- The table is likely in proj_b2d90696 schema based on your earlier message
-- Try both possibilities:

-- Option 1: If in default public schema
ALTER TABLE IF EXISTS app_users DISABLE ROW LEVEL SECURITY;

-- Option 2: If in project-specific schema (replace with your actual schema)
ALTER TABLE IF EXISTS proj_b2d90696.app_users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'app_users';

-- Should show: rowsecurity = false

-- ============================================================================
-- ALTERNATIVE: If you want to keep RLS enabled, create policies instead
-- ============================================================================

-- If you prefer to keep RLS enabled for security, uncomment and run these:

/*
-- Enable RLS (if disabled above)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow SELECT for service role
CREATE POLICY "Allow service role to select app_users"
ON app_users
FOR SELECT
TO service_role
USING (true);

-- Create policy to allow SELECT for authenticated users
CREATE POLICY "Allow authenticated to select own user"
ON app_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy to allow INSERT for anonymous (signup)
CREATE POLICY "Allow anonymous to insert app_users"
ON app_users
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy to allow UPDATE for own user
CREATE POLICY "Allow users to update own record"
ON app_users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test query (should work after disabling RLS or creating policies)
SELECT id, username, email, created_at
FROM app_users
WHERE email = 'admin@artfully.in';

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- Now the backend can query app_users table
-- Try logging in again at: http://localhost:5173/login
-- ============================================================================
