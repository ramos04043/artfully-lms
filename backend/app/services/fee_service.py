"""
Fee Service for managing fee dues and notifications
"""
from typing import Dict, Optional
from datetime import datetime, timedelta
import logging

from app.zendbx_client import db
from app.utils.timezone_utils import get_ist_today
from app.utils.idempotency import generate_fee_due_email_key
from app.templates.email_templates import fee_due_notification_template
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class FeeService:
    """
    Service for managing fee dues and notifications
    """
    
    async def check_and_create_fee_due(
        self,
        student_id: str,
        completed_session_id: str
    ) -> Dict:
        """
        Check if fee due exists for next session and create if needed
        
        Args:
            student_id: Student ID
            completed_session_id: ID of the session that was just completed
            
        Returns:
            dict: {
                'fee_due_created': bool,
                'already_paid': bool,
                'no_next_session': bool,
                'email_sent': bool,
                'fee_due_id': str,
                'error': str
            }
        """
        try:
            # Get completed session details
            completed_sessions = await db.select(
                'sessions',
                filters={'id': completed_session_id}
            )
            
            if not completed_sessions or len(completed_sessions) == 0:
                logger.warning(f"Session {completed_session_id} not found")
                return {
                    'fee_due_created': False,
                    'error': 'Completed session not found'
                }
            
            completed_session = completed_sessions[0]
            programme_id = completed_session['programme_id']
            
            # Find next session for same programme
            next_sessions = await db.select(
                'sessions',
                filters={
                    'programme_id': programme_id,
                    'status': 'ACTIVE'
                }
            )
            
            # Filter for sessions starting after completed session ends
            if next_sessions:
                next_sessions = [
                    s for s in next_sessions
                    if s.get('start_date') and completed_session.get('end_date')
                    and s['start_date'] > completed_session['end_date']
                ]
                
                # Sort by start_date
                next_sessions.sort(key=lambda x: x.get('start_date', '9999-12-31'))
            
            if not next_sessions or len(next_sessions) == 0:
                logger.info(f"No next session found for programme {programme_id}")
                return {
                    'fee_due_created': False,
                    'no_next_session': True,
                    'message': 'No next session available'
                }
            
            next_session = next_sessions[0]
            next_session_id = next_session['id']
            
            logger.info(f"Next session found: {next_session_id}")
            
            # Check if fee_due already exists
            existing_fee_dues = await db.select(
                'fee_dues',
                filters={
                    'student_id': student_id,
                    'session_id': next_session_id
                }
            )
            
            if existing_fee_dues and len(existing_fee_dues) > 0:
                existing_fee_due = existing_fee_dues[0]
                
                if existing_fee_due.get('status') == 'PAID':
                    logger.info(f"Fee already paid for session {next_session_id}")
                    return {
                        'fee_due_created': False,
                        'already_paid': True,
                        'fee_due_id': existing_fee_due['id'],
                        'message': 'Fee already paid'
                    }
                else:
                    logger.info(f"Fee due already exists (unpaid): {existing_fee_due['id']}")
                    # Send reminder email
                    email_sent = await self.send_fee_due_email(
                        student_id=student_id,
                        fee_due_id=existing_fee_due['id'],
                        session_id=next_session_id
                    )
                    
                    return {
                        'fee_due_created': False,
                        'already_exists': True,
                        'fee_due_id': existing_fee_due['id'],
                        'email_sent': email_sent,
                        'message': 'Fee due already exists, reminder sent'
                    }
            
            # Get programme details for fee amount
            programmes = await db.select(
                'programmes',
                filters={'id': programme_id}
            )
            
            if not programmes or len(programmes) == 0:
                logger.error(f"Programme {programme_id} not found")
                return {
                    'fee_due_created': False,
                    'error': 'Programme not found'
                }
            
            programme = programmes[0]
            fee_amount = programme.get('fee_per_session', 0)
            
            # Calculate due date (e.g., 7 days before session starts)
            session_start = next_session.get('start_date')
            if session_start:
                from datetime import datetime
                start_date = datetime.fromisoformat(str(session_start)) if isinstance(session_start, str) else session_start
                due_date = start_date - timedelta(days=7)
            else:
                due_date = get_ist_today() + timedelta(days=14)
            
            # Create fee_due
            logger.info(f"Creating fee_due for student {student_id}, session {next_session_id}")
            
            fee_due_data = {
                'student_id': student_id,
                'session_id': next_session_id,
                'amount_due': fee_amount,
                'amount_paid': 0,
                'amount_pending': fee_amount,
                'status': 'PENDING',
                'due_date': due_date.date() if hasattr(due_date, 'date') else due_date
            }
            
            created_fee_dues = await db.insert('fee_dues', fee_due_data)
            
            if not created_fee_dues or len(created_fee_dues) == 0:
                logger.error("Failed to create fee_due")
                return {
                    'fee_due_created': False,
                    'error': 'Failed to insert fee_due'
                }
            
            fee_due = created_fee_dues[0]
            fee_due_id = fee_due.get('id')
            
            logger.info(f"Fee due created: {fee_due_id}")
            
            # Send fee due email
            email_sent = await self.send_fee_due_email(
                student_id=student_id,
                fee_due_id=fee_due_id,
                session_id=next_session_id
            )
            
            return {
                'fee_due_created': True,
                'fee_due_id': fee_due_id,
                'amount': fee_amount,
                'due_date': str(due_date.date() if hasattr(due_date, 'date') else due_date),
                'email_sent': email_sent
            }
        
        except Exception as e:
            logger.error(f"Error in check_and_create_fee_due: {e}")
            return {
                'fee_due_created': False,
                'error': str(e)
            }
    
    async def send_fee_due_email(
        self,
        student_id: str,
        fee_due_id: str,
        session_id: str
    ) -> bool:
        """
        Send fee due notification email to parent
        
        Args:
            student_id: Student ID
            fee_due_id: Fee due ID
            session_id: Next session ID
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            # Get student details
            students = await db.select('students', filters={'id': student_id})
            if not students or len(students) == 0:
                logger.error(f"Student {student_id} not found")
                return False
            
            student = students[0]
            student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
            
            # Get parent details
            student_parents = await db.select(
                'student_parents',
                filters={'student_id': student_id, 'is_primary': True}
            )
            
            recipient_email = None
            recipient_name = None
            
            if student_parents and len(student_parents) > 0:
                parent_id = student_parents[0]['parent_id']
                parents = await db.select('parents', filters={'id': parent_id})
                
                if parents and len(parents) > 0:
                    parent = parents[0]
                    recipient_email = parent.get('email')
                    recipient_name = f"{parent.get('first_name', '')} {parent.get('last_name', '')}".strip()
            
            # Fallback to student email
            if not recipient_email:
                recipient_email = student.get('email')
                recipient_name = student_name
                logger.warning(f"No parent email found, using student email: {recipient_email}")
            
            if not recipient_email:
                logger.error(f"No email found for student {student_id}")
                return False
            
            # Get fee_due details
            fee_dues = await db.select('fee_dues', filters={'id': fee_due_id})
            if not fee_dues or len(fee_dues) == 0:
                logger.error(f"Fee due {fee_due_id} not found")
                return False
            
            fee_due = fee_dues[0]
            amount_due = fee_due.get('amount_due', 0)
            due_date = fee_due.get('due_date')
            
            # Get session and programme details
            sessions = await db.select('sessions', filters={'id': session_id})
            if not sessions or len(sessions) == 0:
                logger.error(f"Session {session_id} not found")
                return False
            
            session = sessions[0]
            session_name = session.get('name', 'Next Session')
            
            programmes = await db.select('programmes', filters={'id': session['programme_id']})
            programme_name = programmes[0].get('name', 'Programme') if programmes else 'Programme'
            
            # Get batch details (assuming student has one active batch)
            student_batches = await db.select(
                'student_batches',
                filters={'student_id': student_id, 'is_active': True}
            )
            
            batch_name = 'Batch'
            if student_batches and len(student_batches) > 0:
                batch_id = student_batches[0]['batch_id']
                batches = await db.select('batches', filters={'id': batch_id})
                if batches and len(batches) > 0:
                    batch_name = batches[0].get('name', 'Batch')
            
            # Generate email
            subject, html_body = fee_due_notification_template(
                student_name=student_name,
                parent_name=recipient_name or 'Parent',
                programme_name=programme_name,
                batch_name=batch_name,
                completed_session='Previous Session',
                classes_completed=8,
                amount_due=amount_due,
                due_date=due_date
            )
            
            # Check idempotency
            idempotency_key = generate_fee_due_email_key(student_id, session_id)
            
            # Send email
            email_result = await email_service.send_email(
                email_type='FEE_DUE',
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                subject=subject,
                html_body=html_body,
                idempotency_key=idempotency_key,
                reference_type='fee_due',
                reference_id=fee_due_id
            )
            
            return email_result['success']
        
        except Exception as e:
            logger.error(f"Error sending fee due email: {e}")
            return False


# Singleton instance
fee_service = FeeService()
