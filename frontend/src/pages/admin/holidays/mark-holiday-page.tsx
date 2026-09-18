import { useState } from 'react'
import { Calendar, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function MarkHolidayPage() {
  const [holidayDate, setHolidayDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [holidayName, setHolidayName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!holidayName.trim()) {
      setError('Please enter a holiday name')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`${API_URL}/api/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: holidayName,
          holiday_date: holidayDate,
          description: description.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create holiday' }))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log('Holiday created:', result)

      setSuccess(`Holiday "${holidayName}" marked successfully for ${format(new Date(holidayDate), 'MMMM dd, yyyy')}!`)
      
      // Reset form
      setHolidayName('')
      setDescription('')
      setHolidayDate(format(new Date(), 'yyyy-MM-dd'))

    } catch (err: any) {
      console.error('Error marking holiday:', err)
      setError(err.message || 'Failed to mark holiday')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-art-indigo" />
          Mark Holiday
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Mark a date as a school holiday
        </p>
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
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Holiday Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Holiday Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent text-base"
            />
          </div>

          {/* Holiday Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Holiday Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="e.g., Independence Day, Diwali"
              required
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent text-base"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional notes about this holiday..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent text-base resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !holidayName.trim()}
              className="flex-1 bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Marking Holiday...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Mark Holiday
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setHolidayName('')
                setDescription('')
                setHolidayDate(format(new Date(), 'yyyy-MM-dd'))
                setError('')
                setSuccess('')
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-medium mb-1">Note:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Marked holidays will appear in the Holiday History page</li>
              <li>You cannot mark a holiday for a date that already has a holiday</li>
              <li>Holidays can be viewed and managed from the history page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
