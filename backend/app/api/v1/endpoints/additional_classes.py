"""
Additional Classes Management API
Allows admin to assign students to batches beyond their regular enrollment
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from app.auth.deps import require_admin
from app.zendbx_client import db

router = APIRouter()
logger = logging.getLogger(__name__)


class AdditionalClassAssignment(BaseModel):
    """Additional class assignment model"""
    id: str
    student_id: str
    student_first_name: str
    student_last_name: str
    batch_id: str
    batch_name: str
    batch_day: str
    batch_time: str
    assigned_at: datetime
    notes: Optional[str] = None


class AssignAdditionalClassRequest(BaseModel):
    """Request to assign student to additional class"""
    student_id: str  # Student ID code (e.g., 'STU26268836')
    batch_id: str
    notes: Optional[str] = None


class AssignAdditionalClassResponse(BaseModel):
    """Response after assigning additional class"""
    success: bool
    assignment_id: str
    message: str


class BatchStudentsList(BaseModel):
    """Student in a batch with additional class indicator"""
    student_id: str
    first_name: str
    last_name: str
    is_additional_class: bool


@router.get("/assignments", response_model=List[AdditionalClassAssignment])
async def get_all_additional_class_assignments(
    current_user: dict = Depends(require_admin)
):
    """
    Get all additional class assignments
    
    Returns list of students assigned to batches as additional classes.
    **Security:** Requires ADMIN role
    """
    try:
        logger.info(f"Admin {current_user['id']} fetching all additional class assignments")
        
        # Get all active additional class assignments
        try:
            assignments = await db.select(
                'additional_classes',
                filters={'is_active': True}
            )
        except Exception as db_error:
            logger.error(f"Database error fetching additional_classes: {str(db_error)}")
            # If table doesn't exist yet, return empty list
            if 'does not exist' in str(db_error).lower() or 'relation' in str(db_error).lower():
                logger.warning("additional_classes table does not exist yet - returning empty list")
                return []
            raise
        
        if not assignments:
            return []
        
        # Get unique student IDs and batch IDs
        student_ids = list(set([a['student_id'] for a in assignments]))
        batch_ids = list(set([a['batch_id'] for a in assignments]))
        
        # Fetch student details from enrollments table
        enrollments = await db.select(
            'enrollments',
            columns='student_id,student_first_name,student_last_name'
        )
        
        # Create student lookup
        student_lookup = {
            e['student_id']: {
                'first_name': e['student_first_name'],
                'last_name': e['student_last_name']
            }
            for e in enrollments
        }
        
        # Fetch batch details
        batches = await db.select(
            'batches',
            columns='id,name,day_of_week,start_time,end_time'
        )
        
        # Create batch lookup
        batch_lookup = {
            b['id']: {
                'name': b['name'],
                'day': b['day_of_week'],
                'time': f"{b['start_time']} - {b['end_time']}"
            }
            for b in batches
        }
        
        # Combine data
        result = []
        for assignment in assignments:
            student_info = student_lookup.get(assignment['student_id'])
            batch_info = batch_lookup.get(assignment['batch_id'])
            
            if student_info and batch_info:
                result.append(AdditionalClassAssignment(
                    id=assignment['id'],
                    student_id=assignment['student_id'],
                    student_first_name=student_info['first_name'],
                    student_last_name=student_info['last_name'],
                    batch_id=assignment['batch_id'],
                    batch_name=batch_info['name'],
                    batch_day=batch_info['day'],
                    batch_time=batch_info['time'],
                    assigned_at=assignment['assigned_at'],
                    notes=assignment.get('notes')
                ))
        
        logger.info(f"Returning {len(result)} additional class assignments")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching additional class assignments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch additional class assignments: {str(e)}"
        )


@router.post("/assign", response_model=AssignAdditionalClassResponse)
async def assign_additional_class(
    request: AssignAdditionalClassRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Assign a student to a batch as additional class
    
    **Security:** Requires ADMIN role
    **Validation:**
    - Student must exist
    - Batch must exist and be active
    - Prevents duplicate assignments
    """
    try:
        logger.info(f"Admin {current_user['id']} assigning student {request.student_id} to batch {request.batch_id}")
        
        # Validate student exists in enrollments
        enrollments = await db.select(
            'enrollments',
            filters={'student_id': request.student_id}
        )
        
        if not enrollments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student {request.student_id} not found"
            )
        
        # Validate batch exists and is active
        batches = await db.select(
            'batches',
            filters={'id': request.batch_id, 'is_active': True}
        )
        
        if not batches:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch {request.batch_id} not found or inactive"
            )
        
        batch = batches[0]
        
        # Check if assignment already exists
        existing = await db.select(
            'additional_classes',
            filters={
                'student_id': request.student_id,
                'batch_id': request.batch_id,
                'is_active': True
            }
        )
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student is already assigned to this batch as additional class"
            )
        
        # Create assignment
        assignment_data = {
            'student_id': request.student_id,
            'batch_id': request.batch_id,
            'assigned_by': current_user['id'],
            'notes': request.notes,
            'is_active': True
        }
        
        result = await db.insert('additional_classes', assignment_data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create assignment"
            )
        
        assignment_id = result[0]['id']
        
        logger.info(f"Successfully assigned student {request.student_id} to batch {batch['name']}")
        
        return AssignAdditionalClassResponse(
            success=True,
            assignment_id=assignment_id,
            message=f"Student assigned to {batch['name']} as additional class"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning additional class: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign additional class: {str(e)}"
        )


