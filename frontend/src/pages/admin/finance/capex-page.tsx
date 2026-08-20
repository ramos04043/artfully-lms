import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { TrendingUp, Calendar, DollarSign, PieChart } from 'lucide-react'
import { format, startOfYear, endOfYear } from 'date-fns'

interface CapExData {
  totalYearly: number
  byCategory: { category: string; amount: number }[]
}

export default function CapEXPage() {
  const [capex, setCapex] = useState<CapExData>({ totalYearly: 0, byCategory: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCapEx()
  }, [])

  const loadCapEx = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const yearStart = format(startOfYear(today), 'yyyy-MM-dd')
      const yearEnd = format(endOfYear(today), 'yyyy-MM-dd')

      // Get capital expenses (one-time/long-term investments like EQUIPMENT, FURNITURE, SOFTWARE, etc.)
      const capexCategories = ['EQUIPMENT', 'FURNITURE', 'SOFTWARE', 'INFRASTRUCTURE', 'RENOVATION']

      const { data: expenses } = await db
        .from('financial_transactions')
        .select('category, amount')
        .eq('transaction_type', 'OUTFLOW')
        .in('category', capexCategories)
        .gte('transaction_date', yearStart)
        .lte('transaction_date', yearEnd)

      const totalYearly = expenses?.reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0

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

      setCapex({ totalYearly, byCategory })
    } catch (err) {
      console.error('Error loading CapEx:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CapEx...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Capital Expenditure (CapEx)
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Capital investments for {format(new Date(), 'yyyy')}
        </p>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8" />
          <p className="text-lg opacity-90">Total Yearly CapEx</p>
        </div>
        <p className="text-4xl font-bold">?{capex.totalYearly.toLocaleString()}</p>
        <p className="text-sm opacity-75 mt-2">Capital expenses this year</p>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-art-indigo" />
          CapEx Breakdown by Category
        </h2>

        {capex.byCategory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No capital expenses recorded</p>
            <p className="text-sm mt-2">CapEx data for this year will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {capex.byCategory.map((cat, index) => {
              const percentage = capex.totalYearly > 0 ? (cat.amount / capex.totalYearly) * 100 : 0
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-gray-600">?{cat.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total CapEx</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>CapEx:</strong> Capital Expenditure includes long-term investments like equipment, furniture, software, infrastructure, and renovations.
        </p>
      </div>
    </div>
  )
}
