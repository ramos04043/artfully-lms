from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.services.finance_service import FinanceService
from app.auth.deps import require_admin
from app.zendbx_client import db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ExpenseCreate(BaseModel):
    account_type: str  # OPEX or CAPEX
    account_mode: str  # BANK or CASH
    category_code: str  # Category code from transaction_categories
    amount: float
    expense_date: date
    vendor_name: Optional[str] = None
    description: str
    receipt_url: Optional[str] = None


@router.post("/expenses")
async def create_expense(
    expense: ExpenseCreate,
    current_user: dict = Depends(require_admin)
):
    """
    Create a new expense using centralized FinanceService
    
    This endpoint:
    1. Validates account type and mode
    2. Resolves the financial account
    3. Validates category for account type
    4. Creates expense business record
    5. Creates EXPENSE transaction via FinanceService
    6. Links transaction to expense
    7. Returns calculated balance
    """
    try:
        logger.info(f"Creating expense: {expense.category_code}, amount: {expense.amount}")
        
        # Step 1: Validate inputs
        if expense.account_type not in ('OPEX', 'CAPEX'):
            raise HTTPException(status_code=400, detail="account_type must be OPEX or CAPEX")
        
        if expense.account_mode not in ('BANK', 'CASH'):
            raise HTTPException(status_code=400, detail="account_mode must be BANK or CASH")
        
        if expense.amount <= 0:
            raise HTTPException(status_code=400, detail="amount must be positive")
        
        # Step 2: Resolve account
        try:
            account = await FinanceService.get_account_by_type_and_mode(
                account_type=expense.account_type,
                account_mode=expense.account_mode
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        account_id = account['id']
        account_name = account['account_name']
        
        logger.info(f"Using account: {account_name}")
        
        # Step 3: Build description
        full_description = f"{expense.category_code}"
        if expense.vendor_name:
            full_description += f" - {expense.vendor_name}"
        full_description += f": {expense.description}"
        
        # Step 4: Create expense business record first
        expense_data = {
            "account_id": account_id,
            "category": expense.category_code,
            "amount": expense.amount,
            "expense_date": expense.expense_date.isoformat(),
            "vendor_name": expense.vendor_name,
            "description": expense.description,
            "receipt_url": expense.receipt_url,
            "payment_mode": expense.account_mode,
            "status": "APPROVED"
        }
        
        expense_records = await db.insert("expenses", expense_data)
        
        if not expense_records:
            raise HTTPException(status_code=500, detail="Failed to create expense record")
        
        expense_record = expense_records[0]
        expense_id = expense_record['id']
        
        logger.info(f"Expense record created: {expense_id}")
        
        # Step 5: Create EXPENSE transaction via FinanceService
        try:
            transaction = await FinanceService.create_transaction(
                account_id=account_id,
                transaction_type="EXPENSE",
                amount=expense.amount,
                category_code=expense.category_code,
                description=full_description,
                reference_type="EXPENSE",
                reference_id=expense_id,
                transaction_date=expense.expense_date,
                created_by=current_user.get('email') or current_user.get('id')
            )
        except ValueError as e:
            # Rollback: delete expense record
            await db.delete("expenses", filters={"id": expense_id})
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            # Rollback: delete expense record
            await db.delete("expenses", filters={"id": expense_id})
            raise HTTPException(status_code=500, detail=f"Failed to create transaction: {str(e)}")
        
        transaction_id = transaction['id']
        
        logger.info(f"Transaction created: {transaction_id}")
        
        # Step 6: Link transaction to expense
        updated_expenses = await db.update(
            "expenses",
            data={"transaction_id": transaction_id},
            filters={"id": expense_id}
        )
        
        if not updated_expenses:
            logger.error("Failed to link transaction to expense")
            # Transaction and expense exist but not linked
        
        # Step 7: Get calculated balance
        calculated_balance = await FinanceService.get_account_balance(account_id)
        
        logger.info(f"Expense created successfully. Balance: {calculated_balance}")
        
        return {
            "message": "Expense created successfully",
            "expense_id": expense_id,
            "transaction_id": transaction_id,
            "account": account_name,
            "calculated_balance": float(calculated_balance),
            "expense": updated_expenses[0] if updated_expenses else expense_record
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Expense creation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Expense creation failed: {str(e)}")


@router.get("/expenses")
async def get_expenses():
    """Get all expenses"""
    try:
        expenses = await db.select(
            "expenses",
            order_by="expense_date.desc"
        )
        return expenses
    except Exception as e:
        logger.error(f"Failed to get expenses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get expenses: {str(e)}")


@router.post("/expenses/{expense_id}/void")
async def void_expense(
    expense_id: str,
    reason: str = "Expense voided by administrator",
    current_user: dict = Depends(require_admin)
):
    """
    Void an expense (soft delete with audit trail)
    
    This will:
    1. Mark expense as voided
    2. Void the linked financial transaction
    3. Update ledger balance automatically
    """
    try:
        logger.info(f"Voiding expense {expense_id}")
        
        # Step 1: Get expense record
        expenses = await db.select(
            "expenses",
            filters={"id": expense_id}
        )
        
        if not expenses:
            raise HTTPException(
                status_code=404,
                detail=f"Expense {expense_id} not found"
            )
        
        expense = expenses[0]
        
        # Check if already voided
        if expense.get('voided_at'):
            raise HTTPException(
                status_code=400,
                detail=f"Expense {expense_id} is already voided"
            )
        
        transaction_id = expense.get('transaction_id')
        
        if not transaction_id:
            raise HTTPException(
                status_code=400,
                detail=f"Expense {expense_id} has no linked transaction"
            )
        
        # Step 2: Void the financial transaction
        try:
            await FinanceService.void_transaction(
                transaction_id=transaction_id,
                voided_by=current_user.get('email') or current_user.get('id'),
                reason=reason
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Step 3: Mark expense as voided
        from datetime import datetime
        updated_expenses = await db.update(
            "expenses",
            data={
                "voided_at": datetime.now().isoformat(),
                "voided_by": current_user.get('email') or current_user.get('id'),
                "voided_reason": reason
            },
            filters={"id": expense_id}
        )
        
        if not updated_expenses:
            logger.warning(f"Could not update expense voided status: {expense_id}")
        
        logger.info(f"Expense {expense_id} voided successfully")
        
        return {
            "message": "Expense voided successfully",
            "expense_id": expense_id,
            "transaction_id": transaction_id,
            "status": "VOIDED"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to void expense: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to void expense: {str(e)}")


@router.get("/categories")
async def get_categories(
    account_type: Optional[str] = None,
    transaction_type: Optional[str] = None
):
    """
    Get available expense categories
    
    Query params:
    - account_type: Filter by OPEX or CAPEX
    - transaction_type: Filter by REVENUE or EXPENSE
    """
    try:
        categories = await FinanceService.get_categories(
            account_type=account_type,
            transaction_type=transaction_type
        )
        return categories
    except Exception as e:
        logger.error(f"Failed to get categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get categories: {str(e)}")
