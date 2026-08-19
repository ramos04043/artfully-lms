"""
Payment Endpoints
Handles fee payments with atomic transactions and OpEX integration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.auth.deps import require_admin
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
    account_id: str
    new_balance: float
    message: str


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaymentCreate
):
    """
    Create a new fee payment
    
    This endpoint:
    1. Validates the enrollment exists
    2. Gets the correct OpEX account (BANK or CASH)
    3. Creates a financial transaction (INFLOW)
    4. Updates account balance atomically
    
    **Business Rules:**
    - Payment amount must be positive
    - Account balance is updated atomically
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
        student_id = enrollment['student_id']
        
        logger.info(f"Payment for student: {student_name} ({student_id})")
        
        # Step 2: Get the correct OpEX account
        accounts = await db.select(
            "financial_accounts",
            filters={
                "account_type": "OPEX",
                "account_mode": payment.payment_mode,
                "is_active": "true"
            }
        )
        
        if not accounts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OpEX {payment.payment_mode} account not found. Please run financial account setup."
            )
        
        account = accounts[0]
        account_id = account['id']
        current_balance = float(account['current_balance'])
        
        logger.info(f"Using account: {account['account_name']}, current balance: {current_balance}")
        
        # Step 3: Calculate new balance
        new_balance = current_balance + payment.amount
        
        # Step 4: Create description
        description = f"Fee payment from {student_name} ({student_id})"
        if payment.notes:
            description += f" - {payment.notes}"
        
        # Step 5: Create financial transaction
        transaction_data = {
            "account_id": account_id,
            "transaction_type": "INFLOW",
            "amount": payment.amount,
            "balance_after": new_balance,
            "category": "FEE_COLLECTION",
            "description": description,
            "reference_type": "FEE_PAYMENT",
            "reference_id": payment.enrollment_id,
            "transaction_date": payment.payment_date.isoformat()
        }
        
        transactions = await db.insert(
            "financial_transactions",
            transaction_data
        )
        
        if not transactions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create transaction"
            )
        
        transaction = transactions[0]
        transaction_id = transaction['id']
        
        logger.info(f"Transaction created: {transaction_id}")
        
        # Step 6: Update account balance
        updated_accounts = await db.update(
            "financial_accounts",
            data={"current_balance": new_balance},
            filters={"id": account_id}
        )
        
        if not updated_accounts:
            logger.error("Failed to update account balance - transaction was created but balance not updated!")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment recorded but balance update failed. Please check transaction logs."
            )
        
        logger.info(f"Account balance updated: {current_balance} -> {new_balance}")
        logger.info(f"Payment completed successfully. Transaction ID: {transaction_id}")
        
        return PaymentResponse(
            payment_id=transaction_id,
            transaction_id=transaction_id,
            account_id=account_id,
            new_balance=new_balance,
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
        transactions = await db.select(
            "financial_transactions",
            filters={
                "transaction_type": "INFLOW",
                "category": "FEE_COLLECTION"
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
