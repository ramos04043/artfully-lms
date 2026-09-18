import { useEffect, useState } from 'react'
import { Calendar, AlertCircle, XCircle, CheckCircle, Trash2, RefreshCw, Filter } from 'lucide-react'
import { format } from 'date-fns'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface Holiday {
  id: string
  name: string
  holiday_date: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function HolidayHistoryPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [filteredHolidays, setFilteredHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [holidayToDelete, setHolidayToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Filters
  const [showInactive, setShowInactive] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadHolidays()
  }, [])

  useEffect(() => {
    filterHolidays()
  }, [holidays, showInactive, selectedYear])

  const loadHolidays = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`${API_URL}/api/holidays`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to load holidays' }))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()
      setHolidays(data)

    } catch (err: any) {
      console.error('Error loading holidays:', err)
      setError(err.message || 'Failed to load holidays')
    } finally {
      setLoading(false)
    }
  }

  const filterHolidays = () => {
    let filtered = holidays

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter(h => h.is_active)
    }

    // Filter by year
    if (selectedYear !== 'all') {
      filtered = filtered.filter(h => h.holiday_date.startsWith(selectedYear))
    }

    setFilteredHolidays(filtered)
  }

  const handleDeleteClick = (holidayId: string) => {
    setHolidayToDelete(holidayId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!holidayToDelete) return

    try {
      setDeleting(true)
      setShowDeleteConfirm(false)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`${API_URL}/api/holidays/${holidayToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete holiday' }))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      setSuccess('Holiday deleted successfully!')
      setHolidayToDelete(null)
      
      // Reload holidays
      await loadHolidays()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      console.error('Error deleting holiday:', err)
      setError(err.message || 'Failed to delete holiday')
    } finally {
      setDeleting(false)
    }
  }

  // Get unique years from holidays
  const years = Array.from(new Set(
    holidays.map(h => new Date(h.holiday_date).getFullYear())
  )).sort((a, b) => b - a)

  const stats = {
    total: filteredHolidays.length,
    upcoming: filteredHolidays.filter(h => new Date(h.holiday_date) >= new Date() && h.is_active).length,
    past: filteredHolidays.filter(h => new Date(h.holiday_date) < new Date() && h.is_active).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading holidays...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-art-indigo" />
              Holiday History
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              View and manage all marked holidays
            </p>
          </div>
          <button
            onClick={loadHolidays}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Holidays</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-5 shadow-sm">
          <p className="text-sm text-green-700 mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-green-600">{stats.upcoming}</p>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Past</p>
          <p className="text-2xl font-bold text-gray-900">{stats.past}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-art-indigo border-gray-300 rounded focus:ring-art-indigo"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Show inactive holidays
            </label>
          </div>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredHolidays.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900">No holidays found</p>
            <p className="text-sm text-gray-500 mt-2">
              {holidays.length === 0 
                ? 'No holidays have been marked yet'
                : 'Try adjusting your filters'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Holiday Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHolidays.map((holiday) => {
                  const holidayDate = new Date(holiday.holiday_date)
                  const isUpcoming = holidayDate >= new Date() && holiday.is_active
                  
                  return (
                    <tr key={holiday.id} className={`hover:bg-gray-50 transition-colors ${!holiday.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {format(holidayDate, 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(holidayDate, 'EEEE')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{holiday.name}</span>
                          {isUpcoming && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {holiday.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          holiday.is_active
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {holiday.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {holiday.is_active && (
                          <button
                            onClick={() => handleDeleteClick(holiday.id)}
                            disabled={deleting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete holiday"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
