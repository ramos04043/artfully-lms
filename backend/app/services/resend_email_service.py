"""
Resend Email Service
Works on Render's free tier (no SMTP port restrictions)
"""
import httpx
from typing import Optional, Dict
import logging

from app.core.config import settings
from app.zendbx_client import db
from app.utils.timezone_utils import get_ist_now

logger = logging.getLogger(__name__)


class ResendEmailService:
    """
    Email service using Resend API
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'RESEND_API_KEY', None)
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.api_url = "https://api.resend.com/emails"
    
    async def check_idempotency(self, idempotency_key: str) -> bool:
        """Check if email was already sent"""
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
        """Log email event to database"""
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
            
            if idempotency_key:
                email_event_data['idempotency_key'] = idempotency_key
            
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
    
    async def send_resend_email(
        self,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_body: str
    ) -> Dict:
        """
        Send email via Resend API
        
        Args:
            to_email: Recipient email
            to_name: Recipient name
            subject: Email subject
            html_body: HTML email body
            
        Returns:
            dict: {success: bool, error: str}
        """
        if not self.api_key:
            error_msg = "Resend API key not configured"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
        
        try:
            # Prepare Resend payload
            payload = {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            logger.info(f"Sending email via Resend to {to_email}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Email sent successfully to {to_email}")
                    return {"success": True, "error": None}
                else:
                    error_msg = f"Resend API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    return {"success": False, "error": error_msg}
        
        except Exception as e:
            error_msg = f"Error sending email via Resend: {str(e)}"
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
        send_result = await self.send_resend_email(
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
resend_email_service = ResendEmailService()
