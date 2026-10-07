"""
Admin Attendance Endpoints
Allows admins to manually mark attendance for students
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.zendbx_client import db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class AttendanceRecord(BaseModel):
    student_id: str
    status: str  # 'PRESENT' or 'ABSENT'


class AdminAttendanceRequest(BaseModel):
    class_date: date
    attendance: List[AttendanceRecord]
    marked_by: str = 'admin'


@router.post("/admin/batches/{batch_id}/attendance")
async def submit_admin_attendance(
    batch_id: UUID,
    attendance_data: AdminAttendanceRequest
):
    """
    Submit bulk attendance for a batch (Admin only)
    
    Admins can mark attendance for any batch without validation restrictions.
    This endpoint allows manual attendance entry for past dates or corrections.
    """
    try:
        class_date = attendance_data.class_date
        attendance_records = attendance_data.attendance
        
        if not attendance_records:
            raise HTTPException(status_code=400, detail="No attendance records provided")
        
        # Get batch info
        batch = await db.select(
            'batches',
            columns='id, name',
            filters={'id': str(batch_id)},
            limit=1
        )
        
        if not batch or len(batch) == 0:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        batch_data = batch[0]
        logger.info(f"Admin marking attendance for batch {batch_data['name']} on {class_date}")
        
        marked_count = 0
        present_count = 0
        absent_count = 0
        errors = []
        
        # Process each attendance record
        for record in attendance_records:
            student_id = record.student_id
            status = record.status
            
            # Validate status
            if status not in ['PRESENT', 'ABSENT']:
                errors.append(f"Invalid status '{status}' for student {student_id}")
                continue
            
            try:
                # Check for existing attendance
                existing = await db.select(
                    'attendance',
                    columns='id, status',
                    filters={
                        'student_id': student_id,
                        'batch_id': str(batch_id),
                        'class_date': class_date.isoformat()
                    },
                    limit=1
                )
                
                if existing and len(existing) > 0:
                    # Update existing record
                    await db.update(
                        'attendance',
                        data={
                            'status': status
                        },
                        filters={'id': existing[0]['id']}
                    )
                    logger.info(f"✅ Updated attendance for {student_id}: {status}")
                else:
                    # Insert new record - session_id is nullable
                    insert_data = {
                        'student_id': student_id,
                        'batch_id': str(batch_id),
                        'class_date': class_date.isoformat(),
                        'status': status
                    }
                    
                    logger.info(f"📝 Inserting attendance: {insert_data}")
                    result = await db.insert('attendance', insert_data)
                    logger.info(f"✅ Created attendance for {student_id}: {status}, result: {result}")
                
                marked_count += 1
                if status == 'PRESENT':
                    present_count += 1
                elif status == 'ABSENT':
                    absent_count += 1
                    
            except Exception as e:
                logger.error(f"Error marking attendance for {student_id}: {str(e)}")
                errors.append(f"Failed to mark {student_id}: {str(e)}")
        
        response = {
            "message": f"Attendance saved successfully for {batch_data['name']}",
            "batch_id": str(batch_id),
            "batch_name": batch_data['name'],
            "class_date": class_date.isoformat(),
            "marked_count": marked_count,
            "present_count": present_count,
            "absent_count": absent_count
        }
        
        if errors:
            response["errors"] = errors
            response["message"] += f" (with {len(errors)} errors)"
        
        logger.info(f"Attendance submission complete: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting admin attendance: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save attendance: {str(e)}"
        )


@router.get("/admin/batches/{batch_id}/students")
async def get_batch_students(
    batch_id: UUID
):
    """
    Get all students enrolled in a specific batch
    """
    try:
        # Get all enrollments
        all_enrollments = await db.select(
            'enrollments',
            columns='student_id, student_first_name, student_last_name, status',
            filters={'status': 'ACTIVE'}
        )
        
        # Return all students (admin can mark anyone in any batch)
        batch_students = []
        if all_enrollments:
            for enrollment in all_enrollments:
                full_name = f"{enrollment['student_first_name']} {enrollment['student_last_name']}"
                batch_students.append({
                    'student_id': enrollment['student_id'],
                    'student_name': full_name,
                    'student_ref_id': enrollment['student_id']
                })
        
        return {
            "batch_id": str(batch_id),
            "students": batch_students,
            "count": len(batch_students)
        }
        
    except Exception as e:
        logger.error(f"Error getting batch students: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get students: {str(e)}"
        )


@router.get("/admin/students-for-attendance")
async def get_students_for_attendance(
    batch_id: Optional[str] = Query(None, description="Filter by batch ID, or omit for all batches")
):
    """
    Get all active students with their batch enrollments for attendance marking
    Returns students from enrollment table, optionally filtered by batch
    """
    try:
        # Get all enrollments - avoid selecting batch_ids array column
        # Query without any filters to avoid 500 errors with boolean or array filters
        all_enrollments = await db.select(
            'enrollments',
            columns='student_id, student_first_name, student_last_name, status, batch_ids',
            limit=1000
        )
        
        if not all_enrollments:
            logger.info("No enrollments found")
            return []
        
        # Filter active enrollments in memory
        active_enrollments = [e for e in all_enrollments if e.get('status') == 'ACTIVE']
        
        if not active_enrollments:
            logger.info("No active enrollments found")
            return []
        
        logger.info(f"Found {len(active_enrollments)} active enrollments from {len(all_enrollments)} total")
        
        # Get batch info
        if batch_id:
            # Get all batches
            batch_result = await db.select(
                'batches',
                columns='id, name, is_active'
            )
            
            # Filter to find the requested batch
            batch_info = None
            if batch_result:
                for b in batch_result:
                    if b.get('id') == batch_id:
                        # Check if active - handle various truthy values
                        is_active = b.get('is_active')
                        if is_active in (True, 'true', 't', 1, '1'):
                            batch_info = b
                        break
            
            if not batch_info:
                logger.warning(f"Batch {batch_id} not found or not active")
                raise HTTPException(status_code=404, detail="Batch not found or not active")
            
            batch_name = batch_info['name']
            
            # Return students enrolled in this specific batch
            result = []
            for enrollment in active_enrollments:
                # Check if student is enrolled in this batch
                student_batch_ids = enrollment.get('batch_ids', []) or []
                if batch_id in student_batch_ids:
                    full_name = f"{enrollment['student_first_name']} {enrollment['student_last_name'] or ''}".strip()
                    result.append({
                        'student_id': enrollment['student_id'],
                        'student_name': full_name,
                        'student_ref_id': enrollment['student_id'],
                        'batch_id': batch_id,
                        'batch_name': batch_name
                    })
            
            # Sort by student_id for consistent ordering
            result.sort(key=lambda x: x['student_id'])
            
            logger.info(f"Returning {len(result)} students for batch {batch_name}")
            return result
        else:
            # Get all batches - include is_active column to filter in memory
            all_batches = await db.select(
                'batches',
                columns='id, name, is_active'
            )
            
            if not all_batches:
                logger.info("No batches found")
                return []
            
            logger.info(f"Found {len(all_batches)} total batches")
            
            # Filter active batches in memory - handle various truthy values
            active_batches = []
            for b in all_batches:
                is_active = b.get('is_active')
                # Handle True, true, 'true', 1, etc.
                if is_active in (True, 'true', 't', 1, '1'):
                    active_batches.append(b)
            
            if not active_batches:
                logger.warning(f"No active batches found. Sample batch: {all_batches[0] if all_batches else 'none'}")
                return []
            
            logger.info(f"Found {len(active_batches)} active batches")
            
            # Create batch map
            batch_map = {b['id']: b['name'] for b in active_batches}
            
            # Build result - one record per student per batch
            result = []
            for enrollment in active_enrollments:
                student_batch_ids = enrollment.get('batch_ids', []) or []
                full_name = f"{enrollment['student_first_name']} {enrollment['student_last_name'] or ''}".strip()
                
                # Create entry for each batch the student is enrolled in
                for student_batch_id in student_batch_ids:
                    if student_batch_id in batch_map:
                        result.append({
                            'student_id': enrollment['student_id'],
                            'student_name': full_name,
                            'student_ref_id': enrollment['student_id'],
                            'batch_id': student_batch_id,
                            'batch_name': batch_map[student_batch_id]
                        })
            
            # Sort by student_id then batch_name for consistent ordering
            result.sort(key=lambda x: (x['student_id'], x['batch_name']))
            
            logger.info(f"Returning {len(result)} student-batch records from enrollments")
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting students for attendance: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get students: {str(e)}"
        )
