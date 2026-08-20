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
  AlertCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load accounts and transactions in parallel for faster loading
      const [accountsResult, transactionsResult] = await Promise.all([
        db.from('financial_accounts').select('*').eq('is_active', true).order('account_type', { ascending: true }),
        db.from('financial_transactions').select('*').order('created_at', { ascending: false }).limit(10)
      ])

      if (accountsResult.error) throw accountsResult.error
      if (transactionsResult.error) throw transactionsResult.error

      setAccounts(accountsResult.data || [])
      setRecentTransactions(transactionsResult.data || [])
    } catch (err: any) {
      console.error('Error loading financial data:', err)
      setError(err.message || 'Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  // Get account info from account_id
  const getAccountInfo = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    return account
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Finance Overview</h1>
        <p className="text-sm md:text-base text-gray-600">Complete financial dashboard and account balances</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-art-indigo to-purple-700 rounded-lg p-6 md:p-8 mb-6 md:mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 mb-2 text-sm md:text-base">Total Balance</p>
            <h2 className="text-4xl md:text-5xl font-bold">?{totalBalance.toFixed(2)}</h2>
            <p className="text-purple-200 mt-3 md:mt-4 text-xs md:text-base">Across all accounts</p>
          </div>
          <Wallet className="w-16 md:w-20 h-16 md:h-20 text-purple-300 opacity-50" />
        </div>
      </div>

      {/* Account Type Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* OPEX Total */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">OPEX (Operating)</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600">?{totalOpex.toFixed(2)}</p>
            </div>
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Bank</p>
              <p className="text-base md:text-lg font-semibold text-gray-900">?{totals.opexBank.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cash</p>
              <p className="text-base md:text-lg font-semibold text-gray-900">?{totals.opexCash.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* CAPEX Total */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">CAPEX (Capital)</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">?{totalCapex.toFixed(2)}</p>
            </div>
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingDown className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Bank</p>
              <p className="text-base md:text-lg font-semibold text-gray-900">?{totals.capexBank.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cash</p>
              <p className="text-base md:text-lg font-semibold text-gray-900">?{totals.capexCash.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Accounts */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Quick Links</h2>
        </div>
        
        {/* Finance Sub-Pages Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
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

        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">All Accounts</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                if (account.account_type === 'OPEX') {
                  navigate('/admin/finance/opex')
                } else {
                  navigate('/admin/finance/capex')
                }
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    account.account_mode === 'BANK'
                      ? 'bg-blue-100'
                      : 'bg-green-100'
                  }`}
                >
                  {account.account_mode === 'BANK' ? (
                    <CreditCard className={`w-5 h-5 ${
                      account.account_mode === 'BANK' ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  ) : (
                    <Banknote className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    account.account_type === 'OPEX'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {account.account_type}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                {account.account_name}
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                ?{account.current_balance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Opening: ?{account.opening_balance.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No financial accounts found</p>
            <p className="text-sm text-gray-400 mt-1">
              Run setup-financial-accounts.sql to create accounts
            </p>
          </div>
        )}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
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
                    const isInflow = transaction.transaction_type === 'INFLOW'

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
                            {transaction.transaction_type}
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
                            {isInflow ? '+' : '-'}?{transaction.amount.toFixed(2)}
                          </div>
                          {transaction.balance_after !== null && transaction.balance_after !== undefined && (
                            <div className="text-xs text-gray-500">
                              Bal: ?{transaction.balance_after.toFixed(2)}
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
        </div>
      </div>
    </div>
  )
}
