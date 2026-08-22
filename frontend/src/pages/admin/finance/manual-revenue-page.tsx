import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { 
  Plus, 
  TrendingUp,
  AlertCircle, 
  CheckCircle, 
  XCircle,
  DollarSign
} from 'lucide-react'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface Category {
  id: string
  code: string
  name: string
  account_type: string
  transaction_type: string
  description: string
  display_order: number
}

export default function ManualRevenuePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Get API URL from environment
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [accountType, setAccountType] = useState<'OPEX' | 'CAPEX'>('OPEX')
  const [accountMode, setAccountMode] = useState<'BANK' | 'CASH'>('BANK')
  const [categoryCode, setCategoryCode] = useState('')
  const [amount, setAmount] = useState('')
  const [revenueDate, setRevenueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [partyName, setPartyName] = useState('')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Confirmation dialog state
  const [showAddConfirm, setShowAddConfirm] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [accountType])

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      
      // Get ZendBX token from localStorage
      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        console.error('No authentication token found')
        setError('Authentication required. Please log in.')
        setLoadingCategories(false)
        return
      }
      
      // Fetch REVENUE categories for selected account type
      const response = await fetch(
        `${API_URL}/api/finance/categories?account_type=${accountType}&transaction_type=REVENUE`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to load categories')
      }
      
      const data = await response.json()
      setCategories(data)
      
      // Reset category selection when account type changes
      setCategoryCode('')
      
    } catch (err: any) {
      console.error('Error loading categories:', err)
      setError(err.message || 'Failed to load categories')
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleAddRevenue = async () => {
    try {
      setSaving(true)
      setShowAddConfirm(false)
      setError('')
      setSuccess('')

      // Validation
      if (!categoryCode || !amount || !description || !revenueDate) {
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
        setError('Authentication required. Please log in.')
        return
      }

      // Prepare request body
      const requestBody = {
        account_type: accountType,
        account_mode: accountMode,
        category_code: categoryCode,
        amount: amountNum,
        transaction_date: revenueDate,
        party_name: partyName || undefined,
        reference: reference || undefined,
        description: description,
        created_by: 'admin' // TODO: Get from auth context
      }

      console.log('🚀 Creating revenue with data:', requestBody)

      // Create revenue via API
      const response = await fetch(`${API_URL}/api/finance/revenue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Revenue creation failed:', errorData)
        
        // Extract detailed error message
        let errorMessage = 'Failed to create revenue'
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            // FastAPI validation errors are arrays
            errorMessage = errorData.detail.map((err: any) => 
              `${err.loc?.join('.') || 'Field'}: ${err.msg}`
            ).join(', ')
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail)
          }
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      setSuccess(
        `Revenue of ₹${amountNum.toFixed(2)} recorded successfully! ` +
        `New ${result.account_name} balance: ₹${result.new_balance.toFixed(2)}`
      )
      
      // Reset form
      setAccountType('OPEX')
      setAccountMode('BANK')
      setCategoryCode('')
      setAmount('')
      setRevenueDate(format(new Date(), 'yyyy-MM-dd'))
      setPartyName('')
      setReference('')
      setDescription('')
      setShowAddForm(false)

      setTimeout(() => setSuccess(''), 8000)
      
    } catch (err: any) {
      console.error('Error adding revenue:', err)
      setError(err.message || 'Failed to add revenue')
    } finally {
      setSaving(false)
    }
  }

  // Get selected category details
  const selectedCategory = categories.find(c => c.code === categoryCode)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Manual Revenue Entry</h1>
          <p className="text-sm md:text-base text-gray-600">
            Record revenue from sources other than student fee payments
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Revenue
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

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">When to Use Manual Revenue Entry</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Capital contributions from owners</li>
              <li>• Workshop or event fees (non-regular)</li>
              <li>• Art material sales to students</li>
              <li>• Grant income or sponsorships</li>
              <li>• Other miscellaneous revenue</li>
            </ul>
            <p className="text-sm text-blue-700 mt-3 font-medium">
              Note: Regular student fee payments should be recorded through the Fees page, not here.
            </p>
          </div>
        </div>
      </div>

      {/* Add Revenue Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Revenue</h2>
          
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
                <option value="OPEX">OPEX (Operating Revenue)</option>
                <option value="CAPEX">CAPEX (Capital Revenue)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                OPEX: Regular business income | CAPEX: Capital contributions, investments
              </p>
            </div>

            {/* Account Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={accountMode}
                onChange={(e) => setAccountMode(e.target.value as 'BANK' | 'CASH')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              >
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revenue Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                disabled={loadingCategories}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent disabled:opacity-50"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <p className="text-xs text-gray-500 mt-1">{selectedCategory.description}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                />
              </div>
            </div>

            {/* Revenue Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revenue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={revenueDate}
                onChange={(e) => setRevenueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Party Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Party/Source Name
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g., John Doe, ABC Corp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Reference */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., Receipt #, Transaction ID"
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
                placeholder="Describe the revenue source and purpose..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowAddConfirm(true)}
              disabled={saving || !categoryCode || !amount || !description}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              {saving ? 'Recording...' : 'Record Revenue'}
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

      {/* Recent Revenue Summary (placeholder) */}
      {!showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Click "Add Revenue" to record manual revenue</p>
          <p className="text-sm text-gray-500">
            Revenue transactions will be recorded in the financial ledger and reflected in account balances
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showAddConfirm}
        onClose={() => setShowAddConfirm(false)}
        onConfirm={handleAddRevenue}
        title="Record Revenue?"
        message={`Are you sure you want to record ${amount ? `₹${parseFloat(amount).toFixed(2)}` : 'this amount'} as revenue? This will update the account balance.`}
        confirmText="Record Revenue"
        variant="info"
        loading={saving}
      />
    </div>
  )
}
