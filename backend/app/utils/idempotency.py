"""
Idempotency utilities for preventing duplicate operations
"""
from datetime import date


def generate_daily_summary_key(target_date: date) -> str:
    """
    Generate idempotency key for daily class summary email
    Format: daily_class_summary_YYYY-MM-DD
    
    Example: daily_class_summary_2026-08-18
    """
    return f"daily_class_summary_{target_date.strftime('%Y-%m-%d')}"


def generate_fee_due_email_key(student_id: str, session_id: str) -> str:
    """
    Generate idempotency key for fee due email
    Format: fee_due_{student_id}_{session_id}
    
    Example: fee_due_123e4567-e89b-12d3-a456-426614174000_987fcdeb-51a2-43e1-b456-789012345678
    """
    return f"fee_due_{student_id}_{session_id}"


def generate_session_completion_key(student_id: str, session_id: str) -> str:
    """
    Generate idempotency key for session completion notification
    Format: session_complete_{student_id}_{session_id}
    """
    return f"session_complete_{student_id}_{session_id}"


def generate_payment_reminder_key(fee_due_id: str) -> str:
    """
    Generate idempotency key for payment reminder email
    Format: payment_reminder_{fee_due_id}
    """
    return f"payment_reminder_{fee_due_id}"
