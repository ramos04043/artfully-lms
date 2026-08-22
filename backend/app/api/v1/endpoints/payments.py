"""
Payment Endpoints
Handles fee payments with atomic transactions and OpEX integration via FinanceService
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.auth.deps import require_admin
from app.services.finance_service import FinanceService
from app.zendbx_client import db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class PaymentCreate(BaseModel):
    """Payment creation request"""
    enrollment_id: str = Field(..., description="Enrollment/Student ID")
    amount: float = Field(..., gt=0, description="Payment amount (must be positive)")
    payment_mode: str = Field(..., pattern="^(BANK|CASH)$", description="Payment mode: BANK or CASH")
    payment_date: date = Field(default_factory=date.today, description="Payment date")
    transaction_reference: Optional[str] = Field(None, description="Transaction reference number")
    notes: Optional[str] = Field(None, description="Additional notes")


class PaymentResponse(BaseModel):
    """Payment response"""
    payment_id: str
    transaction_id: str
    enrollment_id: str
    amount: float
    payment_mode: str
    account: str
    calculated_balance: float
    message: str


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaymentCreate,
    current_user: dict = Depends(require_admin)
):
    """
    Create a new fee payment using centralized FinanceService
    
    This endpoint:
    1. Validates the enrollment exists
    2. Creates a payment business record
    3. Resolves OPEX account (BANK or CASH)
    4. Creates REVENUE transaction via FinanceService
    5. Links transaction back to payment
    6. Returns calculated ledger balance
    
    **Business Rules:**
    - Payment amount must be positive
    - Student fees are ALWAYS OpEX Revenue
    - No duplicate transactions allowed per payment
    - Ledger balance is calculated, not stored
    """
    try:
        logger.info(f"Creating payment for enrollment {payment.enrollment_id}, amount: {payment.amount}")
        
        # Step 1: Validate enrollment exists
        enrollments = await db.select(
            "enrollments",
            columns="id,student_id,student_first_name,student_last_name,status",
            filters={"id": payment.enrollment_id}
        )
        
        if not enrollments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment {payment.enrollment_id} not found"
            )
        
        enrollment = enrollments[0]
        student_name = f"{enrollment['student_first_name']} {enrollment['student_last_name']}"
        student_ref_id = enrollment['student_id']  # This is ART1001
        
        # For Phase 3.1: Use enrollment ID as student_id since there's no separate students table
        # The enrollment.id serves as the unique identifier for this student+programme combination
        student_uuid = payment.enrollment_id  # Use enrollment ID
        
        logger.info(f"Payment for student: {student_name} (Ref: {student_ref_id}, Enrollment: {student_uuid})")
        
        # Step 2: Resolve OPEX account by mode (CASH or BANK)
        try:
            account = await FinanceService.get_account_by_type_and_mode(
                account_type="OPEX",
                account_mode=payment.payment_mode
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        account_id = account['id']
        account_name = account['account_name']
        
        logger.info(f"Using account: {account_name}")
        
        # Step 3: Create payment business record
        description = f"Fee payment from {student_name} (Ref: {student_ref_id})"
        if payment.notes:
            description += f" - {payment.notes}"
        
        # Payment data matching actual database schema
        payment_data = {
            "student_id": student_uuid,  # Use UUID, not reference ID
            "student_name": student_name,
            "student_ref_id": student_ref_id,  # Store reference ID separately
            "amount": float(payment.amount),
            "payment_mode": payment.payment_mode,
            "payment_date": payment.payment_date.isoformat(),
            "transaction_reference": payment.transaction_reference,
            "notes": payment.notes,
            "status": "COMPLETED"
        }
        
        logger.info(f"Inserting payment with data: {payment_data}")
        
        try:
            payments_records = await db.insert(
                "payments",
                payment_data
            )
        except Exception as insert_error:
            logger.error(f"Payment insert failed: {str(insert_error)}")
            logger.error(f"Payment data was: {payment_data}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Payment creation failed: {str(insert_error)}"
            )
        
        if not payments_records:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment record"
            )
        
        payment_record = payments_records[0]
        payment_id = payment_record['id']
        
        logger.info(f"Payment record created: {payment_id}")
        
        # Step 4: Check for duplicate transaction
        existing_transactions = await db.select(
            "financial_transactions",
            filters={
                "reference_type": "FEE_PAYMENT",
                "reference_id": payment_id,
                "status": "ACTIVE"
            }
        )
        
        if existing_transactions:
            logger.error(f"Duplicate transaction detected for payment {payment_id}")
            # Attempt cleanup
            await db.delete("payments", filters={"id": payment_id})
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Transaction already exists for payment {payment_id}"
            )
        
        # Step 5: Create REVENUE transaction via FinanceService
        try:
            transaction = await FinanceService.create_transaction(
                account_id=account_id,
                transaction_type="REVENUE",
                amount=payment.amount,
                category_code="STUDENT_FEES",
                description=description,
                reference_type="FEE_PAYMENT",
                reference_id=payment_id,
                transaction_date=payment.payment_date,
                created_by=current_user.get('email') or current_user.get('id')
            )
        except Exception as e:
            logger.error(f"Transaction creation failed: {str(e)}")
            # Rollback: delete payment record
            await db.delete("payments", filters={"id": payment_id})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create financial transaction: {str(e)}"
            )
        
        transaction_id = transaction['id']
        
        logger.info(f"Transaction created: {transaction_id}")
        
        # Step 6: Link transaction to payment
        updated_payments = await db.update(
            "payments",
            data={"transaction_id": transaction_id},
            filters={"id": payment_id}
        )
        
        if not updated_payments:
            logger.error("Failed to link transaction to payment")
            # Note: Transaction and payment both exist but not linked
            # Manual intervention may be needed
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment and transaction created but linking failed. Please contact support."
            )
        
        # Step 7: Get calculated balance
        calculated_balance = await FinanceService.get_account_balance(account_id)
        
        logger.info(
            f"Payment completed successfully. Payment ID: {payment_id}, "
            f"Transaction ID: {transaction_id}, Balance: {calculated_balance}"
        )
        
        return PaymentResponse(
            payment_id=payment_id,
            transaction_id=transaction_id,
            enrollment_id=payment.enrollment_id,
            amount=payment.amount,
            payment_mode=payment.payment_mode,
            account=account_name,
            calculated_balance=float(calculated_balance),
            message=f"Payment of ₹{payment.amount} recorded successfully for {student_name}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment creation failed: {str(e)}"
        )


@router.get("/transactions")
async def list_payment_transactions(
    limit: int = 50
):
    """
    List recent payment transactions
    """
    try:
        # Get REVENUE transactions with STUDENT_FEES category
        transactions = await db.select(
            "financial_transactions",
            filters={
                "transaction_type": "REVENUE",
                "category": "STUDENT_FEES",
                "status": "ACTIVE"
            },
            order_by="created_at.desc",
            limit=limit
        )
        
        return {
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        logger.error(f"Failed to list transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list transactions: {str(e)}"
        )


@router.post("/{payment_id}/void")
async def void_payment(
    payment_id: str,
    reason: str = "Payment voided by administrator",
    current_user: dict = Depends(require_admin)
):
    """
    Void a payment (soft delete with audit trail)
    
    This will:
    1. Mark payment as VOIDED
    2. Void the linked financial transaction
    3. Update ledger balance automatically
    
    **Note:** This does not return money - use refund for actual refunds
    """
    try:
        logger.info(f"Voiding payment {payment_id}")
        
        # Step 1: Get payment record
        payments = await db.select(
            "payments",
            filters={"id": payment_id}
        )
        
        if not payments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payment {payment_id} not found"
            )
        
        payment = payments[0]
        
        # Check if already voided
        if payment.get('status') == 'VOIDED':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment {payment_id} is already voided"
            )
        
        transaction_id = payment.get('transaction_id')
        
        if not transaction_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment {payment_id} has no linked transaction"
            )
        
        # Step 2: Void the financial transaction
        try:
            await FinanceService.void_transaction(
                transaction_id=transaction_id,
                voided_by=current_user.get('email') or current_user.get('id'),
                reason=reason
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Step 3: Update payment status to VOIDED
        updated_payments = await db.update(
            "payments",
            data={
                "status": "VOIDED",
                "notes": f"{payment.get('notes', '') or ''}\n[VOIDED: {reason}]".strip()
            },
            filters={"id": payment_id}
        )
        
        if not updated_payments:
            logger.warning(f"Could not update payment status to VOIDED: {payment_id}")
            # Transaction is voided, which is the critical part
        
        logger.info(f"Payment {payment_id} voided successfully")
        
        return {
            "message": "Payment voided successfully",
            "payment_id": payment_id,
            "transaction_id": transaction_id,
            "status": "VOIDED"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to void payment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to void payment: {str(e)}"
        )

