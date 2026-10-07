"""
Generate bcrypt password hash for admin password
"""
import bcrypt

# Password to hash
password = "artfully@123"

# Generate hash
password_bytes = password.encode('utf-8')
salt = bcrypt.gensalt()
hash_bytes = bcrypt.hashpw(password_bytes, salt)
hash_str = hash_bytes.decode('utf-8')

print("=" * 80)
print("PASSWORD HASH GENERATOR")
print("=" * 80)
print(f"Password: {password}")
print(f"Hash: {hash_str}")
print(f"Hash Length: {len(hash_str)}")
print("=" * 80)

# Verify the hash works
print("\nVerifying hash...")
if bcrypt.checkpw(password_bytes, hash_bytes):
    print("✅ Hash verification SUCCESSFUL")
else:
    print("❌ Hash verification FAILED")

# Test with the existing hash from database
existing_hash = "$2b$10$rZ8PQk9qKX.EYmY3.xQJ5OHXvN3GJqMKpI4fvK8yxN1zLk6XH7NQm"
print(f"\nTesting existing hash from database:")
print(f"Existing hash: {existing_hash}")

try:
    if bcrypt.checkpw(password_bytes, existing_hash.encode('utf-8')):
        print("✅ Existing hash verification SUCCESSFUL")
        print("   The database hash is correct!")
    else:
        print("❌ Existing hash verification FAILED")
        print("   The database hash needs to be updated!")
except Exception as e:
    print(f"❌ Error verifying existing hash: {e}")

print("\n" + "=" * 80)
print("SQL UPDATE STATEMENT")
print("=" * 80)
print(f"""
UPDATE proj_b2d90696.app_users 
SET 
    password_hash = '{hash_str}',
    updated_at = NOW()
WHERE email = 'admin@artfully.in';
""")
print("=" * 80)
