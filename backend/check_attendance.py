"""
Check if attendance for Pawan was saved
"""
import asyncio
from datetime import date
from app.zendbx_client import db

async def check_attendance():
    print("=" * 60)
    print("CHECKING ATTENDANCE FOR PAWAN (ART1048)")
    print("=" * 60)
    
    today = date.today().isoformat()
    print(f"\nToday's date: {today}")
    
    # Check all attendance records for ART1048
    print("\n1. All attendance records for ART1048:")
    attendance = await db.select(
        'attendance',
        filters={'student_id': 'ART1048'}
    )
    
    if attendance:
        print(f"   Found {len(attendance)} records:")
        for record in attendance:
            print(f"   - Date: {record['class_date']}, Batch: {record['batch_id']}, Status: {record['status']}")
    else:
        print("   ❌ No attendance records found!")
    
    # Check today's attendance for all batches
    print(f"\n2. Today's attendance ({today}) for ART1048:")
    today_attendance = [r for r in (attendance or []) if r['class_date'] == today]
    
    if today_attendance:
        print(f"   Found {len(today_attendance)} records today:")
        for record in today_attendance:
            # Get batch name
            batches = await db.select('batches', filters={'id': record['batch_id']})
            batch_name = batches[0]['name'] if batches else 'Unknown'
            print(f"   - Batch: {batch_name}, Status: {record['status']}")
    else:
        print("   ❌ No attendance records for today!")
    
    # Check Thursday Batch 3 and Monday Batch 2 specifically
    print("\n3. Checking specific batches:")
    thursday_batch_3 = "59f0d3f1-546f-4d14-9113-6aa2c98bffbf"
    monday_batch_2 = "799102d5-cd14-407d-b053-bbd2243e8ae1"
    
    for batch_id, batch_name in [(thursday_batch_3, "Thursday Batch 3"), (monday_batch_2, "Monday Batch 2")]:
        batch_attendance = await db.select(
            'attendance',
            filters={'student_id': 'ART1048', 'batch_id': batch_id, 'class_date': today}
        )
        if batch_attendance:
            print(f"   ✅ {batch_name}: {batch_attendance[0]['status']}")
        else:
            print(f"   ❌ {batch_name}: No record")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    asyncio.run(check_attendance())
