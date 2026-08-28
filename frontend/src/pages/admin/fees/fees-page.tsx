import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { DollarSign, Plus, Search, Filter, CreditCard, Banknote, AlertCircle, CheckCircle, XCircle, Edit, Save, X, Trash2 } from 'lucide-react'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface FinancialTransaction {
  id: string
  account_id: string
  transaction_type: string
  amount: number
  category?: string
  description: string
  reference_type?: string
  reference_id?: string
  transaction_date: string
  created_at: string
}

interface Payment {
  id: string
  student_id: string
  student_name: string
  student_ref_id: string
  amount: number
  payment_mode: string
  transaction_id?: string
}

interface FinancialAccount {
  id: string
  account_type: string
  account_mode: string
  account_name: string
  current_balance: number
}

interface EnrollmentInfo {
  id: string
  student_id: string
  student_first_name: string
  student_last_name: string
  student_phone: string
  student_email: string
  status: string
}

export default function FeesPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add Payment Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<'BANK' | 'CASH'>('BANK')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [transactionRef, setTransactionRef] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Confirmation dialog state
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)

  // Edit state
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<FinancialTransaction>>({})

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  // Close student dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.student-search-container')) {
        setShowStudentDropdown(false)
      }
    }

    if (showStudentDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStudentDropdown])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load financial accounts
      const { data: accountsData, error: accountsError } = await db
        .from('financial_accounts')
        .select('*')
        .eq('account_type', 'OPEX')

      if (accountsError) throw accountsError
      setAccounts(accountsData || [])

      // Load enrollments
      const { data: enrollmentsData, error: enrollError } = await db
        .from('enrollments')
        .select('id, student_id, student_first_name, student_last_name, student_phone, student_email, status')
        .order('student_first_name', { ascending: true })

      if (enrollError) throw enrollError
      setEnrollments(enrollmentsData || [])

      // Load payments to match with transactions
      const { data: paymentsData, error: paymentsError } = await db
        .from('payments')
        .select('id, student_id, student_name, student_ref_id, amount, payment_mode, transaction_id')
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError
      setPayments(paymentsData || [])
      console.log('💳 Payments loaded:', paymentsData)

      // Load fee transactions - Try simpler query first
      const { data: transactionsData, error: transactionsError } = await db
        .from('financial_transactions')
        .select('*')
        .eq('transaction_type', 'REVENUE')
        .eq('status', 'ACTIVE')
        .order('transaction_date', { ascending: false })

      if (transactionsError) {
        console.error('❌ Query error:', transactionsError)
        throw transactionsError
      }
      
      console.log('📊 All REVENUE transactions:', transactionsData)
      
      // Also try to get INFLOW transactions separately
      const { data: inflowData, error: inflowError } = await db
        .from('financial_transactions')
        .select('*')
        .eq('transaction_type', 'INFLOW')
        .eq('status', 'ACTIVE')
        .order('transaction_date', { ascending: false })
      
      if (!inflowError && inflowData) {
        console.log('📊 All INFLOW transactions:', inflowData)
      }
      
      // Combine both
      const allTransactions = [...(transactionsData || []), ...(inflowData || [])]
      console.log('📊 Combined transactions:', allTransactions)
      
      // Filter to only show student fee payments
      const feeTransactions = allTransactions.filter(t => {
        const isFeePayment = t.reference_type === 'FEE_PAYMENT' || 
                            t.category === 'STUDENT_FEES' || 
                            t.category === 'FEE_COLLECTION'
        if (isFeePayment) {
          console.log(`✅ Fee transaction found: ${t.id}, category=${t.category}, ref_type=${t.reference_type}`)
        }
        return isFeePayment
      })
      
      console.log('💰 Filtered fee transactions:', feeTransactions)
      
      setTransactions(feeTransactions)
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = async () => {
    try {
      setSaving(true)
      setShowPaymentConfirm(false)
      setError('')
      setSuccess('')

      if (!selectedStudent || !amount || !paymentDate) {
        setError('Please fill all required fields')
        return
      }

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('Please enter a valid amount')
        return
      }

      // Get ZendBX token from localStorage
      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        setError('Your session has expired. Please log in again.')
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
        return
      }

      // Prepare payment request for backend API
      const paymentRequest = {
        enrollment_id: selectedStudent,
        amount: amountNum,
        payment_mode: paymentMode,
        payment_date: paymentDate,
        transaction_reference: transactionRef || null,
        notes: notes || null
      }

      console.log('🚀 Creating payment via backend API:', paymentRequest)

      // Call backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Backend error:', errorData)
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.')
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
          return
        }
        
        throw new Error(errorData.detail || 'Failed to add payment')
      }

      const result = await response.json()
      console.log('? Payment created:', result)

      setSuccess(result.message || 'Payment added successfully!')
      
      // Reset form
      setSelectedStudent('')
      setStudentSearchQuery('')
      setAmount('')
      setPaymentMode('BANK')
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
      setTransactionRef('')
      setNotes('')
      setShowAddForm(false)

      // Reload data
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error adding payment:', err)
      setError(err.message || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (transaction: FinancialTransaction) => {
    setEditingTransactionId(transaction.id)
    setEditData({
      amount: transaction.amount,
      transaction_date: transaction.transaction_date,
      description: transaction.description,
    })
  }

  const cancelEdit = () => {
    setEditingTransactionId(null)
    setEditData({})
  }

  const handleSaveEdit = async (transactionId: string) => {
    try {
      setSaving(true)
      setError('')

      const { error: updateError } = await db
        .from('financial_transactions')
        .update({
          amount: editData.amount,
          transaction_date: editData.transaction_date,
          description: editData.description,
        })
        .eq('id', transactionId)

      if (updateError) throw updateError

      setSuccess('Payment updated successfully!')
      setEditingTransactionId(null)
      setEditData({})
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating payment:', err)
      setError(err.message || 'Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to void this payment record? This action creates an audit trail.')) {
      return
    }

    try {
      setSaving(true)
      setError('')

      // Get ZendBX token from localStorage
      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        setError('Authentication required. Please log in.')
        setSaving(false)
        return
      }

      // Find the payment record linked to this transaction
      const { data: payments, error: paymentsError } = await db
        .from('payments')
        .select('*')
        .eq('transaction_id', transactionId)

      if (paymentsError) throw paymentsError

      if (payments && payments.length > 0) {
        const payment = payments[0]
        
        // Use the void payment endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/${payment.id}/void`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: 'Payment voided by administrator'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to void payment')
        }

        setSuccess('Payment voided successfully!')
      } else {
        // Legacy transaction without payment record - void the transaction directly
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/finance/transactions/${transactionId}/void`, {
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
      }

      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error voiding payment:', err)
      setError(err.message || 'Failed to void payment')
    } finally {
      setSaving(false)
    }
  }

  // Get student info from transaction reference_id (which is payment_id)
  const getStudentInfo = (transaction: FinancialTransaction) => {
    // For FEE_PAYMENT transactions, reference_id is the payment ID
    if (transaction.reference_type === 'FEE_PAYMENT' && transaction.reference_id) {
      const payment = payments.find(p => p.id === transaction.reference_id)
      if (payment) {
        return {
          name: payment.student_name,
          studentId: payment.student_ref_id,
          phone: '-', // Payment doesn't store phone
        }
      }
    }
    
    // Fallback: try to find in enrollments (for legacy transactions)
    if (transaction.reference_id) {
      const enrollment = enrollments.find((e) => e.id === transaction.reference_id)
      if (enrollment) {
        return {
          name: `${enrollment.student_first_name} ${enrollment.student_last_name}`,
          studentId: enrollment.student_id,
          phone: enrollment.student_phone,
        }
      }
    }
    
    return {
      name: 'Unknown Student',
      studentId: transaction.reference_id || '-',
      phone: '-',
    }
  }

  // Get account mode from account_id
  const getPaymentMode = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    return account?.account_mode || 'UNKNOWN'
  }

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const studentInfo = getStudentInfo(transaction.reference_id)
    const matchesSearch =
      searchQuery === '' ||
      studentInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentInfo.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase())

    const paymentMode = getPaymentMode(transaction.account_id)
    const matchesMode = filterMode === 'all' || paymentMode === filterMode

    return matchesSearch && matchesMode
  })

  // Calculate stats
  const stats = {
    total: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    bank: filteredTransactions.filter((t) => getPaymentMode(t.account_id) === 'BANK').reduce((sum, t) => sum + t.amount, 0),
    cash: filteredTransactions.filter((t) => getPaymentMode(t.account_id) === 'CASH').reduce((sum, t) => sum + t.amount, 0),
    count: filteredTransactions.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Fee Management</h1>
          <p className="text-sm md:text-base text-gray-600">Track student fee payments and transactions</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Payment
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

      {/* Add Payment Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Payment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student <span className="text-red-500">*</span>
              </label>
              <div className="relative student-search-container">
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value)
                    setShowStudentDropdown(true)
                    if (!e.target.value) {
                      setSelectedStudent('')
                    }
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder="Search student by name or ID..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                />
                
                {/* Dropdown list */}
                {showStudentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {enrollments
                      .filter((enrollment) => {
                        const searchLower = studentSearchQuery.toLowerCase()
                        const fullName = `${enrollment.student_first_name} ${enrollment.student_last_name}`.toLowerCase()
                        const studentId = enrollment.student_id.toLowerCase()
                        return fullName.includes(searchLower) || studentId.includes(searchLower)
                      })
                      .map((enrollment) => (
                        <button
                          key={enrollment.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(enrollment.id)
                            setStudentSearchQuery(`${enrollment.student_first_name} ${enrollment.student_last_name} (${enrollment.student_id})`)
                            setShowStudentDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                            selectedStudent === enrollment.id ? 'bg-art-indigo/10' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {enrollment.student_first_name} {enrollment.student_last_name}
                          </div>
                          <div className="text-sm text-gray-500">{enrollment.student_id}</div>
                        </button>
                      ))}
                    
                    {enrollments.filter((enrollment) => {
                      const searchLower = studentSearchQuery.toLowerCase()
                      const fullName = `${enrollment.student_first_name} ${enrollment.student_last_name}`.toLowerCase()
                      const studentId = enrollment.student_id.toLowerCase()
                      return fullName.includes(searchLower) || studentId.includes(searchLower)
                    }).length === 0 && (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">
                        No students found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedStudent 
                  ? `Selected: ${enrollments.find(e => e.id === selectedStudent)?.student_first_name} ${enrollments.find(e => e.id === selectedStudent)?.student_last_name}`
                  : 'Start typing to search for a student'
                }
              </p>
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

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
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

            {/* Transaction Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g., TXN123456"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowPaymentConfirm(true)}
              disabled={saving}
              className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Add Payment'}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Total Collected</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">₹{stats.total.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 md:w-10 h-8 md:h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Bank Payments</p>
              <p className="text-xl md:text-3xl font-bold text-blue-600">₹{stats.bank.toFixed(2)}</p>
            </div>
            <CreditCard className="w-8 md:w-10 h-8 md:h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Cash Payments</p>
              <p className="text-xl md:text-3xl font-bold text-green-600">₹{stats.cash.toFixed(2)}</p>
            </div>
            <Banknote className="w-8 md:w-10 h-8 md:h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.count}</p>
            </div>
            <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 font-bold text-xs md:text-sm">#</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Student
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

          {/* Payment Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Modes</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Modes</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CASH">Cash</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSearchQuery('')
            setFilterMode('all')
          }}
          className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No payments found</p>
                      <p className="text-sm mt-1">Add your first payment to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  const studentInfo = getStudentInfo(transaction)
                  const paymentMode = getPaymentMode(transaction.account_id)
                  const isEditing = editingTransactionId === transaction.id

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{studentInfo.name}</div>
                        <div className="text-xs text-gray-500">{studentInfo.studentId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                            className="text-sm px-2 py-1 border rounded w-24"
                            step="0.01"
                          />
                        ) : (
                          <div className="text-sm font-bold text-gray-900">₹{transaction.amount.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            paymentMode === 'BANK'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {paymentMode === 'BANK' ? (
                            <CreditCard className="w-3 h-3" />
                          ) : (
                            <Banknote className="w-3 h-3" />
                          )}
                          {paymentMode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editData.transaction_date || ''}
                            onChange={(e) => setEditData({ ...editData, transaction_date: e.target.value })}
                            className="text-sm px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                          </div>
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
                          <div className="text-sm text-gray-500 max-w-md">
                            {transaction.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(transaction.id)}
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
                              onClick={() => startEdit(transaction)}
                              className="text-art-indigo hover:text-art-indigo/80"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
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
      </div>

      {/* Records Count */}
      {filteredTransactions.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredTransactions.length} payment{filteredTransactions.length !== 1 ? 's' : ''}
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(false)}
        onConfirm={handleAddPayment}
        title="Record Payment?"
        message={
          selectedStudent && amount
            ? `Are you sure you want to record a payment of ₹${amount} for ${enrollments.find(e => e.id === selectedStudent)?.student_first_name} ${enrollments.find(e => e.id === selectedStudent)?.student_last_name} via ${paymentMode}?`
            : 'Are you sure you want to record this payment?'
        }
        confirmText="Record Payment"
        variant="info"
        loading={saving}
      />
    </div>
  )
}
