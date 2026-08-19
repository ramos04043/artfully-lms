from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
import httpx
import os

router = APIRouter()

class ExpenseCreate(BaseModel):
    account_id: str
    category: str
    amount: float
    expense_date: date
    vendor_name: Optional[str] = None
    description: str
    receipt_url: Optional[str] = None
    payment_mode: str
    status: str = 'APPROVED'
    transaction_id: Optional[str] = None


class FinancialTransactionCreate(BaseModel):
    account_id: str
    transaction_type: str
    amount: float
    balance_after: float
    category: str
    description: str
    reference_type: str
    transaction_date: date


class AccountBalanceUpdate(BaseModel):
    account_id: str
    new_balance: float


@router.post("/transactions")
async def create_transaction(transaction: FinancialTransactionCreate):
    """Create a new financial transaction"""
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    url = f"{zendbx_url}/p/{project_slug}/v1/rest/financial_transactions"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': zendbx_key,
        'Authorization': f'Bearer {zendbx_key}',
        'Prefer': 'return=representation'
    }
    
    # Convert to dict and handle date serialization
    transaction_data = transaction.dict()
    if transaction_data.get('transaction_date'):
        transaction_data['transaction_date'] = transaction_data['transaction_date'].isoformat()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=transaction_data, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.patch("/accounts/balance")
async def update_account_balance(update: AccountBalanceUpdate):
    """Update account balance"""
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    url = f"{zendbx_url}/p/{project_slug}/v1/rest/financial_accounts?id=eq.{update.account_id}"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': zendbx_key,
        'Authorization': f'Bearer {zendbx_key}',
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.patch(url, json={'current_balance': update.new_balance}, headers=headers)
            response.raise_for_status()
            return {"success": True}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/expenses")
async def create_expense(expense: ExpenseCreate):
    """Create a new expense"""
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    url = f"{zendbx_url}/p/{project_slug}/v1/rest/expenses"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': zendbx_key,
        'Authorization': f'Bearer {zendbx_key}',
        'Prefer': 'return=representation'
    }
    
    # Convert to dict and handle date serialization
    expense_data = expense.dict()
    if expense_data.get('expense_date'):
        expense_data['expense_date'] = expense_data['expense_date'].isoformat()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=expense_data, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/expenses")
async def get_expenses():
    """Get all expenses"""
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    url = f"{zendbx_url}/p/{project_slug}/v1/rest/expenses?select=*&order=expense_date.desc"
    
    headers = {
        'apikey': zendbx_key,
        'Authorization': f'Bearer {zendbx_key}',
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
