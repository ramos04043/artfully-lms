-- ============================================================================
-- MIGRATION 000: CREATE ADMIN USER
-- ============================================================================
-- Purpose: Create the initial admin user for Artfully LMS
-- Email: admin@artfully.in
-- Password: artfully@123
-- ============================================================================

-- ============================================================================
-- IMPORTANT: This assumes the users table already exists from schema.sql
-- If not, run docs/database/schema.sql first!
-- ============================================================================

-- Insert admin user with bcrypt hashed password
-- Password hash for "artfully@123" using bcrypt rounds=10
-- Generated using: bcrypt.hashpw(b"artfully@123", bcrypt.gensalt(rounds=10))

INSERT INTO users (
    email,
    password_hash,
    role,
    first_name,
    last_name,
    phone,
    is_active,
    created_at,
    updated_at
)
VALUES (
    'admin@artfully.in',
    -- Bcrypt hash of "artfully@123"
    '$2b$10$rZ8PQk9qKX.EYmY3.xQJ5OHXvN3GJqMKpI4fvK8yxN1zLk6XH7NQm',
    'ADMIN',
    'Admin',
    'User',
    NULL,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify the admin user was created
SELECT 
    id,
    email,
    role,
    first_name,
    last_name,
    is_active,
    created_at
FROM users
WHERE email = 'admin@artfully.in';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- Admin user created successfully!
-- 
-- Login Credentials:
-- Email: admin@artfully.in
-- Password: artfully@123
-- 
-- ⚠️ IMPORTANT: Change this password after first login in production!
-- ============================================================================

