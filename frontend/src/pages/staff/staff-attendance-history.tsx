import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Calendar, CheckCircle, XCircle, AlertCircle, Save, Loader2, Edit2, X, Filter } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  batch_id: string
  batch_name: string
  class_date: string
  status: string
  marked_at: string
  updated_at: string
}

interface EditingRecord {
  id: string
  status: 'PRESENT' | 'ABSENT'
}

export default function StaffAttendanceHistory() {
  const { user } = useAuthStore()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Editing state
  const [editingRecords, setEditingRecords] = useState<Map<string, EditingRecord>>(new Map())

  useEffect(() => {
    if (user?.id) {
      loadBatches()
    }
  }, [user])

  useEffect(() => {
    const today = new Date()
    switch (dateRange) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
        break
    }
  }, [dateRange])

  useEffect(() => {
    if (batches.length > 0) {
      loadAttendance()
    }
  }, [batches, startDate, endDate, selectedBatch])

  useEffect(() => {
    filterAttendance()
  }, [attendance, searchQuery])

  const loadBatches = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/staff/my-batches?user_id=${user?.id}`
      )

      if (!response.ok) {
        throw new Error('Failed to load batches')
      }

      const data = await response.json()
      setBatches(data.batches || [])
    } catch (err: any) {
      console.error('Error loading batches:', err)
      setError(err.message || 'Failed to load batches')
    }
  }

  const loadAttendance = async () => {
    try {
      setLoading(true)
      setError('')

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Get attendance for staff's batches
      const batchIds = selectedBatch === 'all' 
        ? batches.map(b => b.id).join(',')
        : selectedBatch

      const response = await fetch(
        `${API_URL}/api/staff/attendance-history?user_id=${user.id}&batch_ids=${batchIds}&start_date=${startDate}&end_date=${endDate}`
      )

      if (!response.ok) {
        throw new Error('Failed to load attendance history')
      }

      const data = await response.json()
      setAttendance(data.attendance || [])

    } catch (err: any) {
      console.error('Error loading attendance:', err)
      setError(err.message || 'Failed to load attendance history')
    } finally {
      setLoading(false)
    }
  }

  const filterAttendance = () => {
    if (!searchQuery.trim()) {
      setFilteredAttendance(attendance)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = attendance.filter(record =>
      record.student_name.toLowerCase().includes(query) ||
      record.student_id.toLowerCase().includes(query) ||
      record.batch_name.toLowerCase().includes(query)
    )
    setFilteredAttendance(filtered)
  }

  const startEditing = (record: AttendanceRecord) => {
    const newEditingRecords = new Map(editingRecords)
    newEditingRecords.set(record.id, {
      id: record.id,
      status: record.status as 'PRESENT' | 'ABSENT'
    })
    setEditingRecords(newEditingRecords)
  }

  const cancelEditing = (recordId: string) => {
    const newEditingRecords = new Map(editingRecords)
    newEditingRecords.delete(recordId)
    setEditingRecords(newEditingRecords)
  }

  const updateEditingStatus = (recordId: string, status: 'PRESENT' | 'ABSENT') => {
    const newEditingRecords = new Map(editingRecords)
    const existing = newEditingRecords.get(recordId)
    if (existing) {
      newEditingRecords.set(recordId, { ...existing, status })
      setEditingRecords(newEditingRecords)
    }
  }

  const saveEdit = async (recordId: string) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const editData = editingRecords.get(recordId)
      if (!editData) return

      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `${API_URL}/api/staff/attendance/${recordId}/edit`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: user?.id,
            status: editData.status
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update' }))
        throw new Error(errorData.detail || 'Failed to update attendance')
      }

      // Update local state
      setAttendance(prev =>
        prev.map(record =>
          record.id === recordId
            ? { ...record, status: editData.status, updated_at: new Date().toISOString() }
            : record
        )
      )

      // Remove from editing
      cancelEditing(recordId)

      setSuccess('Attendance updated successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      console.error('Error updating attendance:', err)
      setError(err.message || 'Failed to update attendance')
    } finally {
      setSaving(false)
    }
  }

  const stats = {
    total: filteredAttendance.length,
    present: filteredAttendance.filter(a => a.status === 'PRESENT').length,
    absent: filteredAttendance.filter(a => a.status === 'ABSENT').length,
    editing: editingRecords.size
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-7 w-7 text-art-indigo" />
          Attendance History
        </h1>
        <p className="text-muted-foreground mt-1">
          View and edit attendance records for your batches
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-sm text-green-700">Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-sm text-red-700">Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-700">Editing</p>
          <p className="text-2xl font-bold text-blue-600">{stats.editing}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Start Date */}
          {dateRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          )}

          {/* End Date */}
          {dateRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          )}

          {/* Batch Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-art-indigo" />
        </div>
      ) : filteredAttendance.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium text-foreground">No attendance records found</p>
          <p className="text-sm text-muted-foreground mt-2">
            {attendance.length === 0
              ? 'No records for the selected date range'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAttendance.map((record) => {
                  const isEditing = editingRecords.has(record.id)
                  const editData = editingRecords.get(record.id)

                  return (
                    <tr key={record.id} className={`hover:bg-muted/30 transition-colors ${isEditing ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {format(new Date(record.class_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(record.class_date), 'EEEE')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {record.student_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.student_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {record.batch_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateEditingStatus(record.id, 'PRESENT')}
                              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                                editData?.status === 'PRESENT'
                                  ? 'bg-green-500 border-green-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                              }`}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Present</span>
                            </button>
                            <button
                              onClick={() => updateEditingStatus(record.id, 'ABSENT')}
                              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                                editData?.status === 'ABSENT'
                                  ? 'bg-red-500 border-red-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                              }`}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Absent</span>
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            record.status === 'PRESENT'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : record.status === 'ABSENT'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {record.status === 'PRESENT' && <CheckCircle className="h-3 w-3" />}
                            {record.status === 'ABSENT' && <XCircle className="h-3 w-3" />}
                            {record.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => saveEdit(record.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={() => cancelEditing(record.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(record)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-art-indigo hover:text-art-indigo/80 hover:bg-art-indigo/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
