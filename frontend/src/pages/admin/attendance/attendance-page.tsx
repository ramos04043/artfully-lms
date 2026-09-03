import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { 
  Calendar, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Users,
  Search,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  Trash2
} from 'lucide-react'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface AttendanceRecord {
  id: string
  student_id: string
  batch_id: string
  session_id: string
  class_date: string
  status: string
  notes?: string
  created_at?: string
  updated_at?: string
}

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  status: string
}

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  programme_name: string
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Update date range based on preset
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

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load students from enrollments table (active enrollments)
      const { data: enrollmentsData, error: enrollmentsError } = await db
        .from('enrollments')
        .select('id, student_id, student_first_name, student_last_name, student_phone, student_email, status')
        .eq('status', 'ACTIVE')
        .order('student_first_name', { ascending: true })

      if (enrollmentsError) throw enrollmentsError
      
      // Convert enrollment data to student format for compatibility
      const studentsFromEnrollments = enrollmentsData?.map(e => ({
        id: e.student_id,  // Use student_id as the lookup key
        student_id: e.student_id,
        first_name: e.student_first_name,
        last_name: e.student_last_name,
        phone: e.student_phone,
        email: e.student_email,
        status: e.status
      })) || []
      
      setStudents(studentsFromEnrollments)

      // Load batches with programme names
      const { data: batchesData, error: batchesError } = await db
        .from('batches')
        .select(`
          id, 
          name, 
          day_of_week, 
          start_time, 
          end_time,
          programme_id
        `)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })

      if (batchesError) throw batchesError

      // Load programmes separately
      const { data: programmesData, error: programmesError } = await db
        .from('programmes')
        .select('id, name')

      if (programmesError) throw programmesError

      // Map programme names to batches
      const programmesMap = new Map(programmesData?.map(p => [p.id, p.name]) || [])
      
      const formattedBatches = batchesData?.map((b: any) => ({
        id: b.id,
        name: b.name,
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        programme_name: programmesMap.get(b.programme_id) || 'Unknown'
      })) || []
      
      setBatches(formattedBatches)

      // Load initial attendance
      await loadAttendance()
    } catch (err: any) {
      console.error('Error loading data:', err)
      const errorMessage = err?.message?.message || err?.message || err?.details?.message || 'Failed to load data'
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const loadAttendance = async () => {
    try {
      setRefreshing(true)

      // Build query - match actual database schema
      let query = db
        .from('attendance')
        .select('id, student_id, batch_id, session_id, class_date, status, notes, created_at, updated_at')
        .gte('class_date', startDate)
        .lte('class_date', endDate)
        .order('class_date', { ascending: false })

      // Apply batch filter
      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch)
      }

      // Apply status filter
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      const { data: attendanceData, error: attendanceError } = await query

      if (attendanceError) throw attendanceError

      // Apply client-side search filter
      let filteredData = attendanceData || []
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredData = filteredData.filter((record) => {
          const student = students.find((s) => s.id === record.student_id)
          if (!student) return false
          
          const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
          const studentId = student.student_id.toLowerCase()
          
          return fullName.includes(query) || studentId.includes(query)
        })
      }

      setAttendance(filteredData)
    } catch (err: any) {
      console.error('Error loading attendance:', err)
      const errorMessage = err?.message?.message || err?.message || err?.details?.message || 'Failed to load attendance'
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!loading && students.length > 0) {
      loadAttendance()
    }
  }, [startDate, endDate, selectedBatch, selectedStatus, searchQuery])

  // Get student info
  const getStudent = (studentId: string): Student | undefined => {
    return students.find((s) => s.id === studentId)
  }

  // Get batch info
  const getBatch = (batchId: string): Batch | undefined => {
    return batches.find((b) => b.id === batchId)
  }

  // Calculate stats
  const stats = {
    total: attendance.length,
    present: attendance.filter((a) => a.status === 'PRESENT').length,
    absent: attendance.filter((a) => a.status === 'ABSENT').length,
    compensation: attendance.filter((a) => a.status === 'COMPENSATION_PRESENT').length,
    unmarked: attendance.filter((a) => a.status === 'UNMARKED').length,
  }

  const presentPercentage = stats.total > 0 
    ? ((stats.present / (stats.total - stats.unmarked)) * 100).toFixed(1) 
    : '0.0'

  const handleRefresh = () => {
    loadAttendance()
  }

  const handleResetFilters = () => {
    setDateRange('today')
    setSelectedBatch('all')
    setSelectedStatus('all')
    setSearchQuery('')
  }

  const handleDeleteRecord = (recordId: string) => {
    setRecordToDelete(recordId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return

    try {
      setDeleting(true)
      setShowDeleteConfirm(false)
      setError('')
      setSuccess('')

      console.log('🗑️ Deleting attendance record:', recordToDelete)

      const { error: deleteError } = await db
        .from('attendance')
        .delete()
        .eq('id', recordToDelete)

      if (deleteError) throw deleteError

      console.log('✅ Attendance record deleted successfully')
      setSuccess('Attendance record deleted successfully!')
      setRecordToDelete(null)
      
      // Reload attendance data
      await loadAttendance()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting attendance record:', err)
      setError(err.message || 'Failed to delete attendance record')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Attendance Records</h1>
            <p className="text-gray-600">View and track student attendance across all batches</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-medium">Error loading data</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-medium">Total Records</p>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Present</p>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.present}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-red-700 font-medium">Absent</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Compensation</p>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.compensation}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-700 font-medium">Attendance Rate</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{presentPercentage}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or student ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Preset */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent appearance-none bg-white"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Start Date (for custom range) */}
            {dateRange === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                />
              </div>
            )}

            {/* End Date (for custom range) */}
            {dateRange === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                />
              </div>
            )}

            {/* Batch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} - {batch.programme_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="COMPENSATION_PRESENT">Compensation</option>
                <option value="UNMARKED">Unmarked</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {attendance.length} of {stats.total} records
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Marked At
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {refreshing ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-indigo"></div>
                      <span className="ml-3 text-gray-600">Refreshing...</span>
                    </div>
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium text-gray-900">No attendance records found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or date range</p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendance.map((record) => {
                  const student = getStudent(record.student_id)
                  const batch = getBatch(record.batch_id)

                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {student ? `${student.first_name} ${student.last_name}` : 'Unknown'}
                              </span>
                              {record.status === 'COMPENSATION_PRESENT' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                                  <Calendar className="w-2.5 h-2.5" />
                                  COMPENSATION
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {student?.student_id || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{batch?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">
                            {batch?.day_of_week} � {batch?.start_time}-{batch?.end_time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {format(new Date(record.class_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(record.class_date), 'EEEE')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            record.status === 'PRESENT'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : record.status === 'ABSENT'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : record.status === 'COMPENSATION_PRESENT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : record.status === 'UNMARKED'
                              ? 'bg-gray-100 text-gray-800 border border-gray-200'
                              : record.status === 'HOLIDAY'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {record.status === 'PRESENT' && <CheckCircle className="w-3 h-3" />}
                          {record.status === 'ABSENT' && <XCircle className="w-3 h-3" />}
                          {record.status === 'COMPENSATION_PRESENT' && <Calendar className="w-3 h-3" />}
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {record.updated_at
                            ? format(new Date(record.updated_at), 'MMM dd, hh:mm a')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {record.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete attendance record"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {attendance.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing <span className="font-medium text-gray-900">{attendance.length}</span> record
            {attendance.length !== 1 ? 's' : ''}
            {(selectedBatch !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <span className="text-gray-500"> (filtered)</span>
            )}
          </div>
          <div className="text-gray-500">
            {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd, yyyy')}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setRecordToDelete(null)
        }}
        onConfirm={confirmDeleteRecord}
        title="Delete Attendance Record?"
        message="Are you sure you want to delete this attendance record? This action cannot be undone and will permanently remove the record from the system."
        confirmText="Delete Record"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
