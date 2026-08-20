import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { TrendingDown, Calendar, DollarSign, PieChart } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface OpExData {
  totalMonthly: number
  byCategory: { category: string; amount: number }[]
}

export default function OpEXPage() {
  const [opex, setOpex] = useState<OpExData>({ totalMonthly: 0, byCategory: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOpEx()
  }, [])

  const loadOpEx = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

      // Get operational expenses (recurring costs like RENT, SALARY, UTILITIES, etc.)
      const opexCategories = ['RENT', 'SALARY', 'UTILITIES', 'MARKETING', 'MAINTENANCE', 'SUPPLIES', 'INSURANCE']

      const { data: expenses } = await db
        .from('financial_transactions')
        .select('category, amount')
        .eq('transaction_type', 'OUTFLOW')
        .in('category', opexCategories)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd)

      const totalMonthly = expenses?.reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0

      // Group by category
      const categoryMap = new Map<string, number>()
      expenses?.forEach(e => {
        const cat = e.category
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + Math.abs(e.amount))
      })

      const byCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({
        category: category.replace(/_/g, ' '),
        amount,
      }))

      setOpex({ totalMonthly, byCategory })
    } catch (err) {
      console.error('Error loading OpEx:', err)
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

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-orange-600" />
          Operational Expenditure (OpEx)
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Recurring operational expenses for {format(new Date(), 'MMMM yyyy')}
        </p>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8" />
          <p className="text-lg opacity-90">Total Monthly OpEx</p>
        </div>
        <p className="text-4xl font-bold">₹{opex.totalMonthly.toLocaleString()}</p>
        <p className="text-sm opacity-75 mt-2">Operational expenses this month</p>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-art-indigo" />
          OpEx Breakdown by Category
        </h2>

        {opex.byCategory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingDown className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No operational expenses recorded</p>
            <p className="text-sm mt-2">OpEx data for this month will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opex.byCategory.map((cat, index) => {
              const percentage = opex.totalMonthly > 0 ? (cat.amount / opex.totalMonthly) * 100 : 0
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-gray-600">₹{cat.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-orange-600 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total OpEx</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>OpEx:</strong> Operational Expenditure includes recurring costs like rent, salaries, utilities, marketing, maintenance, supplies, and insurance.
        </p>
      </div>
    </div>
  )
}
