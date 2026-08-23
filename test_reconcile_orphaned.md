# Test Orphaned Expense Reconciliation

## Option 1: Use the Backend API Endpoint

Call this endpoint to automatically find and fix orphaned expenses:

```bash
POST http://localhost:8000/api/expenses/expenses/reconcile-orphaned
Authorization: Bearer YOUR_TOKEN
```

OR from the browser console on your frontend:

```javascript
const token = localStorage.getItem('zendbx_token');
const API_URL = 'http://localhost:8000'; // or your API URL

fetch(`${API_URL}/api/expenses/expenses/reconcile-orphaned`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(result => {
  console.log('Reconciliation result:', result);
  console.log(`Found: ${result.orphaned_found}`);
  console.log(`Fixed: ${result.fixed}`);
  console.log(`Errors: ${result.errors}`);
})
.catch(err => console.error('Error:', err));
```

## Option 2: Run the SQL Script

If you prefer SQL, run the `fix_orphaned_voided_expense.sql` file.

## After Reconciliation

1. **Hard refresh the expenses page**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. The ₹54,120 expense should disappear
3. The totals should be recalculated without that amount
4. Your account balance was already correct (because the transaction was voided)

## What This Fixes

This fixes the issue where:
- Transaction is VOIDED ✅ (balance correct)
- Expense is NOT marked as voided ❌ (appears in UI)

After reconciliation:
- Transaction is VOIDED ✅
- Expense is marked as voided ✅
- Disappears from UI ✅
- Totals exclude the amount ✅
