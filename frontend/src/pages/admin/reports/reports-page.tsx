import { useEffect, useState } from 'react'
import { db } from '@/lib/zendbx'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Calendar,
  DollarSign,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Stats {
  totalStudents: number
  activeEnrollments: number
  monthlyEnrollments: number
  totalRevenue: number
  monthlyRevenue: number
  totalExpenses: number
  monthlyExpenses: number
  netIncome: number
  attendanceRate: number
  activeBatches: number
}

interface MonthlyData {
  month: string
  enrollments: number
  revenue: number
  expenses: number
  netIncome: number
}

interface BatchEnrollment {
  name: string
  students: number
  capacity: number
}

interface ExpenseCategory {
  category: string
  amount: number
  color: string
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeEnrollments: 0,
    monthlyEnrollments: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalExpenses: 0,
    monthlyExpenses: 0,
    netIncome: 0,
    attendanceRate: 0,
    activeBatches: 0,
  })
  
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [batchData, setBatchData] = useState<BatchEnrollment[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all data in parallel for faster loading
      const [overviewData, monthlyData, batchData, expenseData] = await Promise.all([
        loadOverviewStatsOptimized(),
        loadMonthlyTrendsOptimized(),
        loadBatchEnrollmentsOptimized(),
        loadExpenseBreakdownOptimized(),
      ])

      // Set all states at once
      if (overviewData) setStats(overviewData)
      if (monthlyData) setMonthlyData(monthlyData)
      if (batchData) setBatchData(batchData)
      if (expenseData) setExpenseData(expenseData)
    } catch (err: any) {
      console.error('Error loading statistics:', err)
      setError(err.message || 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const loadOverviewStatsOptimized = async () => {
    // Current month dates
    const today = new Date()
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

    // Total active students from enrollments table
    const { data: activeEnrollmentsData } = await db
      .from('enrollments')
      .select('id, status')
      .eq('status', 'ACTIVE')

    const totalStudents = activeEnrollmentsData?.length || 0

    // Active enrollments (same as total students)
    const { data: enrollments, error: enrollError } = await db
      .from('enrollments')
      .select('id, created_at')

    console.log('📝 Enrollments:', enrollments?.length, 'Error:', enrollError)

    const activeEnrollmentsCount = enrollments?.length || 0

    // Monthly enrollments
    const monthlyEnrollments =
      enrollments?.filter(
        (e) => e.created_at >= monthStart && e.created_at <= monthEnd + 'T23:59:59'
      ).length || 0

    // Financial data - revenue (fees collected)
    const { data: feeTransactions } = await db
      .from('financial_transactions')
      .select('amount, transaction_date')
      .eq('transaction_type', 'INFLOW')
      .eq('category', 'FEE_COLLECTION')

    const totalRevenue = feeTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0
    const monthlyRevenue =
      feeTransactions
        ?.filter((t) => t.transaction_date >= monthStart && t.transaction_date <= monthEnd)
        .reduce((sum, t) => sum + t.amount, 0) || 0

    // Financial data - expenses
    const { data: expenseTransactions } = await db
      .from('financial_transactions')
      .select('amount, transaction_date')
      .eq('transaction_type', 'OUTFLOW')

    const totalExpenses = expenseTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const monthlyExpenses =
      expenseTransactions
        ?.filter((t) => t.transaction_date >= monthStart && t.transaction_date <= monthEnd)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    const netIncome = monthlyRevenue - monthlyExpenses

    // Attendance rate (last 30 days)
    const thirtyDaysAgo = format(subMonths(today, 1), 'yyyy-MM-dd')
    const { data: attendance } = await db
      .from('attendance')
      .select('status')
      .gte('class_date', thirtyDaysAgo)

    const totalClasses = attendance?.length || 1
    const presentCount = attendance?.filter((a) => a.status === 'PRESENT').length || 0
    const attendanceRate = (presentCount / totalClasses) * 100

    // Active batches
    const { data: batches } = await db
      .from('batches')
      .select('id')
      .eq('is_active', true)

    const activeBatches = batches?.length || 0

    return {
      totalStudents,
      activeEnrollments: activeEnrollmentsCount,
      monthlyEnrollments,
      totalRevenue,
      monthlyRevenue,
      totalExpenses,
      monthlyExpenses,
      netIncome,
      attendanceRate: Math.round(attendanceRate),
      activeBatches,
    }
  }

  const loadMonthlyTrendsOptimized = async () => {
    const today = new Date()
    const sixMonthsAgo = subMonths(today, 5)
    const startDate = format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(today), 'yyyy-MM-dd')

    // Fetch all data for 6 months in parallel (3 queries instead of 18!)
    const [enrollmentsResult, revenueResult, expensesResult] = await Promise.all([
      db.from('enrollments').select('id, created_at').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
      db.from('financial_transactions').select('amount, transaction_date').eq('transaction_type', 'INFLOW').eq('category', 'FEE_COLLECTION').gte('transaction_date', startDate).lte('transaction_date', endDate),
      db.from('financial_transactions').select('amount, transaction_date').eq('transaction_type', 'OUTFLOW').gte('transaction_date', startDate).lte('transaction_date', endDate)
    ])

    const allEnrollments = enrollmentsResult.data || []
    const allRevenue = revenueResult.data || []
    const allExpenses = expensesResult.data || []

    // Group by month
    const months = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i)
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')
      const monthName = format(monthDate, 'MMM yyyy')

      // Filter data for this month
      const monthEnrollments = allEnrollments.filter(e => e.created_at >= monthStart && e.created_at <= monthEnd + 'T23:59:59')
      const monthRevenue = allRevenue.filter(r => r.transaction_date >= monthStart && r.transaction_date <= monthEnd).reduce((sum, t) => sum + t.amount, 0)
      const monthExpenses = allExpenses.filter(e => e.transaction_date >= monthStart && e.transaction_date <= monthEnd).reduce((sum, t) => sum + Math.abs(t.amount), 0)

      months.push({
        month: monthName,
        enrollments: monthEnrollments.length,
        revenue: monthRevenue,
        expenses: monthExpenses,
        netIncome: monthRevenue - monthExpenses,
      })
    }

    return months
  }

  const loadBatchEnrollmentsOptimized = async () => {
    // Load batches and all enrollments in parallel
    const [batchesResult, enrollmentsResult] = await Promise.all([
      db.from('batches').select('id, name, max_capacity').eq('is_active', true),
      db.from('enrollments').select('id, batch_ids, status').eq('status', 'ACTIVE')
    ])

    const batches = batchesResult.data
    const allEnrollments = enrollmentsResult.data

    if (!batches || !allEnrollments) return []

    console.log('📚 Loading enrollments for', batches.length, 'batches')

    // Process all batches at once instead of querying for each batch
    const batchEnrollments = batches.map(batch => {
      try {
        // Filter enrollments that include this batch in their batch_ids array
        const batchEnrollmentsList = allEnrollments.filter(
          (enrollment) => enrollment.batch_ids && enrollment.batch_ids.includes(batch.id)
        )

        return {
          name: batch.name,
          students: batchEnrollmentsList.length,
          capacity: batch.max_capacity || 20,
        }
      } catch (err) {
        console.error(`❌ Failed to process enrollments for batch ${batch.name}:`, err)
        return {
          name: batch.name,
          students: 0,
          capacity: batch.max_capacity || 20,
        }
      }
    })

    console.log('✅ Batch enrollments loaded:', batchEnrollments)
    return batchEnrollments
  }

  const loadExpenseBreakdownOptimized = async () => {
    const today = new Date()
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

    console.log('🔍 Loading expense breakdown for:', monthStart, 'to', monthEnd)

    const { data: expenses, error } = await db
      .from('financial_transactions')
      .select('category, amount, transaction_date')
      .eq('transaction_type', 'OUTFLOW')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd)

    console.log('💰 Expenses data:', expenses)
    console.log('❌ Expenses error:', error)

    if (!expenses || expenses.length === 0) {
      console.log('⚠️ No expenses found for current month')
      setExpenseData([])
      return
    }

    // Group by category
    const categoryMap = new Map<string, number>()
    expenses.forEach((exp) => {
      const cat = exp.category || 'UNCATEGORIZED'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Math.abs(exp.amount))
      console.log(`  📊 ${cat}: ₹${Math.abs(exp.amount)}`)
    })

    console.log('📈 Category totals:', Object.fromEntries(categoryMap))

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
    const expenseBreakdown = Array.from(categoryMap.entries()).map(([category, amount], index) => ({
      category: category.replace(/_/g, ' '),
      amount,
      color: colors[index % colors.length],
    }))

    console.log('✅ Final expense breakdown:', expenseBreakdown)
    return expenseBreakdown
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Statistics Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600">
            Overview of enrollments, revenue, expenses, and attendance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
        {/* Total Students */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <p className="text-xs md:text-sm opacity-90 mb-1">Total Students</p>
          <p className="text-2xl md:text-3xl font-bold">{stats.totalStudents}</p>
          <p className="text-xs mt-2 opacity-75">Active students</p>
        </div>

        {/* Monthly Enrollments */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <Calendar className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            {stats.monthlyEnrollments > 0 ? (
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </div>
          <p className="text-xs md:text-sm opacity-90 mb-1">This Month</p>
          <p className="text-2xl md:text-3xl font-bold">{stats.monthlyEnrollments}</p>
          <p className="text-xs mt-2 opacity-75">New enrollments</p>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <p className="text-xs md:text-sm opacity-90 mb-1">Monthly Revenue</p>
          <p className="text-2xl md:text-3xl font-bold">₹{stats.monthlyRevenue.toFixed(0)}</p>
          <p className="text-xs mt-2 opacity-75">Fee collections</p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <Wallet className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <p className="text-xs md:text-sm opacity-90 mb-1">Monthly Expenses</p>
          <p className="text-2xl md:text-3xl font-bold">₹{stats.monthlyExpenses.toFixed(0)}</p>
          <p className="text-xs mt-2 opacity-75">All categories</p>
        </div>

        {/* Net Income */}
        <div
          className={`bg-gradient-to-br ${
            stats.netIncome >= 0 ? 'from-teal-500 to-teal-600' : 'from-red-500 to-red-600'
          } rounded-lg p-4 md:p-6 text-white`}
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-6 h-6 md:w-8 md:h-8 opacity-80" />
            {stats.netIncome >= 0 ? (
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </div>
          <p className="text-xs md:text-sm opacity-90 mb-1">Net Income</p>
          <p className="text-2xl md:text-3xl font-bold">
            ₹{Math.abs(stats.netIncome).toFixed(0)}
          </p>
          <p className="text-xs mt-2 opacity-75">{stats.netIncome >= 0 ? 'Profit' : 'Loss'}</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Attendance Rate</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.attendanceRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Active Batches</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeBatches}</p>
          <p className="text-xs text-gray-500 mt-1">Running classes</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Active Enrollments</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeEnrollments}</p>
          <p className="text-xs text-gray-500 mt-1">Current students</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Enrollments Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Monthly Enrollments Trend
          </h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="enrollments" fill="#8b5cf6" name="Enrollments" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
              <Calendar className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No enrollment data available</p>
            </div>
          )}
        </div>

        {/* Revenue vs Expenses Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Revenue vs Expenses (Last 6 Months)
          </h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="netIncome" stroke="#6366f1" strokeWidth={2} name="Net Income" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
              <DollarSign className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No financial data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Enrollment Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Batch Enrollments vs Capacity
          </h2>
          {batchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={batchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" fill="#3b82f6" name="Current Students" />
                <Bar dataKey="capacity" fill="#e5e7eb" name="Max Capacity" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
              <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No batch data available</p>
            </div>
          )}
        </div>

        {/* Expense Breakdown Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-orange-600" />
            Expense Breakdown (This Month)
          </h2>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
              <PieChartIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Expenses This Month</p>
              <p className="text-sm text-center">Expense data will appear here once you add expenses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
