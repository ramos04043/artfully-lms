"""
Automation API Endpoints
Handles automated tasks triggered by external cron jobs
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import date
import logging

from app.auth.automation_deps import verify_automation_secret
from app.services.automation_service import automation_service
from app.services.session_service import session_service
from app.utils.timezone_utils import get_ist_today, parse_date

logger = logging.getLogger(__name__)

router = APIRouter()


class DailySummaryResponse(BaseModel):
    """Response for daily class summary"""
    success: bool
    skipped: bool
    date: str
    classes_found: int
    students_found: int
    emails_sent: int
    errors: list
    reason: Optional[str] = None


class SessionProgressResponse(BaseModel):
    """Response for session progress check"""
    success: bool
    student_id: str
    session_id: Optional[str]
    completed_classes: int
    required_classes: int
    session_complete: bool
    session_status: str


class SessionProgressRequest(BaseModel):
    """Request for checking session progress"""
    student_id: str
    session_id: Optional[str] = None


class AttendanceProcessRequest(BaseModel):
    """Request for processing attendance"""
    student_id: str
    attendance_id: str


@router.post("/daily-class-summary", response_model=DailySummaryResponse)
async def daily_class_summary(
    summary_date: Optional[str] = None,
    authenticated: bool = Depends(verify_automation_secret)
):
    """
    Generate and send daily class summary email
    
    **External Cron Schedule:** Every day at 02:30 UTC (08:00 AM IST)
    
    **Authentication:** Requires AUTOMATION_SECRET in Authorization header
    
    **Idempotency:** Safe to call multiple times for same date
    
    Args:
        summary_date: Optional date string (YYYY-MM-DD). Defaults to today in IST.
        
    Returns:
        DailySummaryResponse with summary details
        
    Example:
        ```bash
        curl -X POST https://your-app.onrender.com/api/automation/daily-class-summary \
          -H "Authorization: Bearer YOUR_AUTOMATION_SECRET"
        ```
    """
    try:
        logger.info("Daily class summary endpoint called")
        
        # Parse date or use today
        if summary_date:
            try:
                target_date = parse_date(summary_date)
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}"
                )
        else:
            target_date = get_ist_today()
        
        logger.info(f"Generating summary for: {target_date}")
        
        # Generate and send summary
        result = await automation_service.send_daily_summary_email(target_date)
        
        return DailySummaryResponse(
            success=result['success'],
            skipped=result.get('skipped', False),
            date=result['date'],
            classes_found=result['classes_found'],
            students_found=result['students_found'],
            emails_sent=result['emails_sent'],
            errors=result.get('errors', []),
            reason=result.get('reason')
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in daily_class_summary endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Daily summary failed: {str(e)}"
        )


@router.post("/check-session-progress", response_model=SessionProgressResponse)
async def check_session_progress(
    request: SessionProgressRequest,
    authenticated: bool = Depends(verify_automation_secret)
):
    """
    Check student's session progress
    
    **Authentication:** Requires AUTOMATION_SECRET
    
    **Use Case:** Admin manual trigger or debugging
    
    Args:
        request: SessionProgressRequest with student_id and optional session_id
        
    Returns:
        SessionProgressResponse with progress details
    """
    try:
        logger.info(f"Checking session progress for student: {request.student_id}")
        
        progress = await session_service.calculate_student_session_progress(
            student_id=request.student_id,
            session_id=request.session_id
        )
        
        return SessionProgressResponse(
            success=True,
            student_id=progress['student_id'],
            session_id=progress.get('session_id'),
            completed_classes=progress['completed_classes'],
            required_classes=progress['required_classes'],
            session_complete=progress['session_complete'],
            session_status=progress['session_status']
        )
    
    except Exception as e:
        logger.error(f"Error checking session progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check progress: {str(e)}"
        )


@router.post("/process-attendance")
async def process_attendance(
    request: AttendanceProcessRequest,
    authenticated: bool = Depends(verify_automation_secret)
):
    """
    Process attendance record for session completion
    
    **Called automatically after attendance is marked**
    
    **Authentication:** Requires AUTOMATION_SECRET
    
    Args:
        request: AttendanceProcessRequest with student_id and attendance_id
        
    Returns:
        dict with processing results
    """
    try:
        logger.info(f"Processing attendance: {request.attendance_id} for student: {request.student_id}")
        
        result = await session_service.process_attendance_completion(
            student_id=request.student_id,
            attendance_id=request.attendance_id
        )
        
        return {
            "success": result.get('processed', False),
            "student_id": request.student_id,
            "attendance_id": request.attendance_id,
            "counts_toward_completion": result.get('counts_toward_completion', False),
            "completion_result": result.get('completion_result'),
            "error": result.get('error')
        }
    
    except Exception as e:
        logger.error(f"Error processing attendance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process attendance: {str(e)}"
        )


@router.get("/health")
async def automation_health():
    """
    Health check endpoint for automation services
    No authentication required
    
    Returns:
        dict with service status
    """
    return {
        "status": "healthy",
        "service": "automation",
        "endpoints": [
            "/daily-class-summary",
            "/check-session-progress",
            "/process-attendance"
        ]
    }
