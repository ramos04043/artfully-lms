import { useEffect, useState } from 'react'
import { db } from '@/lib/zendbx'
import { DollarSign, TrendingUp, TrendingDown, Filter, Calendar, Search } from 'lucide-react'
import { format } from 'date-fns'

interface Transaction {
  id: string
  transaction_type: 'INFLOW' | 'OUTFLOW'
  category: string
  amount: number
  transaction_date: string
  description?: string
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'INFLOW' | 'OUTFLOW'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ totalInflow: 0, totalOutflow: 0, netBalance: 0 })

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const { data } = await db
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (data) {
        setTransactions(data)
        
        // Calculate stats
        const inflow = data
          .filter(t => t.transaction_type === 'INFLOW')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const outflow = data
          .filter(t => t.transaction_type === 'OUTFLOW')
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
    return matchesFilter && matchesSearch
  })

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6" />
            <p className="text-sm opacity-90">Total Inflow</p>
          </div>
          <p className="text-3xl font-bold">₹{stats.totalInflow.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6" />
            <p className="text-sm opacity-90">Total Outflow</p>
          </div>
          <p className="text-3xl font-bold">₹{stats.totalOutflow.toLocaleString()}</p>
        </div>

        <div className={`bg-gradient-to-br ${stats.netBalance >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-lg p-6 text-white`}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6" />
            <p className="text-sm opacity-90">Net Balance</p>
          </div>
          <p className="text-3xl font-bold">₹{Math.abs(stats.netBalance).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filter */}
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-5 h-5 text-art-indigo" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="INFLOW">Inflow Only</option>
              <option value="OUTFLOW">Outflow Only</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-5 h-5 text-art-indigo" />
            <input
              type="text"
              placeholder="Search by category or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>
        </div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
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
                          transaction.transaction_type === 'INFLOW'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.transaction_type === 'INFLOW' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {transaction.transaction_type}
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
                          transaction.transaction_type === 'INFLOW'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.transaction_type === 'INFLOW' ? '+' : '-'}₹
                        {Math.abs(transaction.amount).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
