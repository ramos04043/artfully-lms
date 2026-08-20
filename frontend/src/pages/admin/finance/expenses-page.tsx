import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { 
  Plus, 
  Search, 
  Filter, 
  CreditCard, 
  Banknote, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Receipt,
  TrendingDown,
  Edit,
  Save,
  X,
  Trash2
} from 'lucide-react'

interface Expense {
  id: string
  account_id: string
  category: string
  amount: number
  expense_date: string
  vendor_name?: string
  description: string
  receipt_url?: string
  payment_mode: string
  status: string
  transaction_id?: string
  created_at: string
}

interface FinancialAccount {
  id: string
  account_type: string
  account_mode: string
  account_name: string
  current_balance: number
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add Expense Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [accountType, setAccountType] = useState<'OPEX' | 'CAPEX'>('OPEX')
  const [paymentMode, setPaymentMode] = useState<'BANK' | 'CASH'>('BANK')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Expense>>({})

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAccountType, setFilterAccountType] = useState<string>('all')
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Common expense categories
  const expenseCategories = [
    'Rent',
    'Utilities',
    'Salaries',
    'Art Supplies',
    'Equipment',
    'Marketing',
    'Maintenance',
    'Office Supplies',
    'Software/Subscriptions',
    'Transportation',
    'Food & Beverages',
    'Professional Services',
    'Insurance',
    'Other'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load financial accounts
      const { data: accountsData, error: accountsError } = await db
        .from('financial_accounts')
        .select('*')
        .eq('is_active', true)

      if (accountsError) throw accountsError
      setAccounts((accountsData || []) as FinancialAccount[])

      // Load expenses
      const { data: expensesData, error: expensesError } = await db
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (expensesError) throw expensesError
      setExpenses((expensesData || []) as Expense[])
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (!category || !amount || !description || !expenseDate) {
        setError('Please fill all required fields')
        return
      }

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('Please enter a valid amount')
        return
      }

      // Find the account based on account type and payment mode
      const account = accounts.find(
        (acc) => acc.account_type === accountType && acc.account_mode === paymentMode
      )

      if (!account) {
        setError(`Financial account for ${accountType} - ${paymentMode} not found.`)
        return
      }

      // Calculate new balance (subtract expense)
      const newBalance = account.current_balance - amountNum

      // Step 1: Create financial transaction (EXPENSE type)
      const transactionResponse = await fetch('http://localhost:8000/api/expenses/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          transaction_type: 'EXPENSE',
          amount: amountNum,
          balance_after: newBalance,
          category: category,
          description: `${category}${vendorName ? ' - ' + vendorName : ''}: ${description}`,
          reference_type: 'EXPENSE',
          transaction_date: expenseDate,
        }),
      })

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json()
        throw new Error(errorData.detail || 'Failed to create transaction')
      }

      const transactionData = await transactionResponse.json()
      const transactionId = transactionData[0]?.id

      // Step 2: Create expense record
      const expenseResponse = await fetch('http://localhost:8000/api/expenses/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          category: category,
          amount: amountNum,
          expense_date: expenseDate,
          vendor_name: vendorName || null,
          description: description,
          receipt_url: null,
          payment_mode: paymentMode,
          status: 'APPROVED',
          transaction_id: transactionId,
        }),
      })

      if (!expenseResponse.ok) {
        const errorData = await expenseResponse.json()
        throw new Error(errorData.detail || 'Failed to create expense')
      }

      // Step 3: Update account balance
      const balanceResponse = await fetch('http://localhost:8000/api/expenses/accounts/balance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          new_balance: newBalance,
        }),
      })

      if (!balanceResponse.ok) {
        const errorData = await balanceResponse.json()
        throw new Error(errorData.detail || 'Failed to update account balance')
      }

      setSuccess('Expense added successfully!')
      
      // Reset form
      setAccountType('OPEX')
      setPaymentMode('BANK')
      setCategory('')
      setAmount('')
      setExpenseDate(format(new Date(), 'yyyy-MM-dd'))
      setVendorName('')
      setDescription('')
      setShowAddForm(false)

      // Reload data
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error adding expense:', err)
      setError(err.message || 'Failed to add expense')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id)
    setEditData({
      category: expense.category,
      amount: expense.amount,
      expense_date: expense.expense_date,
      vendor_name: expense.vendor_name,
      description: expense.description,
      payment_mode: expense.payment_mode,
    })
  }

  const cancelEdit = () => {
    setEditingExpenseId(null)
    setEditData({})
  }

  const handleSaveEdit = async (expenseId: string) => {
    try {
      setSaving(true)
      setError('')

      const { error: updateError } = await db
        .from('expenses')
        .update({
          category: editData.category,
          amount: editData.amount,
          expense_date: editData.expense_date,
          vendor_name: editData.vendor_name,
          description: editData.description,
          payment_mode: editData.payment_mode,
        })
        .eq('id', expenseId)

      if (updateError) throw updateError

      setSuccess('Expense updated successfully!')
      setEditingExpenseId(null)
      setEditData({})
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating expense:', err)
      setError(err.message || 'Failed to update expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error: deleteError } = await db
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (deleteError) throw deleteError

      setSuccess('Expense deleted successfully!')
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting expense:', err)
      setError(err.message || 'Failed to delete expense')
    } finally {
      setSaving(false)
    }
  }

  // Get account info
  const getAccountInfo = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    return account
  }

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const account = getAccountInfo(expense.account_id)
    
    const matchesSearch =
      searchQuery === '' ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.vendor_name && expense.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesAccountType = filterAccountType === 'all' || account?.account_type === filterAccountType
    const matchesPaymentMode = filterPaymentMode === 'all' || expense.payment_mode === filterPaymentMode
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory

    return matchesSearch && matchesAccountType && matchesPaymentMode && matchesCategory
  })

  // Calculate stats
  const stats = {
    total: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    opex: filteredExpenses.filter((e) => getAccountInfo(e.account_id)?.account_type === 'OPEX').reduce((sum, e) => sum + e.amount, 0),
    capex: filteredExpenses.filter((e) => getAccountInfo(e.account_id)?.account_type === 'CAPEX').reduce((sum, e) => sum + e.amount, 0),
    bank: filteredExpenses.filter((e) => e.payment_mode === 'BANK').reduce((sum, e) => sum + e.amount, 0),
    cash: filteredExpenses.filter((e) => e.payment_mode === 'CASH').reduce((sum, e) => sum + e.amount, 0),
    count: filteredExpenses.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Expenses</h1>
          <p className="text-sm md:text-base text-gray-600">Track and manage all business expenses</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add Expense Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Expense</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type <span className="text-red-500">*</span>
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'OPEX' | 'CAPEX')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              >
                <option value="OPEX">OPEX (Operating Expense)</option>
                <option value="CAPEX">CAPEX (Capital Expense)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                OPEX: Day-to-day operations | CAPEX: Long-term investments
              </p>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as 'BANK' | 'CASH')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              >
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              >
                <option value="">Select Category</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Expense Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Vendor Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor/Supplier Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g., ABC Supplies"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the expense..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddExpense}
              disabled={saving}
              className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Add Expense'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setError('')
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-xl md:text-3xl font-bold text-red-600">₹{stats.total.toFixed(2)}</p>
            </div>
            <TrendingDown className="w-8 md:w-10 h-8 md:h-10 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">OPEX</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600">₹{stats.opex.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">CAPEX</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">₹{stats.capex.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Bank</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">₹{stats.bank.toFixed(2)}</p>
            </div>
            <CreditCard className="w-6 md:w-8 h-6 md:h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Cash</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">₹{stats.cash.toFixed(2)}</p>
            </div>
            <Banknote className="w-6 md:w-8 h-6 md:h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category, vendor, description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

          {/* Account Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <select
              value={filterAccountType}
              onChange={(e) => setFilterAccountType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="OPEX">OPEX</option>
              <option value="CAPEX">CAPEX</option>
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
            <select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Modes</option>
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSearchQuery('')
            setFilterAccountType('all')
            setFilterPaymentMode('all')
            setFilterCategory('all')
          }}
          className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No expenses found</p>
                      <p className="text-sm mt-1">Add your first expense to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const account = getAccountInfo(expense.account_id)
                  const isEditing = editingExpenseId === expense.id

                  return (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editData.expense_date || ''}
                            onChange={(e) => setEditData({ ...editData, expense_date: e.target.value })}
                            className="text-sm px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editData.category || ''}
                            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            {expenseCategories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {expense.category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.vendor_name || ''}
                            onChange={(e) => setEditData({ ...editData, vendor_name: e.target.value })}
                            className="text-sm px-2 py-1 border rounded w-full"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">{expense.vendor_name || '-'}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.description || ''}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="text-sm px-2 py-1 border rounded w-full"
                          />
                        ) : (
                          <div className="text-sm text-gray-900 max-w-md truncate">
                            {expense.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{account?.account_type || '-'}</div>
                        <div className="text-xs text-gray-500">{account?.account_mode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editData.payment_mode || ''}
                            onChange={(e) => setEditData({ ...editData, payment_mode: e.target.value })}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            <option value="BANK">BANK</option>
                            <option value="CASH">CASH</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              expense.payment_mode === 'BANK'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {expense.payment_mode === 'BANK' ? (
                              <CreditCard className="w-3 h-3" />
                            ) : (
                              <Banknote className="w-3 h-3" />
                            )}
                            {expense.payment_mode}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                            className="text-sm px-2 py-1 border rounded w-24 text-right"
                            step="0.01"
                          />
                        ) : (
                          <div className="text-sm font-bold text-red-600">
                            -₹{expense.amount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(expense.id)}
                              disabled={saving}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-800"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(expense)}
                              className="text-art-indigo hover:text-art-indigo/80"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium text-gray-400">No expenses found</p>
              <p className="text-sm text-gray-400 mt-1">Add your first expense to get started</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const account = getAccountInfo(expense.account_id)
              return (
                <div key={expense.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
                        {expense.category}
                      </span>
                      <p className="text-sm text-gray-900 font-medium">{expense.description}</p>
                      {expense.vendor_name && (
                        <p className="text-xs text-gray-500 mt-1">Vendor: {expense.vendor_name}</p>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-lg font-bold text-red-600">-₹{expense.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</span>
                      <span>�</span>
                      <span>{account?.account_type}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        expense.payment_mode === 'BANK'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {expense.payment_mode === 'BANK' ? (
                        <CreditCard className="w-3 h-3" />
                      ) : (
                        <Banknote className="w-3 h-3" />
                      )}
                      {expense.payment_mode}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Records Count */}
      {filteredExpenses.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} • Total: ₹{stats.total.toFixed(2)}
        </div>
      )}
    </div>
  )
}
