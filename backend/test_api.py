"""
Quick test to check if additional_classes endpoint is available
Run this with: python test_api.py
"""
import requests

BASE_URL = "http://localhost:8000"

# Test if server is running
try:
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        print("✅ Backend server is running")
        print(f"   Response: {response.json()}")
    else:
        print(f"❌ Backend returned status {response.status_code}")
except Exception as e:
    print(f"❌ Cannot connect to backend: {e}")
    print("   Make sure the backend server is running on port 8000")
    exit(1)

# Test if additional_classes endpoint exists
try:
    response = requests.get(f"{BASE_URL}/api/v1/additional-classes/assignments")
    if response.status_code == 401:
        print("✅ Additional Classes endpoint exists (401 = needs authentication)")
    elif response.status_code == 200:
        print("✅ Additional Classes endpoint exists and returned data")
    elif response.status_code == 404:
        print("❌ Additional Classes endpoint NOT FOUND (404)")
        print("   The backend server needs to be restarted!")
        print("\n   Steps to fix:")
        print("   1. Go to your terminal where backend is running")
        print("   2. Press Ctrl+C to stop the server")
        print("   3. Run: python -m uvicorn app.main:app --reload --port 8000")
    else:
        print(f"⚠️  Unexpected status code: {response.status_code}")
except Exception as e:
    print(f"❌ Error testing endpoint: {e}")

# Check API docs
print("\n📚 To verify all endpoints, visit:")
print("   http://localhost:8000/docs")
print("   Look for 'Additional Classes' section")
