import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { TrendingDown, Calendar, ArrowUpCircle, ArrowDownCircle, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  category: string
  description: string
  transaction_date: string
  created_at: string
  account_id: string
}

interface OpExData {
  totalRevenue: number
  totalExpense: number
  netBalance: number
  transactions: Transaction[]
}

export default function OpEXPage() {
  const [opex, setOpex] = useState<OpExData>({ 
    totalRevenue: 0, 
    totalExpense: 0, 
    netBalance: 0,
    transactions: [] 
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Date filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    loadOpEx()
  }, [])

  const loadOpEx = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('� Loading OPEX data...')

      // Get OPEX account IDs
      const { data: opexAccounts, error: accountError } = await db
        .from('financial_accounts')
        .select('id, account_name, account_type')
        .eq('account_type', 'OPEX')
        .eq('is_active', true)

      if (accountError) {
        console.error('❌ Error fetching OPEX accounts:', accountError)
        setError('Failed to load OPEX accounts')
        return
      }
      
      console.log('🏦 Found OPEX accounts:', opexAccounts)

      const opexAccountIds = opexAccounts?.map(acc => acc.id) || []

      if (opexAccountIds.length === 0) {
        console.log('⚠️ No OPEX accounts found')
        setOpex({ totalRevenue: 0, totalExpense: 0, netBalance: 0, transactions: [] })
        setLoading(false)
        return
      }

      // Get all ACTIVE transactions for OPEX accounts (all time, not just this month)
      const { data: allTransactions, error: txError } = await db
        .from('financial_transactions')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('transaction_date', { ascending: false })

      if (txError) {
        console.error('❌ Error fetching transactions:', txError)
        setError('Failed to load transactions')
        return
      }
      
      console.log('📊 All ACTIVE transactions:', allTransactions?.length || 0)

      // Filter for OPEX accounts only
      const opexTransactions = allTransactions?.filter(e => 
        opexAccountIds.includes(e.account_id)
      ) || []

      console.log('� OPEX transactions:', opexTransactions.length)

      // Calculate totals
      const revenue = opexTransactions
        .filter(t => ['REVENUE', 'INFLOW'].includes(t.transaction_type))
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const expense = opexTransactions
        .filter(t => ['EXPENSE', 'OUTFLOW'].includes(t.transaction_type))
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      const netBalance = revenue - expense

      console.log('💰 OPEX Revenue:', revenue)
      console.log('💸 OPEX Expense:', expense)
      console.log('📊 Net Balance:', netBalance)

      setOpex({ 
        totalRevenue: revenue,
        totalExpense: expense,
        netBalance: netBalance,
        transactions: opexTransactions
      })
    } catch (err) {
      console.error('❌ Error loading OpEx:', err)
      setError('An error occurred while loading data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading OpEx...</p>
        </div>
      </div>
    )
  }

  // Filter transactions by date
  const filteredTransactions = opex.transactions.filter((transaction) => {
    // Date filtering
    const matchesStartDate = !startDate || new Date(transaction.transaction_date) >= new Date(startDate + 'T00:00:00')
    const matchesEndDate = !endDate || new Date(transaction.transaction_date) <= new Date(endDate + 'T23:59:59')

    return matchesStartDate && matchesEndDate
  })

  // Recalculate stats based on filtered transactions
  const filteredRevenue = filteredTransactions
    .filter(t => ['REVENUE', 'INFLOW'].includes(t.transaction_type))
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  
  const filteredExpense = filteredTransactions
    .filter(t => ['EXPENSE', 'OUTFLOW'].includes(t.transaction_type))
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const filteredNetBalance = filteredRevenue - filteredExpense

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-blue-600" />
          OPEX (Operating Expenses)
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          All operating revenue and expenses
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Date Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Date Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-green-600">₹{filteredRevenue.toFixed(2)}</p>
        </div>

        {/* Expense Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600">Total Expense</p>
          </div>
          <p className="text-3xl font-bold text-red-600">₹{filteredExpense.toFixed(2)}</p>
        </div>

        {/* Net Balance Card */}
        <div className={`bg-white rounded-lg border border-gray-200 p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full ${filteredNetBalance >= 0 ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center`}>
              <TrendingDown className={`w-5 h-5 ${filteredNetBalance >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
            <p className="text-sm text-gray-600">Net Balance</p>
          </div>
          <p className={`text-3xl font-bold ${filteredNetBalance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
            ₹{filteredNetBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All OPEX Transactions</h2>
          <p className="text-sm text-gray-600">Complete history of operating revenue and expenses</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No OPEX transactions yet</p>
                      <p className="text-sm mt-1">Transactions will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  const isRevenue = ['REVENUE', 'INFLOW'].includes(transaction.transaction_type)
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
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            isRevenue
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isRevenue ? (
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
                            isRevenue ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isRevenue ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                        </div>
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
  )
}
