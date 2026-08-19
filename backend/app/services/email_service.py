"""
Email Service for sending emails via SMTP
Handles idempotency, logging, and error handling
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict
from datetime import datetime
import logging

from app.core.config import settings
from app.zendbx_client import db
from app.utils.timezone_utils import get_ist_now

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service with idempotency and logging
    """
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
    
    async def check_idempotency(self, idempotency_key: str) -> bool:
        """
        Check if email with this idempotency key was already sent
        
        Args:
            idempotency_key: Unique key for this email
            
        Returns:
            bool: True if already sent, False otherwise
        """
        try:
            result = await db.select(
                'email_events',
                filters={
                    'idempotency_key': idempotency_key,
                    'status': 'SENT'
                }
            )
            
            if result and len(result) > 0:
                logger.info(f"Email already sent with key: {idempotency_key}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking idempotency: {e}")
            # If error, assume not sent to be safe
            return False
    
    async def log_email_event(
        self,
        recipient_email: str,
        recipient_name: Optional[str],
        subject: str,
        body: str,
        email_type: str,
        status: str,
        idempotency_key: Optional[str] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        failed_reason: Optional[str] = None
    ) -> Optional[str]:
        """
        Log email event to database
        
        Args:
            recipient_email: Recipient email address
            recipient_name: Recipient name
            subject: Email subject
            body: Email body (HTML)
            email_type: Type of email (DAILY_SUMMARY, FEE_DUE, etc.)
            status: Email status (QUEUED, SENT, FAILED)
            idempotency_key: Optional idempotency key
            reference_type: Optional reference type
            reference_id: Optional reference ID
            failed_reason: Optional failure reason
            
        Returns:
            str: Email event ID or None
        """
        try:
            email_event_data = {
                'recipient_email': recipient_email,
                'recipient_name': recipient_name,
                'subject': subject,
                'body': body,
                'email_type': email_type,
                'status': status,
                'reference_type': reference_type,
                'reference_id': reference_id,
                'failed_reason': failed_reason,
            }
            
            # Add idempotency_key if provided and column exists
            if idempotency_key:
                email_event_data['idempotency_key'] = idempotency_key
            
            # Add sent_at if status is SENT
            if status == 'SENT':
                email_event_data['sent_at'] = get_ist_now().isoformat()
            
            result = await db.insert('email_events', email_event_data)
            
            if result and len(result) > 0:
                event_id = result[0].get('id')
                logger.info(f"Email event logged: {event_id}")
                return event_id
            
            return None
        except Exception as e:
            logger.error(f"Error logging email event: {e}")
            return None
    
    def send_smtp_email(
        self,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_body: str
    ) -> Dict:
        """
        Send email via SMTP
        
        Args:
            to_email: Recipient email
            to_name: Recipient name
            subject: Email subject
            html_body: HTML email body
            
        Returns:
            dict: {success: bool, error: str}
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email if not to_name else f"{to_name} <{to_email}>"
            
            # Attach HTML part
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            # Send via SMTP
            logger.info(f"Connecting to SMTP: {self.smtp_host}:{self.smtp_port}")
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return {"success": True, "error": None}
        
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        except Exception as e:
            error_msg = f"Unexpected error sending email: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
    
    async def send_email(
        self,
        email_type: str,
        recipient_email: str,
        recipient_name: Optional[str],
        subject: str,
        html_body: str,
        idempotency_key: Optional[str] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Send email with idempotency check and logging
        
        Args:
            email_type: Type of email (DAILY_SUMMARY, FEE_DUE, etc.)
            recipient_email: Recipient email address
            recipient_name: Recipient name
            subject: Email subject
            html_body: HTML email body
            idempotency_key: Optional idempotency key
            reference_type: Optional reference type
            reference_id: Optional reference ID
            
        Returns:
            dict: {success: bool, skipped: bool, error: str, event_id: str}
        """
        # Check idempotency
        if idempotency_key:
            already_sent = await self.check_idempotency(idempotency_key)
            if already_sent:
                logger.info(f"Email skipped (already sent): {idempotency_key}")
                return {
                    "success": True,
                    "skipped": True,
                    "error": None,
                    "reason": "Email already sent"
                }
        
        # Send email
        send_result = self.send_smtp_email(
            to_email=recipient_email,
            to_name=recipient_name,
            subject=subject,
            html_body=html_body
        )
        
        # Log email event
        status = 'SENT' if send_result['success'] else 'FAILED'
        event_id = await self.log_email_event(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body=html_body,
            email_type=email_type,
            status=status,
            idempotency_key=idempotency_key,
            reference_type=reference_type,
            reference_id=reference_id,
            failed_reason=send_result.get('error')
        )
        
        return {
            "success": send_result['success'],
            "skipped": False,
            "error": send_result.get('error'),
            "event_id": event_id
        }


# Singleton instance
email_service = EmailService()
