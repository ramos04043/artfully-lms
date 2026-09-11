import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Banknote,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  AlertCircle,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface FinancialAccount {
  id: string
  account_type: string
  account_mode: string
  account_name: string
  opening_balance: number
  current_balance: number
  is_active: boolean
}

interface FinancialTransaction {
  id: string
  account_id: string
  transaction_type: string
  amount: number
  category?: string
  description: string
  transaction_date: string
  balance_after?: number
  created_at: string
}

export default function FinanceOverviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // OPEX Revenue & Expense totals
  const [opexRevenue, setOpexRevenue] = useState(0)
  const [opexExpense, setOpexExpense] = useState(0)
  const [capexRevenue, setCapexRevenue] = useState(0)
  const [capexExpense, setCapexExpense] = useState(0)
  
  // Data version to force re-render
  const [dataVersion, setDataVersion] = useState(0)
  
  // Expanded state for cards
  const [opexExpanded, setOpexExpanded] = useState(false)
  const [capexExpanded, setCapexExpanded] = useState(false)
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Always load data on mount
    loadData()
  }, [])
  
  // Check for navigation state messages and reload when coming from other pages
  useEffect(() => {
    if (location.state?.message) {
      console.log('🔔 Navigation state detected:', location.state)
      setSuccess(location.state.message)
      setTimeout(() => setSuccess(''), 5000)
      
      // Clear the location state so message doesn't show on refresh
      navigate(location.pathname, { replace: true, state: {} })
      
      // CRITICAL: Reload data AFTER state is cleared to get fresh data
      console.log('🔄 Reloading data due to navigation from other page...')
      loadData()
    }
  }, [location.state])

  const loadData = async () => {
    try {
      console.log('🔄 loadData called - Starting data refresh...')
      
      // Use refreshing state if already loaded, loading state if initial load
      if (accounts.length > 0) {
        setRefreshing(true)
        console.log('📊 Using refreshing state (data already loaded)')
      } else {
        setLoading(true)
        console.log('📊 Using loading state (initial load)')
      }
      setError('')

      // Get ZendBX token from localStorage
      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        setError('Authentication required. Please log in.')
        setLoading(false)
        return
      }

      // Load accounts and transactions in parallel for faster loading
      console.log('📡 Fetching accounts and transactions...')
      
      // Query accounts directly from database instead of API to ensure consistency
      console.log('📡 Fetching accounts from database...')
      const { data: accountsFromDB, error: accountsError } = await db
        .from('financial_accounts')
        .select('*')
        .eq('is_active', true)
      
      console.log('📋 Raw accounts from DB:', accountsFromDB?.map(a => ({
        id: a.id,
        name: a.account_name,
        type: a.account_type,
        mode: a.account_mode
      })))
      
      if (accountsError) {
        throw accountsError
      }

      // Get account balances from API
      const balancesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/finance/accounts/balances`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!balancesResponse.ok) {
        throw new Error('Failed to fetch account balances')
      }
      
      const accountBalances = await balancesResponse.json()

      // Merge account data with calculated balances
      const accountsData = accountsFromDB.map((acc: any) => {
        const balance = accountBalances.find((b: any) => b.id === acc.id)
        return {
          id: acc.id,
          account_type: acc.account_type,  // Use account_type from DB, not API
          account_mode: acc.account_mode,  // Use account_mode from DB, not API
          account_name: acc.account_name,
          opening_balance: acc.opening_balance,
          current_balance: balance?.calculated_balance || acc.opening_balance,
          is_active: acc.is_active
        }
      })

      const transactionsResult = await db.from('financial_transactions')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(10)

      console.log('✅ Accounts fetched:', accountsData.length)
      console.log('✅ Transactions fetched:', transactionsResult.data?.length)
      console.log('🔍 All accounts with types:', accountsData.map((a: any) => ({ 
        id: a.id.substring(0, 8), 
        name: a.account_name, 
        type: a.account_type,
        mode: a.account_mode
      })))

      if (transactionsResult.error) throw transactionsResult.error

      setAccounts(accountsData || [])
      setRecentTransactions(transactionsResult.data || [])
      
      // Calculate OPEX and CAPEX revenue/expense totals
      console.log('🧮 Calculating transaction totals...')
      await calculateTransactionTotals(accountsData)
      
      // Increment data version to force re-render
      setDataVersion(prev => prev + 1)
      console.log('✅ Data refresh complete!')
    } catch (err: any) {
      console.error('❌ Error loading financial data:', err)
      setError(err.message || 'Failed to load financial data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateTransactionTotals = async (accountsData: FinancialAccount[]) => {
    try {
      // Get all OPEX account IDs
      const opexAccountIds = accountsData
        .filter(acc => acc.account_type === 'OPEX')
        .map(acc => acc.id)
      
      console.log('💰 OPEX Account IDs:', opexAccountIds)
      console.log('💰 OPEX Account Names:', accountsData.filter(acc => acc.account_type === 'OPEX').map(acc => acc.account_name))
      
      // Get all CAPEX account IDs
      const capexAccountIds = accountsData
        .filter(acc => acc.account_type === 'CAPEX')
        .map(acc => acc.id)

      console.log('💰 CAPEX Account IDs:', capexAccountIds)
      console.log('💰 CAPEX Account Names:', accountsData.filter(acc => acc.account_type === 'CAPEX').map(acc => acc.account_name))

      // Fetch all ACTIVE transactions - FORCE FRESH DATA
      // Add timestamp to bypass any potential caching
      // IMPORTANT: No limit() - we need ALL transactions for correct totals
      console.log('📡 Fetching ALL active transactions for totals calculation...')
      console.log('📡 Timestamp:', new Date().toISOString())
      
      const allTransactionsResult = await db.from('financial_transactions')
        .select('id, account_id, transaction_type, amount, transaction_date, status, created_at')
        .eq('status', 'ACTIVE')
        .limit(1000)  // Set high limit to ensure we get all transactions
        .order('created_at', { ascending: false })

      if (allTransactionsResult.error) {
        console.error('❌ Error fetching transactions:', allTransactionsResult.error)
        return
      }

      if (allTransactionsResult.data) {
        console.log(`✅ Fetched ${allTransactionsResult.data.length} ACTIVE transactions`)
        console.log('🔍 Sample transactions (first 3):', allTransactionsResult.data.slice(0, 3).map(t => ({
          id: t.id.substring(0, 8),
          account_id: t.account_id,
          type: t.transaction_type,
          amount: t.amount
        })))
        
        // Show unique account IDs in all transactions
        const uniqueAccountIds = [...new Set(allTransactionsResult.data.map(t => t.account_id))]
        console.log('🏦 Unique account IDs found in transactions:', uniqueAccountIds)
        console.log('🏦 OPEX account IDs we are filtering by:', opexAccountIds)
        console.log('🏦 All accounts:', accountsData.map((a: any) => ({ 
          id: a.id, 
          name: a.account_name, 
          type: a.account_type 
        })))
        
        // Filter OPEX transactions with explicit logging
        const opexTransactions = []
        const nonOpexTransactions = []
        
        for (const t of allTransactionsResult.data) {
          if (opexAccountIds.includes(t.account_id)) {
            opexTransactions.push(t)
          } else {
            nonOpexTransactions.push(t)
          }
        }
        
        console.log(`📊 OPEX Transactions Found: ${opexTransactions.length}`)
        console.log(`📊 NON-OPEX Transactions (excluded): ${nonOpexTransactions.length}`)
        
        if (nonOpexTransactions.length > 0) {
          const nonOpexAccountIds = [...new Set(nonOpexTransactions.map(t => t.account_id))]
          console.log('� NON-OPEX Transaction account_ids:', nonOpexAccountIds)
          console.log('� NON-OPEX Accounts:', accountsData.filter((a: any) => 
            nonOpexAccountIds.includes(a.id)
          ).map((a: any) => ({ 
            name: a.account_name, 
            type: a.account_type 
          })))
        }
        
        console.log('📊 First 5 OPEX transactions:', opexTransactions.slice(0, 5).map(t => ({
          id: t.id.substring(0, 8),
          type: t.transaction_type,
          amount: t.amount,
          account_id: t.account_id.substring(0, 8)
        })))
        
        const opexRevTransactions = opexTransactions.filter(t => ['REVENUE', 'INFLOW'].includes(t.transaction_type))
        const opexExpTransactions = opexTransactions.filter(t => ['EXPENSE', 'OUTFLOW'].includes(t.transaction_type))
        
        console.log(`💵 OPEX Revenue Transactions: ${opexRevTransactions.length}`)
        console.log(`💸 OPEX Expense Transactions: ${opexExpTransactions.length}`)
        
        if (opexRevTransactions.length > 0) {
          console.log('💵 OPEX Revenue Transaction Details (all):', opexRevTransactions.map(t => ({
            id: t.id.substring(0, 8),
            amount: t.amount,
            type: t.transaction_type,
            date: t.transaction_date
          })))
        }
        
        const opexRevTotal = opexRevTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        const opexExpTotal = opexExpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        
        console.log(`💵 OPEX Revenue Total: ₹${opexRevTotal.toFixed(2)}`)
        console.log(`💸 OPEX Expense Total: ₹${opexExpTotal.toFixed(2)}`)
        console.log(`📊 Current state BEFORE update - Revenue: ₹${opexRevenue.toFixed(2)}, Expense: ₹${opexExpense.toFixed(2)}`)
        
        setOpexRevenue(opexRevTotal)
        setOpexExpense(opexExpTotal)
        
        console.log(`✅ State updated - Revenue will be: ₹${opexRevTotal.toFixed(2)}, Expense will be: ₹${opexExpTotal.toFixed(2)}`)

        // Filter CAPEX transactions
        const capexTransactions = allTransactionsResult.data.filter(t => 
          capexAccountIds.includes(t.account_id)
        )
        
        const capexRevTotal = capexTransactions
          .filter(t => ['REVENUE', 'INFLOW'].includes(t.transaction_type))
          .reduce((sum, t) => sum + (t.amount || 0), 0)
        
        const capexExpTotal = capexTransactions
          .filter(t => ['EXPENSE', 'OUTFLOW'].includes(t.transaction_type))
          .reduce((sum, t) => sum + (t.amount || 0), 0)
        
        console.log(`💵 CAPEX Revenue Total: ₹${capexRevTotal.toFixed(2)}`)
        console.log(`💸 CAPEX Expense Total: ₹${capexExpTotal.toFixed(2)}`)
        
        setCapexRevenue(capexRevTotal)
        setCapexExpense(capexExpTotal)
      }
    } catch (err) {
      console.error('❌ Error calculating transaction totals:', err)
    }
  }

  // Get account info from account_id
  const getAccountInfo = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    return account
  }

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactionToDelete(transactionId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      setDeleting(true)
      setShowDeleteConfirm(false)
      setError('')

      console.log('🗑️ Voiding transaction:', transactionToDelete)

      // Get ZendBX token from localStorage
      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Use the void endpoint instead of hard delete
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/finance/transactions/${transactionToDelete}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voided_by: 'admin',  // TODO: Get from auth context
          reason: 'Transaction voided by administrator'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to void transaction')
      }

      console.log('✅ Transaction voided successfully')
      setSuccess(`Transaction voided successfully!`)
      setTransactionToDelete(null)
      await loadData()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error voiding transaction:', err)
      setError(err.message || 'Failed to void transaction')
    } finally {
      setDeleting(false)
    }
  }

  // Calculate totals
  const totals = {
    opexBank: accounts.find((a) => a.account_type === 'OPEX' && a.account_mode === 'BANK')?.current_balance || 0,
    opexCash: accounts.find((a) => a.account_type === 'OPEX' && a.account_mode === 'CASH')?.current_balance || 0,
    capexBank: accounts.find((a) => a.account_type === 'CAPEX' && a.account_mode === 'BANK')?.current_balance || 0,
    capexCash: accounts.find((a) => a.account_type === 'CAPEX' && a.account_mode === 'CASH')?.current_balance || 0,
  }

  const totalOpex = totals.opexBank + totals.opexCash
  const totalCapex = totals.capexBank + totals.capexCash
  const totalBalance = totalOpex + totalCapex

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial overview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Finance Overview</h1>
            <p className="text-sm md:text-base text-gray-600">Complete financial dashboard and account balances</p>
          </div>
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered')
              loadData()
            }}
            disabled={refreshing}
            className="bg-art-indigo hover:bg-art-indigo/90 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg 
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
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

      {/* Success Alert */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 text-sm font-medium">{success}</p>
            <p className="text-green-700 text-xs mt-1">Finance totals have been updated</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Account Type Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8" key={`totals-${dataVersion}`}>
        {/* OPEX Total */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">OPEX (Operating)</p>
              <p className={`text-2xl md:text-3xl font-bold ${totalOpex >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ₹{totalOpex.toFixed(2)}
              </p>
            </div>
            <div className={`w-10 md:w-12 h-10 md:h-12 rounded-full ${totalOpex >= 0 ? 'bg-blue-100' : 'bg-red-100'} flex items-center justify-center`}>
              <TrendingUp className={`w-5 md:w-6 h-5 md:h-6 ${totalOpex >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-base md:text-lg font-semibold text-green-600">₹{opexRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expense</p>
              <p className="text-base md:text-lg font-semibold text-red-600">₹{opexExpense.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* CAPEX Total */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">CAPEX (Capital)</p>
              <p className={`text-2xl md:text-3xl font-bold ${totalCapex >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{totalCapex.toFixed(2)}
              </p>
            </div>
            <div className={`w-10 md:w-12 h-10 md:h-12 rounded-full ${totalCapex >= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
              <TrendingDown className={`w-5 md:w-6 h-5 md:h-6 ${totalCapex >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-base md:text-lg font-semibold text-green-600">₹{capexRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expense</p>
              <p className="text-base md:text-lg font-semibold text-red-600">₹{capexExpense.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Quick Links</h2>
        </div>
        
        {/* Finance Sub-Pages Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/finance/revenue')}
            className="bg-white hover:bg-gray-50 rounded-lg border border-gray-200 p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Revenue</p>
                <p className="text-xs text-gray-500">Manual entry</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/finance/expenses')}
            className="bg-white hover:bg-gray-50 rounded-lg border border-gray-200 p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Expenses</p>
                <p className="text-xs text-gray-500">Track spending</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/finance/transactions')}
            className="bg-white hover:bg-gray-50 rounded-lg border border-gray-200 p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Transactions</p>
                <p className="text-xs text-gray-500">All transactions</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/finance/opex')}
            className="bg-white hover:bg-gray-50 rounded-lg border border-gray-200 p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">OPEX</p>
                <p className="text-xs text-gray-500">Operating expenses</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/finance/capex')}
            className="bg-white hover:bg-gray-50 rounded-lg border border-gray-200 p-4 text-left transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">CAPEX</p>
                <p className="text-xs text-gray-500">Capital expenses</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
          <button
            onClick={() => navigate('/admin/finance/transactions')}
            className="text-art-indigo hover:text-art-indigo/80 text-sm font-medium"
          >
            View All ?
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No transactions yet</p>
                        <p className="text-sm mt-1">Transactions will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((transaction) => {
                    const account = getAccountInfo(transaction.account_id)
                    const isInflow = ['REVENUE', 'INFLOW'].includes(transaction.transaction_type)
                    
                    // Display type mapping for transition period
                    const displayType = transaction.transaction_type === 'INFLOW' ? 'REVENUE' :
                                       transaction.transaction_type === 'OUTFLOW' ? 'EXPENSE' :
                                       transaction.transaction_type

                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(transaction.created_at), 'hh:mm a')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {account?.account_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account?.account_type} - {account?.account_mode}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              isInflow
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isInflow ? (
                              <ArrowUpCircle className="w-3 h-3" />
                            ) : (
                              <ArrowDownCircle className="w-3 h-3" />
                            )}
                            {displayType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {transaction.category || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md truncate">
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div
                            className={`text-sm font-bold ${
                              isInflow ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {isInflow ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                          </div>
                          {transaction.balance_after !== null && transaction.balance_after !== undefined && (
                            <div className="text-xs text-gray-500">
                              Bal: ₹{transaction.balance_after.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            disabled={deleting}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setTransactionToDelete(null)
        }}
        onConfirm={confirmDeleteTransaction}
        title="Void Transaction?"
        message="Are you sure you want to void this transaction? The transaction will be marked as voided and excluded from balance calculations. The original transaction remains in the database for audit purposes."
        confirmText="Void Transaction"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
