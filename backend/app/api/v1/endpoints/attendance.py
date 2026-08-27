"""
Attendance Endpoints
Handles attendance submission with business rule enforcement
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime, timedelta
from collections import defaultdict

from app.auth.deps import require_staff
from app.zendbx_client import db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class AttendanceRecord(BaseModel):
    """Single attendance record"""
    student_id: str
    status: str = Field(..., pattern="^(PRESENT|ABSENT)$")


class AttendanceSubmit(BaseModel):
    """Attendance submission request"""
    batch_id: str
    class_date: date
    attendance: List[AttendanceRecord]
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    """Attendance submission response"""
    success: bool
    marked_count: int
    present_count: int
    absent_count: int
    emails_sent: int
    errors: List[str] = []
    message: str


def get_week_start(d: date) -> date:
    """Get Monday of the week containing the given date"""
    return d - timedelta(days=d.weekday())


@router.post("/submit", response_model=AttendanceResponse)
async def submit_attendance(
    submission: AttendanceSubmit,
    current_user: dict = Depends(require_staff)
):
    """
    Submit attendance for a batch
    
    This endpoint enforces critical business rules:
    1. **Maximum 2 regular classes per week** - 3rd class in same week is blocked
    2. **Classes on different days** - No 2nd class on same calendar day
    3. **Paused students excluded** - Only ACTIVE students can be marked
    4. **Absence notifications** - Automatic email to parents
    
    **Security:** Requires STAFF role (or ADMIN)
    
    **Business Rules:**
    - Students can attend max 2 REGULAR classes per week (Mon-Sun)
    - Cannot attend 2 classes on the same calendar day
    - Paused students are automatically excluded
    - Absence triggers email notification
    """
    try:
        logger.info(f"Staff {current_user['id']} submitting attendance for batch {submission.batch_id} on {submission.class_date}")
        
        errors = []
        marked_count = 0
        present_count = 0
        absent_count = 0
        emails_sent = 0
        
        # Get week boundaries
        week_start = get_week_start(submission.class_date)
        week_end = week_start + timedelta(days=6)
        
        logger.info(f"Week range: {week_start} to {week_end}")
        
        # Process each student
        for record in submission.attendance:
            try:
                # Step 1: Validate student exists and is ACTIVE
                students = await db.select(
                    "students",
                    filters={"id": record.student_id}
                )
                
                if not students:
                    # Student might be in enrollments table
                    enrollments = await db.select(
                        "enrollments",
                        filters={"id": record.student_id}
                    )
                    
                    if not enrollments:
                        errors.append(f"Student {record.student_id} not found")
                        continue
                    
                    student = enrollments[0]
                    student_name = f"{student['student_first_name']} {student['student_last_name']}"
                    student_status = student['status']
                else:
                    student = students[0]
                    student_name = f"{student['first_name']} {student['last_name']}"
                    student_status = student['status']
                
                # Check if student is PAUSED
                if student_status == 'PAUSED':
                    errors.append(f"{student_name} is PAUSED and cannot attend")
                    continue
                
                # Step 2: For PRESENT status, enforce business rules
                if record.status == 'PRESENT':
                    # Rule 1: Check same-day attendance
                    same_day_attendance = await db.select(
                        "attendance",
                        filters={
                            "student_id": record.student_id,
                            "class_date": submission.class_date.isoformat(),
                            "status": "PRESENT"
                        }
                    )
                    
                    if same_day_attendance:
                        errors.append(f"{student_name} already attended a class today")
                        continue
                    
                    # Rule 2: Check weekly limit (2 classes max)
                    weekly_attendance = await db.select(
                        "attendance",
                        columns="id,class_date,status",
                        filters={
                            "student_id": record.student_id,
                            "status": "PRESENT"
                        }
                    )
                    
                    # Filter by week range
                    this_week_count = sum(
                        1 for att in weekly_attendance
                        if week_start <= date.fromisoformat(att['class_date']) <= week_end
                    )
                    
                    if this_week_count >= 2:
                        errors.append(f"{student_name} has already attended 2 classes this week (limit reached)")
                        continue
                
                # Step 3: Check if attendance already exists for this student/batch/date
                existing = await db.select(
                    "attendance",
                    filters={
                        "student_id": record.student_id,
                        "batch_id": submission.batch_id,
                        "class_date": submission.class_date.isoformat()
                    }
                )
                
                # Delete existing if found
                if existing:
                    await db.delete(
                        "attendance",
                        filters={
                            "student_id": record.student_id,
                            "batch_id": submission.batch_id,
                            "class_date": submission.class_date.isoformat()
                        }
                    )
                    logger.info(f"Deleted existing attendance for {student_name}")
                
                # Step 4: Get current IN_PROGRESS session for student
                session_id = None
                try:
                    student_sessions = await db.select(
                        "student_sessions",
                        filters={
                            "student_id": record.student_id,
                            "status": "IN_PROGRESS"
                        }
                    )
                    if student_sessions and len(student_sessions) > 0:
                        session_id = student_sessions[0]['session_id']
                        logger.info(f"Found IN_PROGRESS session {session_id} for student {student_name}")
                except Exception as e:
                    logger.warning(f"Could not find session for student {student_name}: {e}")
                    # Continue without session_id
                
                # Step 5: Create new attendance record
                # IMPORTANT: Actual DB schema has session_id, NOT marked_by/marked_at/is_locked/attendance_type
                attendance_data = {
                    "student_id": record.student_id,
                    "batch_id": submission.batch_id,
                    "class_date": submission.class_date.isoformat(),
                    "status": record.status,
                    "notes": submission.notes
                }
                
                # Add session_id if found
                if session_id:
                    attendance_data["session_id"] = session_id
                
                created = await db.insert("attendance", attendance_data)
                
                if created:
                    marked_count += 1
                    attendance_id = created[0]['id']
                    
                    if record.status == 'PRESENT':
                        present_count += 1
                        
                        # Step 6: Trigger session automation for qualifying attendance
                        # This runs the 8-class completion check automatically
                        try:
                            from app.services.session_service import session_service
                            
                            automation_result = await session_service.process_attendance_completion(
                                student_id=record.student_id,
                                attendance_id=attendance_id
                            )
                            
                            if automation_result.get('processed'):
                                completion = automation_result.get('completion_result', {})
                                if completion.get('completed'):
                                    logger.info(f"🎉 Session completed for {student_name}! Fee automation triggered.")
                                    if completion.get('fee_email_sent'):
                                        logger.info(f"📧 Fee due email sent for {student_name}")
                        
                        except Exception as auto_error:
                            # CRITICAL: Attendance must succeed even if automation fails
                            logger.error(f"Session automation failed for {student_name}: {auto_error}")
                            # Do not raise - attendance saving takes priority
                    else:
                        absent_count += 1
                        
                        # Step 7: Auto-create compensation request for absent student
                        try:
                            compensation_data = {
                                "student_id": record.student_id,
                                "original_attendance_id": attendance_id,
                                "original_batch_id": submission.batch_id,
                                "original_date": submission.class_date.isoformat(),
                                "status": "PENDING_APPROVAL",
                                "notes": f"Auto-created for absence on {submission.class_date}"
                            }
                            
                            compensation = await db.insert("compensations", compensation_data)
                            
                            if compensation:
                                logger.info(f"Auto-created compensation request for {student_name}")
                                
                                # Create notification for admin
                                notification_data = {
                                    "type": "COMPENSATION_REQUEST",
                                    "title": "New Compensation Request",
                                    "message": f"{student_name} was absent on {submission.class_date}. Compensation request created automatically.",
                                    "priority": "NORMAL",
                                    "status": "UNREAD",
                                    "reference_type": "compensation",
                                    "reference_id": compensation[0]['id']
                                }
                                
                                await db.insert("notifications", notification_data)
                        
                        except Exception as comp_error:
                            logger.warning(f"Failed to create compensation for {student_name}: {comp_error}")
                            # Don't fail attendance submission if compensation creation fails
                        
                        # Step 8: Send absence notification
                        try:
                            # Get parent email from enrollment
                            parent_email = student.get('parent_email')
                            
                            if parent_email:
                                # Create email notification
                                email_data = {
                                    "recipient_email": parent_email,
                                    "recipient_name": student.get('parent_first_name', 'Parent'),
                                    "subject": f"Absence Notification - {student_name}",
                                    "body": f"Dear Parent,\n\n{student_name} was marked absent on {submission.class_date}.\n\nA compensation/makeup class will be scheduled by the admin.\n\nArtfully",
                                    "email_type": "ABSENCE_NOTIFICATION",
                                    "status": "QUEUED",
                                    "reference_type": "attendance",
                                    "reference_id": attendance_id
                                }
                                
                                await db.insert("email_events", email_data)
                                emails_sent += 1
                                logger.info(f"Absence email queued for {student_name}")
                        
                        except Exception as email_error:
                            logger.warning(f"Failed to queue absence email for {student_name}: {email_error}")
                            # Don't fail attendance submission if email fails
                
                logger.info(f"Marked {student_name} as {record.status}")
                
            except Exception as e:
                logger.error(f"Error processing student {record.student_id}: {str(e)}")
                errors.append(f"Error processing student: {str(e)}")
        
        logger.info(f"Attendance submitted: {marked_count} marked ({present_count} present, {absent_count} absent)")
        
        if marked_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No attendance records were created. Errors: " + "; ".join(errors)
            )
        
        message = f"Attendance saved: {present_count} present, {absent_count} absent"
        if emails_sent > 0:
            message += f". {emails_sent} absence notification(s) sent."
        
        return AttendanceResponse(
            success=True,
            marked_count=marked_count,
            present_count=present_count,
            absent_count=absent_count,
            emails_sent=emails_sent,
            errors=errors,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Attendance submission failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Attendance submission failed: {str(e)}"
        )


@router.get("/today")
async def get_today_attendance(
    current_user: dict = Depends(require_staff)
):
    """
    Get today's attendance records
    
    **Security:** Requires STAFF role
    """
    try:
        today = date.today().isoformat()
        
        attendance = await db.select(
            "attendance",
            filters={"class_date": today},
            order_by="marked_at.desc"
        )
        
        return {
            "date": today,
            "records": attendance,
            "count": len(attendance)
        }
        
    except Exception as e:
        logger.error(f"Failed to get today's attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get attendance: {str(e)}"
        )
