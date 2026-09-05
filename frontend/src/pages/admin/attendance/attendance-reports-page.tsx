import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { 
  Calendar, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  User,
  BookOpen,
  BarChart3,
  Download
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  student_id: string
  batch_id: string
  session_id: string
  class_date: string
  status: string
  created_at: string
  updated_at: string
}

interface StudentInfo {
  student_id: string
  student_first_name: string
  student_last_name: string
  student_phone: string
  student_email: string
  programme_name?: string
}

interface BatchInfo {
  id: string
  name: string
  day_of_week: string
}

interface AttendanceStats {
  totalSessions: number
  present: number
  absent: number
  compensation: number
  holiday: number
  cancelled: number
  attendancePercentage: number
}

export default function AttendanceReportsPage() {
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null)
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [error, setError] = useState('')
  
  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadStudents()
    loadBatches()
  }, [])

  useEffect(() => {
    if (selectedStudent) {
      loadAttendance()
    }
  }, [selectedStudent, startDate, endDate, statusFilter])

  const loadStudents = async () => {
    try {
      // Load ACTIVE students
      const { data: activeData, error: activeError } = await db
        .from('enrollments')
        .select('student_id, student_first_name, student_last_name, student_phone, student_email, batch_ids')
        .eq('status', 'ACTIVE')

      if (activeError) throw activeError

      // Load PAUSED students
      const { data: pausedData, error: pausedError } = await db
        .from('enrollments')
        .select('student_id, student_first_name, student_last_name, student_phone, student_email, batch_ids')
        .eq('status', 'PAUSED')

      if (pausedError) throw pausedError

      // Combine students
      const allStudents = [...(activeData || []), ...(pausedData || [])]

      // Get all unique batch IDs
      const batchIds = [...new Set(allStudents.flatMap(s => s.batch_ids || []))]

      // Fetch batches with programme info
      const { data: batchesData } = await db
        .from('batches')
        .select('id, programme_id')

      // Get all programme IDs
      const programmeIds = [...new Set((batchesData || []).map(b => b.programme_id).filter(Boolean))]

      // Fetch programme names
      const { data: programmesData } = await db
        .from('programmes')
        .select('id, name')

      const programmesMap = new Map((programmesData || []).map(p => [p.id, p.name]))
      const batchProgrammeMap = new Map((batchesData || []).map(b => [b.id, programmesMap.get(b.programme_id)]))

      // Add programme name to students based on their first batch
      const studentsWithProgrammes = allStudents.map(s => {
        const firstBatchId = s.batch_ids?.[0]
        const programmeName = firstBatchId ? batchProgrammeMap.get(firstBatchId) : ''
        return {
          student_id: s.student_id,
          student_first_name: s.student_first_name,
          student_last_name: s.student_last_name,
          student_phone: s.student_phone,
          student_email: s.student_email,
          programme_name: programmeName || ''
        }
      })

      // Remove duplicates based on student_id
      const uniqueStudents = Array.from(
        new Map(studentsWithProgrammes.map(s => [s.student_id, s])).values()
      )

      // Sort by student_id (ART1001, ART1002, etc.)
      uniqueStudents.sort((a, b) => a.student_id.localeCompare(b.student_id))

      setStudents(uniqueStudents as StudentInfo[])
    } catch (err: any) {
      console.error('Error loading students:', err)
      setError(err.message || 'Failed to load students')
    }
  }

  const loadBatches = async () => {
    try {
      const { data, error } = await db
        .from('batches')
        .select('id, name, day_of_week')
        .eq('is_active', true)

      if (error) throw error
      setBatches((data || []) as BatchInfo[])
    } catch (err: any) {
      console.error('Error loading batches:', err)
    }
  }

  const loadAttendance = async () => {
    if (!selectedStudent) return

    try {
      setLoading(true)
      setError('')

      let query = db
        .from('attendance')
        .select('*')
        .eq('student_id', selectedStudent.student_id)
        .order('class_date', { ascending: false })

      // Apply date filters
      if (startDate) {
        query = query.gte('class_date', startDate)
      }
      if (endDate) {
        query = query.lte('class_date', endDate)
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const records = (data || []) as AttendanceRecord[]
      setAttendanceRecords(records)

      // Calculate stats
      calculateStats(records)
    } catch (err: any) {
      console.error('Error loading attendance:', err)
      setError(err.message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: AttendanceRecord[]) => {
    const present = records.filter(r => r.status === 'PRESENT').length
    const absent = records.filter(r => r.status === 'ABSENT').length
    const compensation = records.filter(r => r.status === 'COMPENSATION_PRESENT').length
    const holiday = records.filter(r => r.status === 'HOLIDAY').length
    const cancelled = records.filter(r => r.status === 'CANCELLED').length

    // Calculate attendance percentage (exclude holidays and cancelled)
    const attendableSessions = records.filter(
      r => !['HOLIDAY', 'CANCELLED', 'UNMARKED'].includes(r.status)
    ).length

    const attendancePercentage = attendableSessions > 0
      ? ((present + compensation) / attendableSessions) * 100
      : 0

    setStats({
      totalSessions: records.length,
      present,
      absent,
      compensation,
      holiday,
      cancelled,
      attendancePercentage
    })
  }

  const getBatchName = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId)
    return batch ? `${batch.name} (${batch.day_of_week})` : 'Unknown Batch'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800'
      case 'ABSENT':
        return 'bg-red-100 text-red-800'
      case 'COMPENSATION_PRESENT':
        return 'bg-blue-100 text-blue-800'
      case 'HOLIDAY':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="w-4 h-4" />
      case 'ABSENT':
        return <XCircle className="w-4 h-4" />
      case 'COMPENSATION_PRESENT':
        return <TrendingUp className="w-4 h-4" />
      case 'HOLIDAY':
        return <Calendar className="w-4 h-4" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const exportToCSV = () => {
    if (!selectedStudent || attendanceRecords.length === 0) return

    const headers = ['Date', 'Batch', 'Status', 'Marked At']
    const rows = attendanceRecords.map(record => [
      format(new Date(record.class_date), 'yyyy-MM-dd'),
      getBatchName(record.batch_id),
      record.status,
      format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${selectedStudent.student_id}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Attendance Reports</h1>
        <p className="text-sm md:text-base text-gray-600">View student attendance history and statistics</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!selectedStudent ? (
        /* Student List View */
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Select a Student</h2>
            <span className="ml-auto text-sm text-gray-500">{students.length} students</span>
          </div>

          {/* Student List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <button
                key={student.student_id}
                onClick={() => setSelectedStudent(student)}
                className="text-left p-4 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-lg hover:border-art-indigo hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        {student.student_first_name} {student.student_last_name}
                      </p>
                      {student.programme_name?.toLowerCase().includes('advanced') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                          ADVANCED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{student.student_id}</p>
                    <p className="text-xs text-gray-500">{student.student_phone}</p>
                  </div>
                  <User className="w-10 h-10 text-gray-300" />
                </div>
              </button>
            ))}
          </div>

          {students.length === 0 && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No students found</p>
            </div>
          )}
        </div>
      ) : (
        /* Selected Student View - Attendance Details */
        <>
          {/* Back Button and Student Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
            <button
              onClick={() => {
                setSelectedStudent(null)
                setAttendanceRecords([])
                setStats(null)
              }}
              className="flex items-center gap-2 text-art-indigo hover:text-art-indigo-dark mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Student List
            </button>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Viewing Attendance For:</p>
              <p className="text-xl font-bold text-blue-900">
                {selectedStudent.student_first_name} {selectedStudent.student_last_name}
              </p>
              <p className="text-sm text-blue-700">{selectedStudent.student_id}</p>
            </div>
          </div>
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-gray-600" />
                  <p className="text-sm text-gray-600">Total Sessions</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-gray-600">Present</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.present + stats.compensation}</p>
                <p className="text-xs text-gray-500">
                  {stats.compensation > 0 && `(${stats.compensation} compensation)`}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-gray-600">Absent</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-gray-600">Attendance %</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.attendancePercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="COMPENSATION_PRESENT">Compensation</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Export Button */}
              <div className="flex items-end">
                <button
                  onClick={exportToCSV}
                  disabled={attendanceRecords.length === 0}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setStatusFilter('all')
              }}
              className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Attendance Records Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Attendance History</h2>
              <p className="text-sm text-gray-600">
                {attendanceRecords.length} record{attendanceRecords.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
                <p className="text-gray-600">Loading attendance...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-600">No attendance records found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try adjusting your filters or select a different student
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marked At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(record.class_date), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getBatchName(record.batch_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {getStatusIcon(record.status)}
                            {record.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(record.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
