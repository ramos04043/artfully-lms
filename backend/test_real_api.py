"""
Test the REAL API endpoints to see what they return
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

print("=" * 70)
print("TESTING REAL API ENDPOINTS")
print("=" * 70)

# Test 1: Get batch students for Thursday Batch 3
print("\n1. Testing /staff/batches/{batch_id}/students endpoint")
print("-" * 70)

batch_id = "59f0d3f1-546f-4d14-9113-6aa2c98bffbf"  # Thursday Batch 3
# Get a real user_id from staff table
user_id = "9cf7f1d4-e9e8-42d1-a1b6-85de73c42ddf"  # Replace with actual staff user_id

url = f"{BASE_URL}/staff/batches/{batch_id}/students?user_id={user_id}"
print(f"URL: {url}")

try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        students = data.get('students', [])
        print(f"\n✅ SUCCESS!")
        print(f"Total students returned: {len(students)}")
        print(f"\nStudents:")
        for student in students:
            tag = "🏷️ ADDITIONAL" if student.get('is_additional_class') else "REGULAR"
            print(f"  - {student['first_name']} {student['last_name']} ({student['student_id']}) [{tag}]")
    else:
        print(f"\n❌ ERROR:")
        print(response.text)
except Exception as e:
    print(f"\n❌ EXCEPTION: {e}")

# Test 2: Check the additional-classes API
print("\n\n2. Testing /additional-classes/assignments endpoint")
print("-" * 70)

url2 = f"{BASE_URL}/additional-classes/assignments"
print(f"URL: {url2}")

try:
    # Note: This requires authentication
    response2 = requests.get(url2)
    print(f"Status: {response2.status_code}")
    
    if response2.status_code == 401:
        print("⚠️  Requires authentication (expected)")
    elif response2.status_code == 200:
        assignments = response2.json()
        print(f"\n✅ SUCCESS!")
        print(f"Total assignments: {len(assignments)}")
        for a in assignments:
            print(f"  - {a['student_first_name']} {a['student_last_name']} → {a['batch_name']}")
    else:
        print(f"\n❌ ERROR:")
        print(response2.text)
except Exception as e:
    print(f"\n❌ EXCEPTION: {e}")

print("\n" + "=" * 70)
print("TESTING COMPLETE")
print("=" * 70)
print("\nIf Thursday Batch 3 shows 4 students with Pawan tagged as ADDITIONAL,")
print("then the backend is working correctly!")
print("\nIf not, the backend server may not have reloaded the changes.")
