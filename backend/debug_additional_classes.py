"""
Debug script to check additional_classes data
"""
import asyncio
from app.zendbx_client import db

async def debug_additional_classes():
    print("=" * 60)
    print("DEBUGGING ADDITIONAL CLASSES")
    print("=" * 60)
    
    # 1. Check additional_classes table
    print("\n1. Checking additional_classes table...")
    additional = await db.select('additional_classes')
    print(f"   Found {len(additional) if additional else 0} records")
    if additional:
        for record in additional:
            print(f"   - Student: {record['student_id']}, Batch: {record['batch_id']}, Active: {record['is_active']}")
    else:
        print("   ⚠️ No records found!")
    
    # 2. Check enrollments for Pawan
    print("\n2. Checking enrollments for 'Pawan'...")
    enrollments = await db.select('enrollments', columns='student_id,student_first_name,student_last_name,status')
    pawan = [e for e in enrollments if 'pawan' in e['student_first_name'].lower() or 'pawan' in e['student_last_name'].lower()]
    if pawan:
        for p in pawan:
            print(f"   - ID: {p['student_id']}, Name: {p['student_first_name']} {p['student_last_name']}, Status: {p['status']}")
    else:
        print("   ⚠️ Pawan not found in enrollments!")
    
    # 3. Check batches
    print("\n3. Checking batch names...")
    batches = await db.select('batches', columns='id,name,day_of_week')
    thursday_batches = [b for b in batches if 'thursday' in b['day_of_week'].lower()]
    monday_batches = [b for b in batches if 'monday' in b['day_of_week'].lower()]
    
    print("   Thursday batches:")
    for b in thursday_batches:
        print(f"   - {b['name']} (ID: {b['id']})")
    
    print("   Monday batches:")
    for b in monday_batches:
        print(f"   - {b['name']} (ID: {b['id']})")
    
    # 4. Match additional classes to batch names
    if additional:
        print("\n4. Matching additional class assignments to batch names...")
        batch_lookup = {b['id']: b['name'] for b in batches}
        for record in additional:
            batch_name = batch_lookup.get(record['batch_id'], 'UNKNOWN')
            print(f"   - Student {record['student_id']} → {batch_name} (Active: {record['is_active']})")
    
    print("\n" + "=" * 60)
    print("DEBUG COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(debug_additional_classes())
