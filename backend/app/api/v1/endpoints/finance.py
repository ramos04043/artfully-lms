"""
Finance Endpoints
New unified finance API for ledger-based operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal

from app.auth.deps import require_admin
from app.services.finance_service import FinanceService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class AccountBalanceResponse(BaseModel):
    """Account balance response"""
    id: str
    account_type: str
    account_mode: str
    account_name: str
    opening_balance: float
    calculated_balance: float
    is_active: bool


class VoidTransactionRequest(BaseModel):
    """Request to void a transaction"""
    voided_by: str = Field(..., description="Email or ID of staff member voiding the transaction")
    reason: str = Field(..., min_length=5, description="Reason for voiding (minimum 5 characters)")


class ManualRevenueRequest(BaseModel):
    """Manual revenue entry request"""
    account_type: str = Field(..., pattern="^(OPEX|CAPEX)$", description="OPEX or CAPEX")
    account_mode: str = Field(..., pattern="^(BANK|CASH)$", description="BANK or CASH")
    category_code: str = Field(..., description="Category code (e.g., STUDENT_FEES)")
    amount: float = Field(..., gt=0, description="Revenue amount (must be positive)")
    transaction_date: date = Field(default_factory=date.today, description="Transaction date")
    party_name: Optional[str] = Field(None, description="Name of party/source")
    reference: Optional[str] = Field(None, description="Reference number or document")
    description: str = Field(..., min_length=5, description="Description of revenue")
    created_by: Optional[str] = Field(None, description="Staff member creating the entry")


class CategoryResponse(BaseModel):
    """Transaction category response"""
    id: str
    code: str
    name: str
    account_type: str
    transaction_type: str
    description: Optional[str]
    display_order: int
    is_active: bool


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/accounts/balances", response_model=List[AccountBalanceResponse])
async def get_all_account_balances(current_user: dict = Depends(require_admin)):
    """
    Get calculated balances for all active accounts
    
    Returns balances calculated from ledger (ACTIVE transactions only)
    Does NOT use manually-maintained current_balance field
    """
    try:
        balances = await FinanceService.get_all_account_balances()
        return balances
        
    except Exception as e:
        logger.error(f"Failed to get account balances: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate account balances: {str(e)}"
        )


@router.get("/accounts/{account_id}/balance")
async def get_account_balance(account_id: str, current_user: dict = Depends(require_admin)):
    """
    Get calculated balance for a specific account
    
    Returns balance calculated from ledger (ACTIVE transactions only)
    """
    try:
        balance = await FinanceService.get_account_balance(account_id)
        
        return {
            "account_id": account_id,
            "calculated_balance": float(balance)
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get account balance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate balance: {str(e)}"
        )


@router.post("/transactions/{transaction_id}/void")
async def void_transaction(
    transaction_id: str,
    request: VoidTransactionRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Void a transaction (soft delete with audit trail)
    
    Transaction status changes to VOIDED and is excluded from balance calculations
    Original transaction remains in database for audit trail
    """
    try:
        updated_transaction = await FinanceService.void_transaction(
            transaction_id=transaction_id,
            voided_by=request.voided_by,
            reason=request.reason
        )
        
        return {
            "message": "Transaction voided successfully",
            "transaction_id": transaction_id,
            "voided_at": updated_transaction['voided_at'],
            "voided_by": updated_transaction['voided_by']
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to void transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to void transaction: {str(e)}"
        )


