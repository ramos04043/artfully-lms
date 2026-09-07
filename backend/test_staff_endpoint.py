"""
Test staff endpoint to see student counts
"""
import asyncio
from app.zendbx_client import db

async def test_staff_batches():
    print("=" * 60)
    print("TESTING STAFF BATCHES ENDPOINT LOGIC")
    print("=" * 60)
    
    # Simulate what the endpoint does
    # Get Thursday Batch 3
    batch_id = '59f0d3f1-546f-4d14-9113-6aa2c98bffbf'  # Thursday Batch 3
    
    print(f"\n1. Checking Thursday Batch 3 (ID: {batch_id})")
    
    # Get all enrollments
    all_enrollments = await db.select(
        'enrollments',
        columns='id, student_id, batch_ids, status'
    )
    
    print(f"   Total enrollments: {len(all_enrollments)}")
    
    # Count regular enrollments
    enrollments_with_batch = []
    if all_enrollments:
        for enrollment in all_enrollments:
            if (enrollment.get('batch_ids') and 
                batch_id in enrollment['batch_ids'] and
                enrollment.get('status') == 'ACTIVE'):
                enrollments_with_batch.append(enrollment['student_id'])
                print(f"   Regular: {enrollment['student_id']}")
    
    print(f"\n   Regular students: {len(enrollments_with_batch)}")
    
    # Get additional class students
    additional_students = await db.select(
        'additional_classes',
        columns='student_id',
        filters={'batch_id': batch_id, 'is_active': True}
    )
    
    print(f"   Additional class records: {len(additional_students) if additional_students else 0}")
    
    if additional_students:
        for additional in additional_students:
            student_id = additional['student_id']
            print(f"   Checking additional student: {student_id}")
            
            if student_id not in enrollments_with_batch:
                # Verify student is active
                student_enrollment = next(
                    (e for e in all_enrollments if e['student_id'] == student_id and e['status'] == 'ACTIVE'),
                    None
                )
                if student_enrollment:
                    enrollments_with_batch.append(student_id)
                    print(f"   ✅ Added {student_id} as additional class student")
                else:
                    print(f"   ❌ {student_id} not found or not active")
            else:
                print(f"   ⚠️  {student_id} already in regular students")
    
    print(f"\n   TOTAL students (regular + additional): {len(enrollments_with_batch)}")
    print(f"   Student IDs: {enrollments_with_batch}")
    
    # Now check Monday Batch 2
    batch_id_2 = '799102d5-cd14-407d-b053-bbd2243e8ae1'  # Monday Batch 2
    
    print(f"\n2. Checking Monday Batch 2 (ID: {batch_id_2})")
    
    enrollments_with_batch_2 = []
    if all_enrollments:
        for enrollment in all_enrollments:
            if (enrollment.get('batch_ids') and 
                batch_id_2 in enrollment['batch_ids'] and
                enrollment.get('status') == 'ACTIVE'):
                enrollments_with_batch_2.append(enrollment['student_id'])
                print(f"   Regular: {enrollment['student_id']}")
    
    print(f"\n   Regular students: {len(enrollments_with_batch_2)}")
    
    additional_students_2 = await db.select(
        'additional_classes',
        columns='student_id',
        filters={'batch_id': batch_id_2, 'is_active': True}
    )
    
    print(f"   Additional class records: {len(additional_students_2) if additional_students_2 else 0}")
    
    if additional_students_2:
        for additional in additional_students_2:
            student_id = additional['student_id']
            print(f"   Checking additional student: {student_id}")
            
            if student_id not in enrollments_with_batch_2:
                student_enrollment = next(
                    (e for e in all_enrollments if e['student_id'] == student_id and e['status'] == 'ACTIVE'),
                    None
                )
                if student_enrollment:
                    enrollments_with_batch_2.append(student_id)
                    print(f"   ✅ Added {student_id} as additional class student")
                else:
                    print(f"   ❌ {student_id} not found or not active")
    
    print(f"\n   TOTAL students (regular + additional): {len(enrollments_with_batch_2)}")
    print(f"   Student IDs: {enrollments_with_batch_2}")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    asyncio.run(test_staff_batches())
