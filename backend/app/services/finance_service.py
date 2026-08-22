"""
Finance Service - Single Source of Truth for Financial Operations
Implements ledger-based balance calculation and transaction management
"""
from typing import Optional, Dict, List, Any
from decimal import Decimal
from datetime import date, datetime
from app.zendbx_client import db
import logging

logger = logging.getLogger(__name__)


class FinanceService:
    """Centralized service for all financial operations"""
    
    @staticmethod
    async def get_account_balance(
        account_id: str, 
        as_of: Optional[datetime] = None,
        include_pending: bool = True
    ) -> Decimal:
        """
        Calculate account balance from ledger (single source of truth)
        
        Args:
            account_id: Account UUID
            as_of: Calculate balance as of this timestamp (default: now)
            include_pending: Include transactions up to current time
        
        Returns:
            Current balance calculated from ACTIVE transactions only
        """
        try:
            # Get account opening balance
            accounts = await db.select(
                "financial_accounts",
                filters={"id": account_id}
            )
            
            if not accounts:
                raise ValueError(f"Account {account_id} not found")
            
            opening_balance = Decimal(str(accounts[0]['opening_balance']))
            
            # Build filters for ACTIVE transactions only
            filters = {
                "account_id": account_id,
                "status": "ACTIVE"  # Only count ACTIVE transactions
            }
            
            # Get all REVENUE transactions (money IN)
            revenue_txns = await db.select(
                "financial_transactions",
                columns="amount",
                filters={
                    **filters,
                    "transaction_type_in": "REVENUE,INFLOW"  # Support both for transition
                }
            )
            
            total_revenue = sum(Decimal(str(t['amount'])) for t in revenue_txns)
            
            # Get all EXPENSE transactions (money OUT)
            expense_txns = await db.select(
                "financial_transactions",
                columns="amount",
                filters={
                    **filters,
                    "transaction_type_in": "EXPENSE,OUTFLOW"  # Support both for transition
                }
            )
            
            total_expenses = sum(Decimal(str(t['amount'])) for t in expense_txns)
            
            # Calculate balance: Opening + Revenue - Expenses
            balance = opening_balance + total_revenue - total_expenses
            
            logger.info(
                f"Account {account_id} balance calculation: "
                f"Opening={opening_balance}, Revenue={total_revenue}, "
                f"Expenses={total_expenses}, Balance={balance}"
            )
            
            return balance
            
        except Exception as e:
            logger.error(f"Error calculating balance for account {account_id}: {str(e)}")
            raise
    
    @staticmethod
    async def get_all_account_balances() -> List[Dict[str, Any]]:
        """
        Get current balances for all active accounts
        
        Returns:
            List of accounts with calculated balances
        """
        try:
            accounts = await db.select(
                "financial_accounts",
                filters={"is_active": "true"}
            )
            
            result = []
            for account in accounts:
                calculated_balance = await FinanceService.get_account_balance(account['id'])
                result.append({
                    "id": account['id'],
                    "account_type": account['account_type'],
                    "account_mode": account['account_mode'],
                    "account_name": account['account_name'],
                    "opening_balance": float(account['opening_balance']),
                    "calculated_balance": float(calculated_balance),
                    "is_active": account['is_active']
                })
            
            logger.info(f"Calculated balances for {len(result)} accounts")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating all account balances: {str(e)}")
            raise
    
    @staticmethod
    async def create_transaction(
        account_id: str,
        transaction_type: str,
        amount: float,
        category_code: str,
        description: str,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        transaction_date: Optional[date] = None,
        created_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a financial transaction (atomic operation)
        
        Args:
            account_id: Account UUID
            transaction_type: REVENUE or EXPENSE
            amount: Transaction amount (must be positive)
            category_code: Category code from transaction_categories
            description: Transaction description
            reference_type: Optional reference type (e.g., FEE_PAYMENT, EXPENSE)
            reference_id: Optional reference ID
            transaction_date: Transaction date (default: today)
            created_by: User who created the transaction
        
        Returns:
            Created transaction record with calculated balance_after
        """
        try:
            if transaction_date is None:
                transaction_date = date.today()
            
            amount_decimal = Decimal(str(amount))
            
            if amount_decimal <= 0:
                raise ValueError("Transaction amount must be positive")
            
            if transaction_type not in ('REVENUE', 'EXPENSE'):
                raise ValueError(f"Invalid transaction type: {transaction_type}. Must be REVENUE or EXPENSE")
            
            # Validate category
            category = await FinanceService.validate_category(
                account_id, 
                transaction_type, 
                category_code
            )
            
            # Calculate current balance
            current_balance = await FinanceService.get_account_balance(account_id)
            
            # Calculate balance after transaction
            if transaction_type == "REVENUE":
                balance_after = current_balance + amount_decimal
            else:  # EXPENSE
                balance_after = current_balance - amount_decimal
            
            # Create transaction record
            transaction_data = {
                "account_id": account_id,
                "transaction_type": transaction_type,
                "amount": float(amount_decimal),
                "balance_after": float(balance_after),  # Snapshot for audit
                "category": category['code'],  # Keep legacy field populated
                "category_id": category['id'],  # New authoritative field
                "description": description,
                "reference_type": reference_type,
                "reference_id": reference_id,
                "transaction_date": transaction_date.isoformat(),
                "status": "ACTIVE"
                # Note: created_by column doesn't exist in actual table
            }
            
            transactions = await db.insert(
                "financial_transactions",
                transaction_data
            )
            
            if not transactions:
                raise Exception("Failed to create transaction")
            
            transaction = transactions[0]
            
            logger.info(
                f"Transaction created: {transaction['id']}, "
                f"type={transaction_type}, amount={amount_decimal}, "
                f"balance_after={balance_after}"
            )
            
            return transaction
            
        except Exception as e:
            logger.error(f"Transaction creation failed: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    async def void_transaction(
        transaction_id: str,
        voided_by: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Void a transaction (soft delete with audit trail)
        
        Args:
            transaction_id: Transaction UUID to void
            voided_by: Staff member voiding the transaction
            reason: Reason for voiding
        
        Returns:
            Updated transaction record
        """
        try:
            # Check transaction exists and is ACTIVE
            transactions = await db.select(
                "financial_transactions",
                filters={"id": transaction_id}
            )
            
            if not transactions:
                raise ValueError(f"Transaction {transaction_id} not found")
            
            transaction = transactions[0]
            
            if transaction.get('status') == 'VOIDED':
                raise ValueError(f"Transaction {transaction_id} is already voided")
            
            # Update transaction to VOIDED status
            now = datetime.now()
            
            # Format timestamp for PostgreSQL with timezone
            voided_timestamp = now.strftime('%Y-%m-%dT%H:%M:%S.%f%z')
            if not voided_timestamp.endswith('+00:00') and not voided_timestamp.endswith('Z'):
                # Add UTC timezone if not present
                voided_timestamp = now.strftime('%Y-%m-%dT%H:%M:%S.%f') + '+00:00'
            
            logger.info(f"Attempting to void transaction {transaction_id}")
            logger.info(f"Voided timestamp: {voided_timestamp}")
            
            updated = await db.update(
                "financial_transactions",
                data={
                    "status": "VOIDED",
                    "voided_at": voided_timestamp,
                    "voided_by": voided_by,
                    "voided_reason": reason
                },
                filters={"id": transaction_id}
            )
            
            logger.info(f"Update completed successfully")
            
            if not updated or len(updated) == 0:
                # Update succeeded but no data returned, fetch the updated record
                logger.info("No data returned from update, fetching updated transaction")
                transactions = await db.select(
                    "financial_transactions",
                    filters={"id": transaction_id}
                )
                if not transactions:
                    raise ValueError(f"Transaction {transaction_id} was voided but could not be retrieved")
                updated_transaction = transactions[0]
            else:
                updated_transaction = updated[0]
            
            logger.info(
                f"Transaction voided: {transaction_id} by {voided_by}, "
                f"reason: {reason}"
            )
            
            return updated_transaction
            
        except Exception as e:
            logger.error(f"Void transaction failed: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    async def validate_category(
        account_id: str,
        transaction_type: str,
        category_code: str
    ) -> Dict[str, Any]:
        """
        Validate that category is valid for account type and transaction type
        
        Args:
            account_id: Account UUID
            transaction_type: REVENUE or EXPENSE
            category_code: Category code to validate
        
        Returns:
            Category record if valid
        
        Raises:
            ValueError: If category is invalid for the account/transaction type
        """
        try:
            # Get account details
            accounts = await db.select(
                "financial_accounts",
                filters={"id": account_id}
            )
            
            if not accounts:
                raise ValueError(f"Account {account_id} not found")
            
            account = accounts[0]
            account_type = account['account_type']  # OPEX or CAPEX
            
            # Look up category
            categories = await db.select(
                "transaction_categories",
                filters={
                    "code": category_code,
                    "account_type": account_type,
                    "transaction_type": transaction_type,
                    "is_active": "true"
                }
            )
            
            if not categories:
                raise ValueError(
                    f"Invalid category '{category_code}' for "
                    f"{account_type} {transaction_type}. "
                    f"Please select a valid category."
                )
            
            return categories[0]
            
        except Exception as e:
            logger.error(f"Category validation failed: {str(e)}")
            raise
    
    @staticmethod
    async def get_categories(
        account_type: Optional[str] = None,
        transaction_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get available transaction categories
        
        Args:
            account_type: Filter by OPEX or CAPEX (optional)
            transaction_type: Filter by REVENUE or EXPENSE (optional)
        
        Returns:
            List of active categories
        """
        try:
            filters = {"is_active": "true"}
            
            if account_type:
                filters["account_type"] = account_type
            
            if transaction_type:
                filters["transaction_type"] = transaction_type
            
            categories = await db.select(
                "transaction_categories",
                filters=filters,
                order_by="display_order.asc"
            )
            
            return categories
            
        except Exception as e:
            logger.error(f"Failed to fetch categories: {str(e)}")
            raise
    
    @staticmethod
    async def get_account_by_type_and_mode(
        account_type: str,
        account_mode: str
    ) -> Dict[str, Any]:
        """
        Get account by type and mode
        
        Args:
            account_type: OPEX or CAPEX
            account_mode: BANK or CASH
        
        Returns:
            Account record
        
        Raises:
            ValueError: If account not found
        """
        try:
            accounts = await db.select(
                "financial_accounts",
                filters={
                    "account_type": account_type,
                    "account_mode": account_mode,
                    "is_active": "true"
                }
            )
            
            if not accounts:
                raise ValueError(
                    f"Account not found for {account_type} {account_mode}"
                )
            
            return accounts[0]
            
        except Exception as e:
            logger.error(f"Failed to get account: {str(e)}")
            raise
    
    @staticmethod
    async def reconcile_payment_transaction(payment_id: str) -> Dict[str, Any]:
        """
        Reconcile payment with its financial transaction
        
        Repairs broken payment→transaction links where transaction exists
        but payments.transaction_id is NULL
        
        Args:
            payment_id: Payment UUID to reconcile
        
        Returns:
            Reconciliation result with status and actions taken
        """
        try:
            # Get payment record
            payments = await db.select(
                "payments",
                filters={"id": payment_id}
            )
            
            if not payments:
                return {
                    "status": "ERROR",
                    "message": f"Payment {payment_id} not found"
                }
            
            payment = payments[0]
            existing_transaction_id = payment.get('transaction_id')
            
            # If transaction_id exists, verify the transaction
            if existing_transaction_id:
                transactions = await db.select(
                    "financial_transactions",
                    filters={"id": existing_transaction_id}
                )
                
                if transactions:
                    return {
                        "status": "OK",
                        "message": "Payment already linked to valid transaction",
                        "payment_id": payment_id,
                        "transaction_id": existing_transaction_id
                    }
                else:
                    logger.warning(f"Payment {payment_id} links to non-existent transaction {existing_transaction_id}")
            
            # Find transaction by reference
            candidate_transactions = await db.select(
                "financial_transactions",
                filters={
                    "reference_type": "FEE_PAYMENT",
                    "reference_id": payment_id,
                    "status": "ACTIVE"
                }
            )
            
            if len(candidate_transactions) == 0:
                return {
                    "status": "ERROR",
                    "message": "No ledger transaction found for this payment",
                    "payment_id": payment_id,
                    "action": "MANUAL_INTERVENTION_REQUIRED"
                }
            
            if len(candidate_transactions) > 1:
                return {
                    "status": "ERROR",
                    "message": f"Multiple ACTIVE transactions found for payment {payment_id}",
                    "payment_id": payment_id,
                    "transaction_ids": [t['id'] for t in candidate_transactions],
                    "action": "DUPLICATE_INTEGRITY_VIOLATION"
                }
            
            # Exactly one transaction found - repair the link
            transaction = candidate_transactions[0]
            transaction_id = transaction['id']
            
            updated = await db.update(
                "payments",
                data={"transaction_id": transaction_id},
                filters={"id": payment_id}
            )
            
            if updated:
                logger.info(f"Reconciled payment {payment_id} → transaction {transaction_id}")
                return {
                    "status": "REPAIRED",
                    "message": "Payment successfully linked to transaction",
                    "payment_id": payment_id,
                    "transaction_id": transaction_id
                }
            else:
                return {
                    "status": "ERROR",
                    "message": "Failed to update payment record",
                    "payment_id": payment_id
                }
                
        except Exception as e:
            logger.error(f"Reconciliation failed for payment {payment_id}: {str(e)}")
            return {
                "status": "ERROR",
                "message": str(e),
                "payment_id": payment_id
            }
