import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { DollarSign, TrendingUp, TrendingDown, Filter, Calendar, Search, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface Transaction {
  id: string
  transaction_type: 'INFLOW' | 'OUTFLOW' | 'REVENUE' | 'EXPENSE'
  category: string
  amount: number
  transaction_date: string
  description?: string
  created_at: string
  status?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'INFLOW' | 'OUTFLOW'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ totalInflow: 0, totalOutflow: 0, netBalance: 0 })
  
  // Date filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Get API URL from environment
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const { data } = await db
        .from('financial_transactions')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('transaction_date', { ascending: false })

      if (data) {
        setTransactions(data)
        
        // Calculate stats - handle both old (INFLOW/OUTFLOW) and new (REVENUE/EXPENSE) types
        const inflow = data
          .filter(t => ['INFLOW', 'REVENUE'].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0)
        
        const outflow = data
          .filter(t => ['OUTFLOW', 'EXPENSE'].includes(t.transaction_type))
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        
        setStats({
          totalInflow: inflow,
          totalOutflow: outflow,
          netBalance: inflow - outflow,
        })
      }
    } catch (err) {
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.transaction_type === filter
    const matchesSearch = 
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Date filtering
    const matchesStartDate = !startDate || new Date(t.transaction_date) >= new Date(startDate + 'T00:00:00')
    const matchesEndDate = !endDate || new Date(t.transaction_date) <= new Date(endDate + 'T23:59:59')
    
    return matchesFilter && matchesSearch && matchesStartDate && matchesEndDate
  })

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

      // Get ZendBX token from localStorage
      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Use the void endpoint
      const response = await fetch(`${API_URL}/api/finance/transactions/${transactionToDelete}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voided_by: 'admin',
          reason: 'Transaction voided by administrator'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to void transaction')
      }

      setSuccess('Transaction voided successfully!')
      setTransactionToDelete(null)
      await loadTransactions()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error voiding transaction:', err)
      setError(err.message || 'Failed to void transaction')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          All Transactions
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Complete transaction history
        </p>
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

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="INFLOW">Inflow Only</option>
              <option value="OUTFLOW">Outflow Only</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search category or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

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
        </div>

        <button
          onClick={() => {
            setFilter('all')
            setSearchQuery('')
            setStartDate('')
            setEndDate('')
          }}
          className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-600">No transactions found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'Transactions will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  // Check if it's a revenue/inflow transaction (green) or expense/outflow (red)
                  const isRevenue = ['INFLOW', 'REVENUE'].includes(transaction.transaction_type)
                  
                  // Display type: convert old types to new types
                  const displayType = transaction.transaction_type === 'INFLOW' ? 'REVENUE' :
                                     transaction.transaction_type === 'OUTFLOW' ? 'EXPENSE' :
                                     transaction.transaction_type
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isRevenue
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isRevenue ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {displayType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.category.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transaction.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`text-sm font-semibold ${
                            isRevenue
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {isRevenue ? '+' : '-'}₹
                          {Math.abs(transaction.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                          title="Void transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
