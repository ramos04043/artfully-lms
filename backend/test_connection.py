#!/usr/bin/env python3
"""
Test ZendBX connection and environment configuration
Run this to diagnose backend 500 errors
"""
import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_env_vars():
    """Check if required environment variables are set"""
    print("=" * 80)
    print("ENVIRONMENT VARIABLES CHECK")
    print("=" * 80)
    
    required_vars = [
        'SECRET_KEY',
        'ZENDBX_URL',
        'ZENDBX_ANON_KEY',
        'ZENDBX_SERVICE_KEY',
    ]
    
    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
            print(f"❌ {var}: NOT SET")
        else:
            # Mask sensitive values
            if 'KEY' in var or 'SECRET' in var:
                masked = value[:10] + "..." + value[-10:] if len(value) > 20 else "***"
                print(f"✅ {var}: {masked}")
            else:
                print(f"✅ {var}: {value}")
    
    if missing:
        print(f"\n❌ Missing required variables: {', '.join(missing)}")
        return False
    else:
        print("\n✅ All required environment variables are set")
        return True


async def test_zendbx_connection():
    """Test connection to ZendBX API"""
    print("\n" + "=" * 80)
    print("ZENDBX CONNECTION TEST")
    print("=" * 80)
    
    zendbx_url = os.getenv('ZENDBX_URL')
    service_key = os.getenv('ZENDBX_SERVICE_KEY')
    
    if not zendbx_url or not service_key:
        print("❌ Cannot test - missing ZENDBX_URL or ZENDBX_SERVICE_KEY")
        return False
    
    # Extract project slug from service key
    try:
        import json
        import base64
        
        parts = service_key.split('.')
        if len(parts) >= 2:
            payload = parts[1]
            payload += '=' * (4 - len(payload) % 4)
            decoded = base64.b64decode(payload)
            data = json.loads(decoded)
            project_slug = data.get('project_slug', '')
            print(f"📦 Project Slug: {project_slug}")
            
            # Test API endpoint
            base_url = f"{zendbx_url}/p/{project_slug}/v1/rest"
            test_url = f"{base_url}/programmes"
            
            print(f"🔗 Testing URL: {test_url}")
            
            headers = {
                'Content-Type': 'application/json',
                'apikey': service_key,
                'Authorization': f'Bearer {service_key}'
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    test_url,
                    headers=headers,
                    timeout=10.0
                )
                
                print(f"📡 Response Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Connection successful! Retrieved {len(data)} programmes")
                    return True
                else:
                    print(f"❌ Request failed: {response.status_code}")
                    print(f"Response: {response.text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Connection test failed: {str(e)}")
        return False


async def test_specific_tables():
    """Test access to specific tables that are failing"""
    print("\n" + "=" * 80)
    print("TABLE ACCESS TEST")
    print("=" * 80)
    
    zendbx_url = os.getenv('ZENDBX_URL')
    service_key = os.getenv('ZENDBX_SERVICE_KEY')
    
    if not zendbx_url or not service_key:
        print("❌ Cannot test - missing connection info")
        return
    
    # Extract project slug
    import json
    import base64
    
    parts = service_key.split('.')
    payload = parts[1]
    payload += '=' * (4 - len(payload) % 4)
    decoded = base64.b64decode(payload)
    data = json.loads(decoded)
    project_slug = data.get('project_slug', '')
    
    base_url = f"{zendbx_url}/p/{project_slug}/v1/rest"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    # First, try to list all available tables/views
    print("\n🔍 Attempting to discover all tables...")
    
    # Tables to test
    tables = [
        'programmes',
        'batches',
        'sessions',
        'enrollments',
        'fee_due',
        'fee_dues',
        'fees',
        'payments',
        'attendance',
        'students',
        'staff',
        'users',
    ]
    
    async with httpx.AsyncClient() as client:
        print("\n📋 Testing specific tables:")
        for table in tables:
            try:
                url = f"{base_url}/{table}"
                response = await client.get(
                    url,
                    headers=headers,
                    params={'limit': '1'},
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ {table}: OK ({len(data)} records)")
                else:
                    print(f"❌ {table}: Failed ({response.status_code})")
                    if response.status_code == 404:
                        print(f"   → Table/View does not exist in database")
                    elif response.status_code == 500:
                        print(f"   → Server error - may be a view issue")
                    
            except Exception as e:
                print(f"❌ {table}: Error - {str(e)}")


async def main():
    """Run all diagnostic tests"""
    print("\n🔍 Backend Diagnostic Tool")
    print("=" * 80)
    
    # Check environment variables
    env_ok = check_env_vars()
    
    if not env_ok:
        print("\n⚠️  Fix missing environment variables before continuing")
        return
    
    # Test ZendBX connection
    conn_ok = await test_zendbx_connection()
    
    if not conn_ok:
        print("\n⚠️  ZendBX connection failed - check credentials")
        return
    
    # Test specific tables
    await test_specific_tables()
    
    print("\n" + "=" * 80)
    print("DIAGNOSTIC COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
