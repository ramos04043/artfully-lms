"""
Admin Attendance Endpoints
Allows admins to manually mark attendance for students
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.zendbx_client import db
from app.auth.deps import require_admin
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
    attendance_data: AdminAttendanceRequest,
    current_user: dict = Depends(require_admin)
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
    batch_id: UUID,
    current_user: dict = Depends(require_admin)
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
    batch_id: Optional[str] = Query(None, description="Filter by batch ID, or omit for all batches"),
    current_user: dict = Depends(require_admin)
):
    """
    Get all active students with their batch enrollments for attendance marking
    Returns students from enrollment table, optionally filtered by batch
    """
    try:
        # Get all active enrollments - avoid selecting batch_ids array column
        # Order by student_id for consistent ordering (ART1001, ART1002, etc.)
        all_enrollments = await db.select(
            'enrollments',
            columns='student_id, student_first_name, student_last_name, status',
            filters={'status': 'ACTIVE'},
            order_by='student_id.asc',
            limit=1000
        )
        
        if not all_enrollments:
            logger.info("No active enrollments found")
            return []
        
        logger.info(f"Found {len(all_enrollments)} active enrollments")
        
        # Get batch info
        if batch_id:
            # Get specific batch
            batch_result = await db.select(
                'batches',
                columns='id, name',
                filters={'id': batch_id, 'is_active': True},
                limit=1
            )
            
            if not batch_result:
                raise HTTPException(status_code=404, detail="Batch not found")
            
            batch_name = batch_result[0]['name']
            
            # Return all students for this batch (ordered by student_id)
            result = []
            for enrollment in all_enrollments:
                full_name = f"{enrollment['student_first_name']} {enrollment['student_last_name']}"
                result.append({
                    'student_id': enrollment['student_id'],
                    'student_name': full_name,
                    'student_ref_id': enrollment['student_id'],
                    'batch_id': batch_id,
                    'batch_name': batch_name
                })
            
            logger.info(f"Returning {len(result)} students for batch {batch_name}")
            return result
        else:
            # Get all batches
            all_batches = await db.select(
                'batches',
                columns='id, name',
                filters={'is_active': True}
            )
            
            if not all_batches:
                logger.info("No active batches found")
                return []
            
            logger.info(f"Found {len(all_batches)} active batches")
            
            # For "All Batches", get student-batch pairs from recent attendance
            recent_attendance = await db.select(
                'attendance',
                columns='student_id, batch_id',
                order_by='class_date.desc',
                limit=2000
            )
            
            # Create a set of unique student-batch pairs
            student_batch_pairs = set()
            if recent_attendance:
                for att in recent_attendance:
                    student_batch_pairs.add((att['student_id'], att['batch_id']))
            
            logger.info(f"Found {len(student_batch_pairs)} student-batch pairs from attendance history")
            
            # Create batch map
            batch_map = {b['id']: b['name'] for b in all_batches}
            
            # Create student map
            student_map = {
                s['student_id']: {
                    'student_name': f"{s['student_first_name']} {s['student_last_name']}",
                    'student_ref_id': s['student_id']
                }
                for s in all_enrollments
            }
            
            # Build result from attendance history
            result = []
            for student_id, batch_id in student_batch_pairs:
                if student_id in student_map and batch_id in batch_map:
                    result.append({
                        'student_id': student_id,
                        'student_name': student_map[student_id]['student_name'],
                        'student_ref_id': student_map[student_id]['student_ref_id'],
                        'batch_id': batch_id,
                        'batch_name': batch_map[batch_id]
                    })
            
            # Sort by student_id for consistent ordering (ART1001, ART1002, etc.)
            result.sort(key=lambda x: x['student_id'])
            
            logger.info(f"Returning {len(result)} student-batch records from attendance history")
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting students for attendance: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get students: {str(e)}"
        )
