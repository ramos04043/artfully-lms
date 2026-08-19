export type AccountType = 'CAPEX' | 'OPEX'
export type AccountMode = 'BANK' | 'CASH'
export type TransactionType = 'INFLOW' | 'OUTFLOW' | 'ADJUSTMENT' | 'REVERSAL'
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FinancialAccount {
  id: string
  account_type: AccountType
  account_mode: AccountMode
  account_name: string
  current_balance: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FinancialTransaction {
  id: string
  account_id: string
  transaction_type: TransactionType
  amount: number
  balance_after: number
  category?: string
  description: string
  reference_type?: string
  reference_id?: string
  transaction_date: string
  created_by?: string
  is_reversed: boolean
  reversed_by_transaction_id?: string
  created_at: string
  account?: FinancialAccount
  created_by_user?: any
}

export interface Expense {
  id: string
  account_id: string
  category: string
  amount: number
  expense_date: string
  vendor_name?: string
  description: string
  receipt_url?: string
  payment_mode: PaymentMode
  created_by?: string
  approved_by?: string
  status: ExpenseStatus
  transaction_id?: string
  created_at: string
  updated_at: string
  account?: FinancialAccount
  created_by_user?: any
  approved_by_user?: any
}

export interface CreateExpenseDTO {
  account_id: string
  category: string
  amount: number
  expense_date: string
  vendor_name?: string
  description: string
  payment_mode: PaymentMode
}

export interface FinancialSummary {
  capex_bank_balance: number
  capex_cash_balance: number
  opex_bank_balance: number
  opex_cash_balance: number
  total_capex: number
  total_opex: number
  monthly_revenue: number
  monthly_expenses: number
  net_position: number
}

export interface TransactionFilter {
  account_id?: string
  transaction_type?: TransactionType
  start_date?: string
  end_date?: string
  category?: string
}