@router.post("/revenue", status_code=status.HTTP_201_CREATED)
async def create_manual_revenue(
    revenue: ManualRevenueRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Create manual revenue entry
    
    Use this for revenue that is NOT from student fee payments:
    - Capital contributions
    - Workshop fees (non-regular)
    - Material sales
    - Other operating revenue
    
    Student fee payments should use /api/payments/ endpoint instead
    """
    try:
        # Resolve account from account_type + account_mode
        account = await FinanceService.get_account_by_type_and_mode(
            account_type=revenue.account_type,
            account_mode=revenue.account_mode
        )
        
        # Build description
        description = revenue.description
        if revenue.party_name:
            description = f"{revenue.party_name}: {description}"
        if revenue.reference:
            description += f" (Ref: {revenue.reference})"
        
        # Create REVENUE transaction
        transaction = await FinanceService.create_transaction(
            account_id=account['id'],
            transaction_type="REVENUE",
            amount=revenue.amount,
            category_code=revenue.category_code,
            description=description,
            reference_type="MANUAL_REVENUE",
            reference_id=None,  # No specific record to reference
            transaction_date=revenue.transaction_date,
            created_by=revenue.created_by
        )
        
        # Get updated balance
        new_balance = await FinanceService.get_account_balance(account['id'])
        
        logger.info(
            f"Manual revenue created: {transaction['id']}, "
            f"amount={revenue.amount}, new_balance={new_balance}"
        )
        
        return {
            "message": "Revenue recorded successfully",
            "transaction_id": transaction['id'],
            "account_id": account['id'],
            "account_name": account['account_name'],
            "amount": revenue.amount,
            "new_balance": float(new_balance),
            "transaction_date": revenue.transaction_date.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Manual revenue creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create revenue: {str(e)}"
        )


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    account_type: Optional[str] = None,
    transaction_type: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """
    Get available transaction categories
    
    Query params:
    - account_type: Filter by OPEX or CAPEX
    - transaction_type: Filter by REVENUE or EXPENSE
    
    Returns only active categories, sorted by display_order
    """
    try:
        categories = await FinanceService.get_categories(
            account_type=account_type,
            transaction_type=transaction_type
        )
        
        return categories
        
    except Exception as e:
        logger.error(f"Failed to get categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get categories: {str(e)}"
        )


@router.get("/categories/{category_code}")
async def get_category(category_code: str, current_user: dict = Depends(require_admin)):
    """
    Get details of a specific category by code
    """
    try:
        categories = await FinanceService.get_categories()
        category = next((c for c in categories if c['code'] == category_code), None)
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category '{category_code}' not found"
            )
        
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get category: {str(e)}"
        )


@router.get("/summary")
async def get_financial_summary(current_user: dict = Depends(require_admin)):
    """
    Get financial summary for dashboard
    
    Returns:
    - Total balance across all accounts
    - Total revenue and expenses from transactions
    - Breakdown by OPEX and CAPEX
    - Breakdown by BANK and CASH
    """
    try:
        from app.zendbx_client import db
        
        # Get all account balances
        balances = await FinanceService.get_all_account_balances()
        
        # Calculate totals
        opex_cash = next((b['calculated_balance'] for b in balances 
                         if b['account_type'] == 'OPEX' and b['account_mode'] == 'CASH'), 0)
        opex_bank = next((b['calculated_balance'] for b in balances 
                         if b['account_type'] == 'OPEX' and b['account_mode'] == 'BANK'), 0)
        capex_cash = next((b['calculated_balance'] for b in balances 
                          if b['account_type'] == 'CAPEX' and b['account_mode'] == 'CASH'), 0)
        capex_bank = next((b['calculated_balance'] for b in balances 
                          if b['account_type'] == 'CAPEX' and b['account_mode'] == 'BANK'), 0)
        
        total_opex = opex_cash + opex_bank
        total_capex = capex_cash + capex_bank
        total_cash = opex_cash + capex_cash
        total_bank = opex_bank + capex_bank
        total_balance = total_opex + total_capex
        
        # Get revenue total (ACTIVE REVENUE + INFLOW for transition)
        revenue_txns = await db.select(
            "financial_transactions",
            columns="amount",
            filters={
                "transaction_type_in": "REVENUE,INFLOW",
                "status": "ACTIVE"
            }
        )
        total_revenue = sum(float(t['amount']) for t in revenue_txns)
        
        # Get expense total (ACTIVE EXPENSE + OUTFLOW for transition)
        expense_txns = await db.select(
            "financial_transactions",
            columns="amount",
            filters={
                "transaction_type_in": "EXPENSE,OUTFLOW",
                "status": "ACTIVE"
            }
        )
        total_expenses = sum(float(t['amount']) for t in expense_txns)
        
        return {
            "total_balance": total_balance,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "opex": {
                "cash": opex_cash,
                "bank": opex_bank,
                "total": total_opex
            },
            "capex": {
                "cash": capex_cash,
                "bank": capex_bank,
                "total": total_capex
            },
            "cash_total": total_cash,
            "bank_total": total_bank
        }
        
    except Exception as e:
        logger.error(f"Failed to get financial summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get financial summary: {str(e)}"
        )


@router.get("/integrity")
async def check_financial_integrity(current_user: dict = Depends(require_admin)):
    """
    Check financial data integrity
    
    Detects:
    - Payments without transaction_id (CRITICAL)
    - Payment/transaction linkage mismatches (CRITICAL)
    - Duplicate ACTIVE FEE_PAYMENT transactions (CRITICAL)
    - Expenses without transaction (CRITICAL)
    - EXPENSE transactions without expense (CRITICAL)
    - Duplicate ACTIVE EXPENSE transactions (CRITICAL)
    - Legacy fee transactions (INFORMATIONAL - not blocking)
    
    Returns counts and affected IDs for manual remediation
    Distinguishes between critical issues and legacy records
    """
    try:
        from app.zendbx_client import db
        from collections import Counter
        
        critical_issues = {}
        warnings = {}
        legacy_info = {}
        
        # 1. Payments without transaction_id (CRITICAL)
        payments_no_tx = await db.select(
            "payments",
            columns="id,amount,payment_date,transaction_id",
            raw_params={}
        )
        payments_no_tx = [p for p in payments_no_tx if p.get('transaction_id') is None]
        critical_issues["payments_without_transaction"] = {
            "count": len(payments_no_tx),
            "payment_ids": [p['id'] for p in payments_no_tx[:10]]
        }
        
        # 2. Analyze FEE_PAYMENT transactions
        fee_txns = await db.select(
            "financial_transactions",
            columns="id,reference_id,amount,transaction_type,category",
            filters={
                "reference_type": "FEE_PAYMENT",
                "status": "ACTIVE"
            }
        )
        
        # Get all payments for matching
        all_payments = await db.select(
            "payments",
            columns="id,transaction_id"
        )
        payment_ids = {p['id'] for p in all_payments}
        
        # Get all enrollments for legacy matching
        all_enrollments = await db.select(
            "enrollments",
            columns="id"
        )
        enrollment_ids = {e['id'] for e in all_enrollments}
        
        # Classify fee transactions
        true_orphans = []
        legacy_fee_txns = []
        payment_link_mismatches = []
        
        for tx in fee_txns:
            ref_id = tx.get('reference_id')
            if not ref_id:
                continue
            
            # Check if reference matches a payment
            if ref_id in payment_ids:
                # NEW FEE TRANSACTION - validate linkage
                matching_payments = [p for p in all_payments if p['id'] == ref_id]
                if matching_payments:
                    payment = matching_payments[0]
                    if payment.get('transaction_id') != tx['id']:
                        payment_link_mismatches.append({
                            "payment_id": ref_id,
                            "payment_transaction_id": payment.get('transaction_id'),
                            "actual_transaction_id": tx['id']
                        })
            # Check if reference matches an enrollment (LEGACY)
            elif ref_id in enrollment_ids:
                # LEGACY FEE TRANSACTION
                # Legacy transactions have:
                # - reference_id pointing to enrollments.id
                # - transaction_type = INFLOW (old) or category = FEE_COLLECTION (old)
                is_legacy = (
                    tx.get('transaction_type') == 'INFLOW' or
                    tx.get('category') == 'FEE_COLLECTION'
                )
                if is_legacy:
                    legacy_fee_txns.append(tx['id'])
                else:
                    # Unexpected: references enrollment but not legacy format
                    true_orphans.append(tx['id'])
            else:
                # TRUE ORPHAN: reference doesn't match payment or enrollment
                true_orphans.append(tx['id'])
        
        # Report legacy transactions as informational only
        legacy_info["legacy_fee_transactions"] = {
            "count": len(legacy_fee_txns),
            "transaction_ids": legacy_fee_txns[:10],
            "description": "Legacy transactions from previous architecture (INFLOW/FEE_COLLECTION)"
        }
        
        # Report true orphans as CRITICAL
        critical_issues["fee_transactions_without_payment"] = {
            "count": len(true_orphans),
            "transaction_ids": true_orphans[:10]
        }
        
        # Report payment linkage mismatches as CRITICAL
        critical_issues["payment_transaction_link_mismatch"] = {
            "count": len(payment_link_mismatches),
            "mismatches": payment_link_mismatches[:10]
        }
        
        # 3. Duplicate ACTIVE FEE_PAYMENT transactions (CRITICAL)
        fee_payment_refs = [tx.get('reference_id') for tx in fee_txns if tx.get('reference_id')]
        ref_counts = Counter(fee_payment_refs)
        duplicates = {ref: count for ref, count in ref_counts.items() if count > 1}
        
        critical_issues["duplicate_fee_transactions"] = {
            "count": len(duplicates),
            "payment_ids_with_duplicates": list(duplicates.keys())[:10]
        }
        
        # 4. Expenses without transaction (CRITICAL)
        expenses_no_tx = await db.select(
            "expenses",
            columns="id,amount,expense_date,transaction_id",
            raw_params={}
        )
        expenses_no_tx = [e for e in expenses_no_tx if e.get('transaction_id') is None]
        critical_issues["expenses_without_transaction"] = {
            "count": len(expenses_no_tx),
            "expense_ids": [e['id'] for e in expenses_no_tx[:10]]
        }
        
        # 5. EXPENSE transactions without expense (CRITICAL)
        expense_txns = await db.select(
            "financial_transactions",
            columns="id,reference_id,amount",
            filters={
                "reference_type": "EXPENSE",
                "status": "ACTIVE"
            }
        )
        
        orphaned_expense_txns = []
        for tx in expense_txns:
            ref_id = tx.get('reference_id')
            if ref_id:
                expenses = await db.select(
                    "expenses",
                    columns="id",
                    filters={"id": ref_id}
                )
                if not expenses:
                    orphaned_expense_txns.append(tx['id'])
        
        critical_issues["expense_transactions_without_expense"] = {
            "count": len(orphaned_expense_txns),
            "transaction_ids": orphaned_expense_txns[:10]
        }
        
        # 6. Duplicate ACTIVE EXPENSE transactions (CRITICAL)
        expense_refs = [tx.get('reference_id') for tx in expense_txns if tx.get('reference_id')]
        expense_ref_counts = Counter(expense_refs)
        expense_duplicates = {ref: count for ref, count in expense_ref_counts.items() if count > 1}
        
        critical_issues["duplicate_expense_transactions"] = {
            "count": len(expense_duplicates),
            "expense_ids_with_duplicates": list(expense_duplicates.keys())[:10]
        }
        
        # Calculate summary
        total_critical = sum(issue['count'] for issue in critical_issues.values())
        total_warnings = sum(warning['count'] for warning in warnings.values())
        total_legacy = sum(info['count'] for info in legacy_info.values())
        
        return {
            "summary": {
                "critical_issues": total_critical,
                "warnings": total_warnings,
                "legacy_records": total_legacy,
                "has_blocking_issues": total_critical > 0
            },
            "critical_issues": critical_issues,
            "warnings": warnings,
            "legacy_info": legacy_info,
            "recommendations": {
                "payments_without_transaction": "Use /api/finance/reconcile/{payment_id} to repair",
                "payment_transaction_link_mismatch": "Critical: Payment and transaction linkage broken",
                "orphaned_transactions": "Investigate and manually void if invalid",
                "duplicates": "Critical: Review immediately, void duplicates",
                "legacy_records": "Informational only - will be migrated in Phase 4"
            }
        }
        
    except Exception as e:
        logger.error(f"Integrity check failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integrity check failed: {str(e)}"
        )


@router.post("/reconcile/{payment_id}")
async def reconcile_payment(payment_id: str, current_user: dict = Depends(require_admin)):
    """
    Reconcile a payment with its financial transaction
    
    Repairs broken payment→transaction links where transaction exists
    but payments.transaction_id is NULL
    """
    try:
        result = await FinanceService.reconcile_payment_transaction(payment_id)
        
        if result['status'] == 'ERROR':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['message']
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reconciliation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reconciliation failed: {str(e)}"
        )
