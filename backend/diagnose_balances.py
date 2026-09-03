"""
Finance Balance Diagnostic Tool
Analyzes account balances and transaction breakdown
"""
import asyncio
from app.zendbx_client import db
from decimal import Decimal

async def diagnose_finances():
    print("=" * 80)
    print("FINANCE BALANCE DIAGNOSTIC REPORT")
    print("=" * 80)
    
    # Get all accounts
    accounts = await db.select(
        "financial_accounts",
        filters={"is_active": "true"}
    )
    
    for account in accounts:
        account_id = account['id']
        account_name = account['account_name']
        account_type = account['account_type']
        account_mode = account['account_mode']
        opening_balance = Decimal(str(account['opening_balance']))
        
        print(f"\n{'=' * 80}")
        print(f"📊 {account_name} ({account_type} - {account_mode})")
        print(f"{'=' * 80}")
        print(f"Opening Balance: ₹{opening_balance:,.2f}")
        
        # Get REVENUE transactions
        revenue_txns = await db.select(
            "financial_transactions",
            columns="id,amount,category,description,transaction_date,status",
            filters={
                "account_id": account_id,
                "transaction_type_in": "REVENUE,INFLOW",
                "status": "ACTIVE"
            }
        )
        
        total_revenue = sum(Decimal(str(t['amount'])) for t in revenue_txns)
        print(f"\n💰 REVENUE (ACTIVE):")
        print(f"   Count: {len(revenue_txns)} transactions")
        print(f"   Total: ₹{total_revenue:,.2f}")
        
        if len(revenue_txns) > 0 and len(revenue_txns) <= 10:
            print(f"   Details:")
            for txn in revenue_txns[:10]:
                print(f"   - ₹{Decimal(str(txn['amount'])):,.2f} | {txn['category']} | {txn['description'][:50]}")
        
        # Get EXPENSE transactions
        expense_txns = await db.select(
            "financial_transactions",
            columns="id,amount,category,description,transaction_date,status",
            filters={
                "account_id": account_id,
                "transaction_type_in": "EXPENSE,OUTFLOW",
                "status": "ACTIVE"
            }
        )
        
        total_expenses = sum(Decimal(str(t['amount'])) for t in expense_txns)
        print(f"\n💸 EXPENSES (ACTIVE):")
        print(f"   Count: {len(expense_txns)} transactions")
        print(f"   Total: ₹{total_expenses:,.2f}")
        
        if len(expense_txns) > 0 and len(expense_txns) <= 10:
            print(f"   Details:")
            for txn in expense_txns[:10]:
                print(f"   - ₹{Decimal(str(txn['amount'])):,.2f} | {txn['category']} | {txn['description'][:50]}")
        
        # Calculate balance
        calculated_balance = opening_balance + total_revenue - total_expenses
        
        print(f"\n📈 BALANCE CALCULATION:")
        print(f"   Opening:  ₹{opening_balance:,.2f}")
        print(f"   + Revenue: ₹{total_revenue:,.2f}")
        print(f"   - Expenses: ₹{total_expenses:,.2f}")
        print(f"   ────────────────────────")
        print(f"   = Balance: ₹{calculated_balance:,.2f}")
        
        if calculated_balance < 0:
            print(f"\n   ⚠️  WARNING: NEGATIVE BALANCE!")
            print(f"   Expenses exceed revenue by ₹{abs(calculated_balance):,.2f}")
    
    # Overall summary
    print(f"\n\n{'=' * 80}")
    print("📊 OVERALL SUMMARY")
    print(f"{'=' * 80}")
    
    # Get all ACTIVE transactions
    all_revenue = await db.select(
        "financial_transactions",
        columns="amount",
        filters={
            "transaction_type_in": "REVENUE,INFLOW",
            "status": "ACTIVE"
        }
    )
    
    all_expenses = await db.select(
        "financial_transactions",
        columns="amount",
        filters={
            "transaction_type_in": "EXPENSE,OUTFLOW",
            "status": "ACTIVE"
        }
    )
    
    total_all_revenue = sum(Decimal(str(t['amount'])) for t in all_revenue)
    total_all_expenses = sum(Decimal(str(t['amount'])) for t in all_expenses)
    total_all_openings = sum(Decimal(str(a['opening_balance'])) for a in accounts)
    net_position = total_all_openings + total_all_revenue - total_all_expenses
    
    print(f"\nAll Accounts Opening Balance: ₹{total_all_openings:,.2f}")
    print(f"Total Revenue (ACTIVE):       ₹{total_all_revenue:,.2f}")
    print(f"Total Expenses (ACTIVE):      ₹{total_all_expenses:,.2f}")
    print(f"────────────────────────────────────────")
    print(f"Net Position:                 ₹{net_position:,.2f}")
    
    if net_position < 0:
        print(f"\n⚠️  Your expenses exceed revenue by ₹{abs(net_position):,.2f}")
        print(f"\nPossible reasons:")
        print(f"  1. Capital expenses recorded without capital contributions")
        print(f"  2. Opening balances not set correctly")
        print(f"  3. Missing revenue entries")
        print(f"  4. Duplicate expense entries")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    asyncio.run(diagnose_finances())
