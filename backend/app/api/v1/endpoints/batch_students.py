"""
Batch Student Management API
Handles student batch assignments and transfers
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from app.zendbx_client import db

router = APIRouter()


class BatchStudentDetail(BaseModel):
    """Student details in a batch"""
    student_id: str  # UUID from students table
    student_code: str  # VARCHAR student_id like 'STU123'
    first_name: str
    last_name: str
    status: str
    enrollment_effective_from: date
    enrollment_id: str  # student_batches.id


class ChangeBatchRequest(BaseModel):
    """Request to change student's batch"""
    student_id: str  # UUID from students table
    current_batch_id: str
    new_batch_id: str
    effective_date: Optional[date] = None


@router.get("/batches/{batch_id}/students", response_model=List[BatchStudentDetail])
async def get_batch_students(batch_id: str):
    """
    Get all active students in a specific batch
    
    Returns students from students table who have active enrollment in student_batches
    """
    try:
        # Verify batch exists and is active
        batches = await db.select(
            'batches',
            filters={'id': batch_id, 'is_active': True}
        )
        
        if not batches:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch {batch_id} not found or inactive"
            )
        
        # Get all active student_batches for this batch
        enrollments = await db.select(
            'student_batches',
            filters={'batch_id': batch_id, 'is_active': True}
        )
        
        if not enrollments:
            return []
        
        # Get student details for all enrolled students
        student_ids = [e['student_id'] for e in enrollments]
        student_ids_str = ','.join(student_ids)
        
        students = await db.select(
            'students',
            filters={'id_in': student_ids_str}
        )
        
        # Create student lookup
        student_lookup = {s['id']: s for s in students}
        
        # Combine enrollment and student data
        result = []
        for enrollment in enrollments:
            student = student_lookup.get(enrollment['student_id'])
            if student:
                result.append(BatchStudentDetail(
                    student_id=student['id'],
                    student_code=student['student_id'],  # VARCHAR code like 'STU123'
                    first_name=student['first_name'],
                    last_name=student['last_name'],
                    status=student['status'],
                    enrollment_effective_from=enrollment['effective_from'],
                    enrollment_id=enrollment['id']
                ))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch students: {str(e)}"
        )


@router.patch("/students/{student_id}/change-batch")
async def change_student_batch(student_id: str, request: ChangeBatchRequest):
    """
    Change a student's batch assignment
    
    Business logic:
    1. Verify student exists and is active
    2. Verify current enrollment exists and is active
    3. Verify target batch exists and is active
    4. Check target batch capacity
    5. Prevent duplicate active enrollments
    6. Deactivate old enrollment (set is_active=false, effective_to=today)
    7. Create or reactivate new enrollment
    8. Preserve historical records
    """
    effective_date = request.effective_date or date.today()
    
    try:
        # 1. Verify student exists and is active
        students = await db.select(
            'students',
            filters={'id': student_id}
        )
        
        if not students:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student {student_id} not found"
            )
        
        student = students[0]
        
        if student['status'] not in ['ACTIVE', 'PAUSED']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot change batch for student with status: {student['status']}"
            )
        
        # 2. Verify current enrollment exists and is active
        current_enrollments = await db.select(
            'student_batches',
            filters={
                'student_id': student_id,
                'batch_id': request.current_batch_id,
                'is_active': True
            }
        )
        
        if not current_enrollments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active enrollment found for student in batch {request.current_batch_id}"
            )
        
        current_enrollment = current_enrollments[0]
        
        # 3. Prevent same batch selection
        if request.current_batch_id == request.new_batch_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is already in the selected batch"
            )
        
        # 4. Verify target batch exists and is active
        target_batches = await db.select(
            'batches',
            filters={'id': request.new_batch_id, 'is_active': True}
        )
        
        if not target_batches:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target batch {request.new_batch_id} not found or inactive"
            )
        
        target_batch = target_batches[0]
        
        # 5. Check target batch capacity
        target_enrollments = await db.select(
            'student_batches',
            columns='id',
            filters={'batch_id': request.new_batch_id, 'is_active': True}
        )
        
        current_count = len(target_enrollments)
        max_capacity = target_batch.get('max_capacity', 15)
        
        if current_count >= max_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target batch is full ({current_count}/{max_capacity})"
            )
        
        # 6. Check if student already has an enrollment in target batch
        existing_target_enrollments = await db.select(
            'student_batches',
            filters={'student_id': student_id, 'batch_id': request.new_batch_id}
        )
        
        # Filter to check for active enrollments
        active_target_enrollments = [e for e in existing_target_enrollments if e.get('is_active')]
        
        if active_target_enrollments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student already has an active enrollment in target batch"
            )
        
        # 7. Deactivate current enrollment
        deactivate_payload = {
            "is_active": False,
            "effective_to": effective_date.isoformat()
        }
        
        await db.update(
            'student_batches',
            data=deactivate_payload,
            filters={'id': current_enrollment['id']}
        )
        
        # 8. Create or reactivate enrollment in new batch
        if existing_target_enrollments:
            # Reactivate existing enrollment
            reactivate_enrollment = existing_target_enrollments[0]
            reactivate_payload = {
                "is_active": True,
                "effective_from": effective_date.isoformat(),
                "effective_to": None
            }
            
            new_enrollment = await db.update(
                'student_batches',
                data=reactivate_payload,
                filters={'id': reactivate_enrollment['id']}
            )
            new_enrollment = new_enrollment[0] if new_enrollment else reactivate_enrollment
        else:
            # Create new enrollment
            create_payload = {
                "student_id": student_id,
                "batch_id": request.new_batch_id,
                "effective_from": effective_date.isoformat(),
                "effective_to": None,
                "is_active": True
            }
            
            new_enrollment = await db.insert(
                'student_batches',
                data=create_payload
            )
            new_enrollment = new_enrollment[0]
        
        return {
            "success": True,
            "message": f"Successfully changed batch for {student['first_name']} {student['last_name']}",
            "student_id": student_id,
            "old_batch_id": request.current_batch_id,
            "new_batch_id": request.new_batch_id,
            "effective_date": effective_date.isoformat(),
            "new_enrollment_id": new_enrollment['id']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change batch: {str(e)}"
        )
