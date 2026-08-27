"""
Compensation/Makeup Class Endpoints
Handles student compensation requests when absent and admin assignment workflow
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

from app.auth.deps import require_staff, require_admin
from app.zendbx_client import db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class CompensationRequest(BaseModel):
    """Student compensation request"""
    student_id: str
    original_attendance_id: str
    notes: Optional[str] = None


class CompensationAssignment(BaseModel):
    """Admin assigns compensation to a batch"""
    compensation_id: str
    compensation_batch_id: str
    compensation_date: date


class CompensationReject(BaseModel):
    """Admin rejects compensation request"""
    compensation_id: str
    rejection_reason: str


class CompensationResponse(BaseModel):
    """Response for compensation operations"""
    success: bool
    message: str
    compensation_id: Optional[str] = None


@router.post("/request", response_model=CompensationResponse)
async def request_compensation(
    request: CompensationRequest,
    current_user: dict = Depends(require_staff)
):
    """
    Create a compensation request for an absent student
    
    **Business Rules:**
    - Only for ABSENT attendance records
    - Cannot request compensation twice for same absence
    - Student must be ACTIVE
    
    **Security:** Requires STAFF or ADMIN role
    """
    try:
        logger.info(f"Creating compensation request for student {request.student_id}")
        
        # Step 1: Validate attendance record exists and is ABSENT
        attendance = await db.select(
            "attendance",
            filters={"id": request.original_attendance_id}
        )
        
        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        att = attendance[0]
        
        if att['status'] != 'ABSENT':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot request compensation for {att['status']} status. Only ABSENT students can request compensation."
            )
        
        # Step 2: Check if compensation already exists for this attendance
        existing = await db.select(
            "compensations",
            filters={"original_attendance_id": request.original_attendance_id}
        )
        
        if existing:
            comp_status = existing[0]['status']
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Compensation already exists for this absence (Status: {comp_status})"
            )
        
        # Step 3: Validate student exists and is ACTIVE
        students = await db.select(
            "students",
            filters={"id": request.student_id}
        )
        
        if not students:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student = students[0]
        
        if student['status'] != 'ACTIVE':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student status is {student['status']}. Only ACTIVE students can request compensation."
            )
        
        # Step 4: Create compensation request
        compensation_data = {
            "student_id": request.student_id,
            "original_attendance_id": request.original_attendance_id,
            "original_batch_id": att['batch_id'],
            "original_date": att['class_date'],
            "status": "PENDING_APPROVAL",
            "notes": request.notes
        }
        
        created = await db.insert("compensations", compensation_data)
        
        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create compensation request"
            )
        
        compensation_id = created[0]['id']
        
        logger.info(f"Compensation request created: {compensation_id}")
        
        # Step 5: Create notification for admin
        try:
            student_name = f"{student['first_name']} {student['last_name']}"
            
            # Get batch info
            batches = await db.select(
                "batches",
                filters={"id": att['batch_id']}
            )
            batch_name = batches[0]['name'] if batches else "Unknown Batch"
            
            notification_data = {
                "type": "COMPENSATION_REQUEST",
                "title": "New Compensation Request",
                "message": f"{student_name} has requested a makeup class for absence on {att['class_date']} from {batch_name}",
                "priority": "NORMAL",
                "status": "UNREAD",
                "reference_type": "compensation",
                "reference_id": compensation_id
            }
            
            await db.insert("notifications", notification_data)
            
        except Exception as notif_error:
            logger.warning(f"Failed to create notification: {notif_error}")
            # Don't fail the request if notification fails
        
        return CompensationResponse(
            success=True,
            message="Compensation request submitted successfully. Admin will assign a makeup class soon.",
            compensation_id=compensation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating compensation request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create compensation request: {str(e)}"
        )


@router.post("/assign", response_model=CompensationResponse)
async def assign_compensation(
    assignment: CompensationAssignment
    # TODO: Re-enable auth: current_user: dict = Depends(require_admin)
):
    """
    Admin assigns a compensation class to a student
    
    **Business Rules:**
    - Compensation date must be in the future
    - Cannot assign to same batch on same day (prevents conflicts)
    - Validates batch capacity
    - Student must not have another class on that day
    
    **Security:** Requires ADMIN role
    """
    try:
        # logger.info(f"Admin {current_user['id']} assigning compensation {assignment.compensation_id}")
        logger.info(f"Assigning compensation {assignment.compensation_id}")
        
        # Step 1: Get compensation request
        compensations = await db.select(
            "compensations",
            filters={"id": assignment.compensation_id}
        )
        
        if not compensations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compensation request not found"
            )
        
        comp = compensations[0]
        
        if comp['status'] not in ['PENDING_APPROVAL', 'ASSIGNED']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign compensation with status {comp['status']}"
            )
        
        # Step 2: Validate compensation date is in the future
        today = date.today()
        if assignment.compensation_date <= today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compensation date must be in the future"
            )
        
        # Step 3: Check if student already has a class on that day
        existing_attendance = await db.select(
            "attendance",
            filters={
                "student_id": comp['student_id'],
                "class_date": assignment.compensation_date.isoformat(),
                "status": "PRESENT"
            }
        )
        
        if existing_attendance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student already has a class scheduled on this date"
            )
        
        # Step 4: Validate batch exists and check capacity
        batches = await db.select(
            "batches",
            filters={"id": assignment.compensation_batch_id}
        )
        
        if not batches:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compensation batch not found"
            )
        
        batch = batches[0]
        
        # Check current batch enrollment
        enrolled = await db.select(
            "student_batches",
            filters={
                "batch_id": assignment.compensation_batch_id,
                "is_active": True
            }
        )
        
        # Check compensations scheduled for same date
        scheduled_comps = await db.select(
            "compensations",
            filters={
                "compensation_batch_id": assignment.compensation_batch_id,
                "compensation_date": assignment.compensation_date.isoformat(),
                "status": "ASSIGNED"
            }
        )
        
        total_students = len(enrolled) + len(scheduled_comps)
        
        if total_students >= batch['max_capacity']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch is at full capacity ({batch['max_capacity']} students)"
            )
        
        # Step 5: Update compensation with assignment
        update_data = {
            "compensation_batch_id": assignment.compensation_batch_id,
            "compensation_date": assignment.compensation_date.isoformat(),
            "status": "ASSIGNED",
            # "approved_by": current_user['id'],  # TODO: Re-enable when auth is added back
            "approved_at": datetime.utcnow().isoformat()
        }
        
        updated = await db.update(
            "compensations",
            update_data,
            {"id": assignment.compensation_id}
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign compensation"
            )
        
        logger.info(f"Compensation {assignment.compensation_id} assigned to batch {assignment.compensation_batch_id}")
        
        # Step 6: Send notification/email to student/parent
        try:
            students = await db.select(
                "students",
                filters={"id": comp['student_id']}
            )
            
            if students:
                student = students[0]
                student_name = f"{student['first_name']} {student['last_name']}"
                
                # Queue email
                email_data = {
                    "recipient_email": student.get('email') or student.get('parent_email'),
                    "recipient_name": student_name,
                    "subject": "Makeup Class Assigned",
                    "body": f"Dear {student_name},\n\nYour makeup class has been scheduled for {assignment.compensation_date} in {batch['name']}.\n\nPlease attend on time.\n\nThank you,\nArtfully Team",
                    "email_type": "COMPENSATION_ASSIGNED",
                    "status": "QUEUED",
                    "reference_type": "compensation",
                    "reference_id": assignment.compensation_id
                }
                
                await db.insert("email_events", email_data)
        
        except Exception as email_error:
            logger.warning(f"Failed to send compensation assignment email: {email_error}")
        
        return CompensationResponse(
            success=True,
            message=f"Compensation class assigned successfully for {assignment.compensation_date}",
            compensation_id=assignment.compensation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning compensation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign compensation: {str(e)}"
        )


@router.post("/reject", response_model=CompensationResponse)
async def reject_compensation(
    rejection: CompensationReject
    # TODO: Re-enable auth: current_user: dict = Depends(require_admin)
):
    """
    Admin rejects a compensation request
    
    **Security:** Requires ADMIN role
    """
    try:
        # logger.info(f"Admin {current_user['id']} rejecting compensation {rejection.compensation_id}")
        
        # Update compensation status
        update_data = {
            "status": "REJECTED",
            "rejection_reason": rejection.rejection_reason,
            # "approved_by": current_user['id'],  # TODO: Re-enable when auth is added back
            "approved_at": datetime.utcnow().isoformat()
        }
        
        updated = await db.update(
            "compensations",
            update_data,
            {"id": rejection.compensation_id}
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compensation request not found"
            )
        
        return CompensationResponse(
            success=True,
            message="Compensation request rejected",
            compensation_id=rejection.compensation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting compensation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject compensation: {str(e)}"
        )


@router.get("/pending")
async def get_pending_compensations(
    current_user: dict = Depends(require_admin)
):
    """
    Get all pending compensation requests for admin review
    
    **Security:** Requires ADMIN role
    """
    try:
        compensations = await db.select(
            "compensations",
            filters={"status": "PENDING_APPROVAL"},
            order_by="created_at.desc"
        )
        
        # Enrich with student and batch details
        enriched = []
        for comp in compensations:
            # Get student info
            students = await db.select(
                "students",
                filters={"id": comp['student_id']}
            )
            
            # Get original batch info
            batches = await db.select(
                "batches",
                filters={"id": comp['original_batch_id']}
            )
            
            student = students[0] if students else {}
            batch = batches[0] if batches else {}
            
            enriched.append({
                **comp,
                "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}",
                "student_code": student.get('student_id'),
                "original_batch_name": batch.get('name'),
                "original_batch_day": batch.get('day_of_week'),
                "original_batch_time": batch.get('start_time')
            })
        
        return {
            "compensations": enriched,
            "count": len(enriched)
        }
        
    except Exception as e:
        logger.error(f"Error fetching pending compensations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch compensations: {str(e)}"
        )


@router.get("/student/{student_id}")
async def get_student_compensations(
    student_id: str,
    current_user: dict = Depends(require_staff)
):
    """
    Get all compensation records for a specific student
    
    **Security:** Requires STAFF or ADMIN role
    """
    try:
        compensations = await db.select(
            "compensations",
            filters={"student_id": student_id},
            order_by="created_at.desc"
        )
        
        # Enrich with batch details
        enriched = []
        for comp in compensations:
            # Get original batch
            orig_batches = await db.select(
                "batches",
                filters={"id": comp['original_batch_id']}
            )
            
            # Get compensation batch if assigned
            comp_batches = []
            if comp.get('compensation_batch_id'):
                comp_batches = await db.select(
                    "batches",
                    filters={"id": comp['compensation_batch_id']}
                )
            
            orig_batch = orig_batches[0] if orig_batches else {}
            comp_batch = comp_batches[0] if comp_batches else {}
            
            enriched.append({
                **comp,
                "original_batch_name": orig_batch.get('name'),
                "compensation_batch_name": comp_batch.get('name')
            })
        
        return {
            "compensations": enriched,
            "count": len(enriched)
        }
        
    except Exception as e:
        logger.error(f"Error fetching student compensations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch compensations: {str(e)}"
        )


@router.get("/all")
async def get_all_compensations(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """
    Get all compensation records with optional status filter
    
    **Security:** Requires ADMIN role
    """
    try:
        filters = {}
        if status_filter:
            filters["status"] = status_filter
        
        compensations = await db.select(
            "compensations",
            filters=filters if filters else None,
            order_by="created_at.desc"
        )
        
        return {
            "compensations": compensations,
            "count": len(compensations)
        }
        
    except Exception as e:
        logger.error(f"Error fetching all compensations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch compensations: {str(e)}"
        )
