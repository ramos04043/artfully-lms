"""
Test script to verify users table access through ZendBX REST API
"""
import httpx
import asyncio
from pprint import pprint

ZENDBX_URL = "https://api.zendbx.in"
PROJECT_SLUG = "artfully-database"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6ZW5kYngiLCJwcm9qZWN0X2lkIjoiNjQ2NDhiMWYtMjAxYi00OTZiLWFiOTgtNDJmMjQ2NWYzOGMwIiwicHJvamVjdF9zbHVnIjoiYXJ0ZnVsbHktZGF0YWJhc2UiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzkwODQ0NzQ4fQ.zCrx1Mj5pXYidC2qVXKLukKVaChN615YjROqmC0UEt4"


async def test_users_access():
    """Test different ways to access users table"""
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}'
    }
    
    tests = [
        {
            "name": "Query app_users table",
            "url": f"{ZENDBX_URL}/p/{PROJECT_SLUG}/v1/rest/app_users",
            "params": {
                "select": "id,username,email,password_hash",
                "email": "eq.admin@artfully.in"
            }
        },
        {
            "name": "Query app_users table (all columns)",
            "url": f"{ZENDBX_URL}/p/{PROJECT_SLUG}/v1/rest/app_users",
            "params": {
                "select": "*",
                "email": "eq.admin@artfully.in"
            }
        },
        {
            "name": "List all app_users (no filter)",
            "url": f"{ZENDBX_URL}/p/{PROJECT_SLUG}/v1/rest/app_users",
            "params": {
                "select": "id,username,email"
            }
        }
    ]
    
    async with httpx.AsyncClient() as client:
        for test in tests:
            print(f"\n{'='*80}")
            print(f"TEST: {test['name']}")
            print(f"URL: {test['url']}")
            print(f"Params: {test['params']}")
            print(f"{'='*80}")
            
            try:
                response = await client.get(
                    test['url'],
                    params=test['params'],
                    headers=headers,
                    timeout=30.0
                )
                
                print(f"Status: {response.status_code}")
                print(f"Response Headers:")
                pprint(dict(response.headers))
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"\n✅ SUCCESS - Got {len(data)} rows")
                    if data:
                        print("First row:")
                        pprint(data[0])
                else:
                    print(f"\n❌ FAILED - Status {response.status_code}")
                    print(f"Response: {response.text}")
                    
            except Exception as e:
                print(f"\n❌ EXCEPTION: {type(e).__name__}: {str(e)}")


if __name__ == "__main__":
    print("Testing ZendBX app_users table access...")
    asyncio.run(test_users_access())
