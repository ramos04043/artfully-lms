"""
Automation Service for daily class summary
"""
from datetime import date
from typing import List, Dict, Optional
import logging

from app.zendbx_client import db
from app.utils.timezone_utils import get_ist_today, get_ist_day_of_week, format_time_12hr, ist_date_string
from app.utils.idempotency import generate_daily_summary_key
from app.templates.email_templates import daily_class_summary_template
from app.services.email_service import email_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class AutomationService:
    """
    Service for handling automation tasks
    """
    
    async def generate_daily_class_summary(self, summary_date: date) -> Dict:
        """
        Generate daily class summary for a specific date
        
        Args:
            summary_date: Date to generate summary for
            
        Returns:
            dict: {
                'date': str,
                'day_of_week': str,
                'classes': List[Dict],
                'total_students': int
            }
        """
        try:
            # Get day of week from date
            day_of_week = summary_date.strftime("%A").upper()
            logger.info(f"Generating class summary for {summary_date} ({day_of_week})")
            
            # Find all active batches for this day
            batches = await db.select(
                'batches',
                filters={
                    'day_of_week': day_of_week,
                    'is_active': True
                }
            )
            
            if not batches:
                logger.info(f"No classes found for {day_of_week}")
                return {
                    'date': ist_date_string(summary_date),
                    'day_of_week': day_of_week,
                    'classes': [],
                    'total_students': 0
                }
            
            logger.info(f"Found {len(batches)} batches for {day_of_week}")
            
            classes_summary = []
            total_students = 0
            
            for batch in batches:
                try:
                    # Get programme details
                    programmes = await db.select(
                        'programmes',
                        filters={'id': batch['programme_id']}
                    )
                    
                    programme = programmes[0] if programmes else None
                    if not programme:
                        logger.warning(f"Programme not found for batch {batch['id']}")
                        continue
                    
                    # Get assigned staff
                    staff_assignments = await db.select(
                        'staff_batches',
                        filters={
                            'batch_id': batch['id'],
                            'is_active': True
                        }
                    )
                    
                    staff_name = "No staff assigned"
                    if staff_assignments and len(staff_assignments) > 0:
                        staff_assignment = staff_assignments[0]
                        
                        # Get staff details - note: actual DB has app_users table
                        try:
                            staff_records = await db.select(
                                'staff',
                                filters={'id': staff_assignment['staff_id']}
                            )
                            
                            if staff_records and len(staff_records) > 0:
                                staff_record = staff_records[0]
                                
                                # Get user details from app_users (not users table)
                                # Staff table references user_id which maps to app_users
                                user_records = await db.select(
                                    'app_users',
                                    filters={'id': staff_record.get('user_id')}
                                )
                                
                                if user_records and len(user_records) > 0:
                                    user = user_records[0]
                                    staff_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
                        except Exception as e:
                            logger.warning(f"Error fetching staff details: {e}")
                    
                    # Get enrolled students for this batch
                    student_batches = await db.select(
                        'student_batches',
                        filters={
                            'batch_id': batch['id'],
                            'is_active': True
                        }
                    )
                    
                    students_list = []
                    if student_batches:
                        student_ids = [sb['student_id'] for sb in student_batches]
                        
                        # Get student details
                        for student_id in student_ids:
                            try:
                                students = await db.select(
                                    'students',
                                    filters={
                                        'id': student_id,
                                        'status': 'ACTIVE'
                                    }
                                )
                                
                                if students and len(students) > 0:
                                    student = students[0]
                                    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
                                    students_list.append(student_name)
                            except Exception as e:
                                logger.warning(f"Error fetching student {student_id}: {e}")
                    
                    # Format time (batch has start_time as time object)
                    time_str = format_time_12hr(batch['start_time']) if batch.get('start_time') else "Time TBD"
                    
                    class_info = {
                        'time': time_str,
                        'programme': programme.get('name', 'Unknown Programme'),
                        'batch': batch.get('name', 'Unknown Batch'),
                        'staff': staff_name,
                        'students': students_list
                    }
                    
                    classes_summary.append(class_info)
                    total_students += len(students_list)
                    
                    logger.info(f"Class: {time_str} - {programme.get('name')} - {len(students_list)} students")
                
                except Exception as e:
                    logger.error(f"Error processing batch {batch.get('id')}: {e}")
                    continue
            
            # Sort classes by time
            classes_summary.sort(key=lambda x: x['time'])
            
            return {
                'date': ist_date_string(summary_date),
                'day_of_week': day_of_week,
                'classes': classes_summary,
                'total_students': total_students
            }
        
        except Exception as e:
            logger.error(f"Error generating daily class summary: {e}")
            raise
    
    async def send_daily_summary_email(self, summary_date: Optional[date] = None) -> Dict:
        """
        Send daily class summary email to admin
        
        Args:
            summary_date: Date to send summary for (defaults to today in IST)
            
        Returns:
            dict: {
                'success': bool,
                'skipped': bool,
                'date': str,
                'classes_found': int,
                'students_found': int,
                'emails_sent': int,
                'errors': List
            }
        """
        if summary_date is None:
            summary_date = get_ist_today()
        
        logger.info(f"Starting daily class summary email for {summary_date}")
        
        try:
            # Check idempotency
            idempotency_key = generate_daily_summary_key(summary_date)
            already_sent = await email_service.check_idempotency(idempotency_key)
            
            if already_sent:
                logger.info(f"Daily summary already sent for {summary_date}")
                return {
                    'success': True,
                    'skipped': True,
                    'reason': f'Daily summary already sent for {summary_date}',
                    'date': ist_date_string(summary_date),
                    'classes_found': 0,
                    'students_found': 0,
                    'emails_sent': 0,
                    'errors': []
                }
            
            # Generate summary
            summary = await self.generate_daily_class_summary(summary_date)
            
            # Generate email
            subject, html_body = daily_class_summary_template(
                summary_date=summary_date,
                classes=summary['classes'],
                total_students=summary['total_students']
            )
            
            # Send email to admin
            admin_email = settings.ADMIN_EMAIL
            if not admin_email:
                error_msg = "ADMIN_EMAIL not configured"
                logger.error(error_msg)
                
                return {
                    'success': False,
                    'skipped': False,
                    'date': summary['date'],
                    'classes_found': len(summary['classes']),
                    'students_found': summary['total_students'],
                    'emails_sent': 0,
                    'errors': [error_msg]
                }
            
            # Send email
            email_result = await email_service.send_email(
                email_type='DAILY_SUMMARY',
                recipient_email=admin_email,
                recipient_name='Admin',
                subject=subject,
                html_body=html_body,
                idempotency_key=idempotency_key,
                reference_type='daily_summary',
                reference_id=summary['date']
            )
            
            logger.info(f"Daily summary email sent successfully for {summary['date']}")
            
            return {
                'success': email_result['success'],
                'skipped': email_result.get('skipped', False),
                'date': summary['date'],
                'classes_found': len(summary['classes']),
                'students_found': summary['total_students'],
                'emails_sent': 1 if email_result['success'] else 0,
                'errors': [email_result.get('error')] if email_result.get('error') else []
            }
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in send_daily_summary_email: {error_msg}")
            
            return {
                'success': False,
                'skipped': False,
                'date': ist_date_string(summary_date) if summary_date else 'unknown',
                'classes_found': 0,
                'students_found': 0,
                'emails_sent': 0,
                'errors': [error_msg]
            }


# Singleton instance
automation_service = AutomationService()