@router.delete("/assignments/{assignment_id}")
async def remove_additional_class_assignment(
    assignment_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Remove an additional class assignment
    
    **Security:** Requires ADMIN role
    """
    try:
        logger.info(f"Admin {current_user['id']} removing assignment {assignment_id}")
        
        # Verify assignment exists
        assignments = await db.select(
            'additional_classes',
            filters={'id': assignment_id}
        )
        
        if not assignments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment {assignment_id} not found"
            )
        
        # Soft delete - set is_active to false
        await db.update(
            'additional_classes',
            data={'is_active': False, 'updated_at': datetime.utcnow().isoformat()},
            filters={'id': assignment_id}
        )
        
        logger.info(f"Successfully removed assignment {assignment_id}")
        
        return {
            'success': True,
            'message': 'Additional class assignment removed'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove assignment: {str(e)}"
        )


@router.get("/batches/{batch_id}/students", response_model=List[BatchStudentsList])
async def get_batch_students_with_additional(
    batch_id: str
):
    """
    Get all students in a batch, including additional class students
    
    Returns regular enrolled students + additional class students with a flag.
    Used by staff portal to show complete student list.
    """
    try:
        logger.info(f"Fetching students for batch {batch_id}")
        
        # Get regular students (those who have this batch in their batch_ids array)
        enrollments = await db.select(
            'enrollments',
            filters={'status': 'ACTIVE'}
        )
        
        regular_students = []
        if enrollments:
            for enrollment in enrollments:
                batch_ids = enrollment.get('batch_ids') or []
                if batch_id in batch_ids:
                    regular_students.append({
                        'student_id': enrollment['student_id'],
                        'first_name': enrollment['student_first_name'],
                        'last_name': enrollment['student_last_name'],
                        'is_additional_class': False
                    })
        
        # Get additional class students
        additional_assignments = await db.select(
            'additional_classes',
            filters={'batch_id': batch_id, 'is_active': True}
        )
        
        additional_students = []
        if additional_assignments:
            # Get student details
            student_ids = [a['student_id'] for a in additional_assignments]
            
            # Fetch from enrollments
            all_enrollments = await db.select('enrollments')
            enrollment_lookup = {e['student_id']: e for e in all_enrollments}
            
            for assignment in additional_assignments:
                student = enrollment_lookup.get(assignment['student_id'])
                if student:
                    # Only add if not already in regular students
                    if assignment['student_id'] not in [s['student_id'] for s in regular_students]:
                        additional_students.append({
                            'student_id': student['student_id'],
                            'first_name': student['student_first_name'],
                            'last_name': student['student_last_name'],
                            'is_additional_class': True
                        })
        
        # Combine and return
        all_students = regular_students + additional_students
        
        logger.info(f"Batch {batch_id}: {len(regular_students)} regular, {len(additional_students)} additional class students")
        
        return [BatchStudentsList(**s) for s in all_students]
        
    except Exception as e:
        logger.error(f"Error fetching batch students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch students: {str(e)}"
        )
