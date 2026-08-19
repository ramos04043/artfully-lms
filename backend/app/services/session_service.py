"""
Session Service for tracking student progress and completion
"""
from typing import Dict, Optional, List
from datetime import datetime
import logging

from app.zendbx_client import db
from app.utils.timezone_utils import get_ist_now
from app.templates.email_templates import session_completion_notification_template
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class SessionService:
    """
    Service for managing student session progress and completion
    """
    
    async def calculate_student_session_progress(
        self,
        student_id: str,
        session_id: Optional[str] = None
    ) -> Dict:
        """
        Calculate student's session progress based on attendance records
        
        QUALIFYING attendance status values:
        - PRESENT
        - COMPENSATION_PRESENT
        
        Args:
            student_id: Student ID
            session_id: Optional specific session ID. If not provided, uses current IN_PROGRESS session
            
        Returns:
            dict: {
                'student_id': str,
                'session_id': str,
                'completed_classes': int,
                'required_classes': int,
                'session_complete': bool,
                'session_status': str
            }
        """
        try:
            # If no session_id provided, get current IN_PROGRESS session
            if not session_id:
                student_sessions = await db.select(
                    'student_sessions',
                    filters={
                        'student_id': student_id,
                        'status': 'IN_PROGRESS'
                    }
                )
                
                if not student_sessions or len(student_sessions) == 0:
                    logger.warning(f"No IN_PROGRESS session found for student {student_id}")
                    return {
                        'student_id': student_id,
                        'session_id': None,
                        'completed_classes': 0,
                        'required_classes': 8,
                        'session_complete': False,
                        'session_status': 'NO_ACTIVE_SESSION',
                        'error': 'No active session found'
                    }
                
                session_id = student_sessions[0]['session_id']
            
            # Count QUALIFYING attendance records
            # Note: Attendance table has session_id column (verified from ZendBX issues)
            attendance_records = await db.select(
                'attendance',
                filters={
                    'student_id': student_id,
                    'session_id': session_id
                }
            )
            
            # Filter for qualifying statuses
            qualifying_statuses = ['PRESENT', 'COMPENSATION_PRESENT']
            completed_classes = 0
            
            if attendance_records:
                for record in attendance_records:
                    if record.get('status') in qualifying_statuses:
                        completed_classes += 1
            
            # Get student_sessions record
            student_sessions = await db.select(
                'student_sessions',
                filters={
                    'student_id': student_id,
                    'session_id': session_id
                }
            )
            
            if not student_sessions or len(student_sessions) == 0:
                logger.warning(f"No student_session record found for {student_id}, {session_id}")
                return {
                    'student_id': student_id,
                    'session_id': session_id,
                    'completed_classes': completed_classes,
                    'required_classes': 8,
                    'session_complete': False,
                    'session_status': 'NOT_ENROLLED',
                    'error': 'Student not enrolled in session'
                }
            
            student_session = student_sessions[0]
            session_status = student_session.get('status', 'IN_PROGRESS')
            
            # Determine if session is complete (8 classes)
            required_classes = 8
            session_complete = completed_classes >= required_classes
            
            logger.info(f"Student {student_id} progress: {completed_classes}/{required_classes} classes")
            
            return {
                'student_id': student_id,
                'session_id': session_id,
                'completed_classes': completed_classes,
                'required_classes': required_classes,
                'session_complete': session_complete,
                'session_status': session_status,
                'student_session_id': student_session.get('id')
            }
        
        except Exception as e:
            logger.error(f"Error calculating session progress: {e}")
            return {
                'student_id': student_id,
                'session_id': session_id,
                'completed_classes': 0,
                'required_classes': 8,
                'session_complete': False,
                'session_status': 'ERROR',
                'error': str(e)
            }
    
    async def check_and_complete_session(
        self,
        student_id: str,
        session_id: str
    ) -> Dict:
        """
        Check if session should be completed and complete it if eligible
        
        Args:
            student_id: Student ID
            session_id: Session ID
            
        Returns:
            dict: {
                'completed': bool,
                'already_complete': bool,
                'progress': dict,
                'fee_due_created': bool,
                'fee_email_sent': bool
            }
        """
        try:
            # Calculate progress
            progress = await self.calculate_student_session_progress(student_id, session_id)
            
            # Check if already completed
            if progress['session_status'] == 'COMPLETED':
                logger.info(f"Session {session_id} already completed for student {student_id}")
                return {
                    'completed': False,
                    'already_complete': True,
                    'progress': progress,
                    'fee_due_created': False,
                    'fee_email_sent': False,
                    'message': 'Session already completed'
                }
            
            # Check if should be completed
            if not progress['session_complete']:
                logger.info(f"Session not yet complete: {progress['completed_classes']}/8 classes")
                return {
                    'completed': False,
                    'already_complete': False,
                    'progress': progress,
                    'fee_due_created': False,
                    'fee_email_sent': False,
                    'message': f"Only {progress['completed_classes']}/8 classes completed"
                }
            
            # Complete the session
            logger.info(f"Completing session {session_id} for student {student_id}")
            
            # Update student_sessions
            update_data = {
                'status': 'COMPLETED',
                'completed_at': get_ist_now().isoformat(),
                'classes_attended': progress['completed_classes']
            }
            
            updated = await db.update(
                'student_sessions',
                data=update_data,
                filters={'id': progress['student_session_id']}
            )
            
            if not updated:
                logger.error("Failed to update student_sessions")
                return {
                    'completed': False,
                    'already_complete': False,
                    'progress': progress,
                    'fee_due_created': False,
                    'fee_email_sent': False,
                    'error': 'Failed to update session status'
                }
            
            logger.info(f"Session {session_id} completed successfully")
            
            # Check and create fee due for next session
            # Import here to avoid circular dependency
            from app.services.fee_service import fee_service
            
            fee_result = await fee_service.check_and_create_fee_due(
                student_id=student_id,
                completed_session_id=session_id
            )
            
            return {
                'completed': True,
                'already_complete': False,
                'progress': progress,
                'fee_due_created': fee_result.get('fee_due_created', False),
                'fee_email_sent': fee_result.get('email_sent', False),
                'fee_result': fee_result
            }
        
        except Exception as e:
            logger.error(f"Error in check_and_complete_session: {e}")
            return {
                'completed': False,
                'already_complete': False,
                'progress': None,
                'fee_due_created': False,
                'fee_email_sent': False,
                'error': str(e)
            }
    
    async def process_attendance_completion(
        self,
        student_id: str,
        attendance_id: str
    ) -> Dict:
        """
        Process attendance record and check for session completion
        Called after attendance is marked
        
        Args:
            student_id: Student ID
            attendance_id: Newly created attendance ID
            
        Returns:
            dict: Completion result
        """
        try:
            # Get attendance record to find session_id
            attendance_records = await db.select(
                'attendance',
                filters={'id': attendance_id}
            )
            
            if not attendance_records or len(attendance_records) == 0:
                logger.warning(f"Attendance record {attendance_id} not found")
                return {'processed': False, 'error': 'Attendance not found'}
            
            attendance = attendance_records[0]
            session_id = attendance.get('session_id')
            
            if not session_id:
                logger.warning(f"No session_id in attendance record {attendance_id}")
                return {'processed': False, 'error': 'No session_id in attendance'}
            
            # Only process PRESENT or COMPENSATION_PRESENT
            status = attendance.get('status')
            if status not in ['PRESENT', 'COMPENSATION_PRESENT']:
                logger.info(f"Attendance status {status} does not count toward completion")
                return {'processed': True, 'counts_toward_completion': False}
            
            # Check and complete session if eligible
            result = await self.check_and_complete_session(student_id, session_id)
            
            return {
                'processed': True,
                'counts_toward_completion': True,
                'completion_result': result
            }
        
        except Exception as e:
            logger.error(f"Error processing attendance completion: {e}")
            return {
                'processed': False,
                'error': str(e)
            }


# Singleton instance
session_service = SessionService()
