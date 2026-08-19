import asyncio
from app.zendbx_client import db

async def check_data():
    print('=== Checking Enrollments Table ===')
    enrollments = await db.select('enrollments', columns='id, student_id, student_first_name, student_last_name, batch_ids, status')
    print(f'Found {len(enrollments) if enrollments else 0} enrollments')
    if enrollments:
        for e in enrollments:
            print(f'\nEnrollment:')
            print(f'  Student: {e.get("student_first_name")} {e.get("student_last_name")}')
            print(f'  Student ID: {e.get("student_id")}')
            print(f'  Batch IDs: {e.get("batch_ids")}')
            print(f'  Status: {e.get("status")}')
    
    print('\n=== Checking Batches Table ===')
    batches = await db.select('batches', columns='id, name')
    print(f'Found {len(batches) if batches else 0} batches')
    if batches:
        for b in batches:
            print(f'  Batch: {b.get("name")} (ID: {b.get("id")})')
    
    print('\n=== Testing Enrollment Filter ===')
    if enrollments and batches:
        test_batch_id = batches[0]['id']
        print(f'Testing with batch ID: {test_batch_id}')
        
        matching = []
        for enrollment in enrollments:
            batch_ids = enrollment.get('batch_ids')
            status = enrollment.get('status')
            print(f'\nChecking enrollment:')
            print(f'  batch_ids: {batch_ids}')
            print(f'  batch_ids type: {type(batch_ids)}')
            print(f'  status: {status}')
            print(f'  test_batch_id: {test_batch_id}')
            print(f'  test_batch_id type: {type(test_batch_id)}')
            
            if batch_ids:
                print(f'  Is test_batch_id in batch_ids? {test_batch_id in batch_ids}')
                print(f'  Is str(test_batch_id) in batch_ids? {str(test_batch_id) in batch_ids}')
            
            if (batch_ids and test_batch_id in batch_ids and status == 'ACTIVE'):
                matching.append(enrollment)
                print('  ✅ MATCH!')
            else:
                print('  ❌ NO MATCH')
        
        print(f'\n=== Results: {len(matching)} matching enrollments ===')

asyncio.run(check_data())
