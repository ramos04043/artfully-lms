import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { format } from 'date-fns'
import { ArrowLeft, Search, CheckCircle, XCircle, Save, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  status: string
  attendance_status?: 'PRESENT' | 'ABSENT' | null
  attendance_id?: string
  weekly_classes_count?: number
  has_class_today?: boolean
}

export default function StaffAttendance() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [batch, setBatch] = useState<any>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadBatchAndStudents()
  }, [batchId])

  const loadBatchAndStudents = async () => {
    try {
      setLoading(true)
      setError('')

      if (!user?.id) {
        setError('User not authenticated')
        return
      }

      // Call backend API with security validation
      const response = await fetch(
        `${API_URL}/api/staff/batches/${batchId}/students?user_id=${user.id}`
      )

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied: You are not assigned to this batch')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      setBatch(data.batch)
      setStudents(data.students || [])
      
      if (data.students.length === 0) {
        setError('No students enrolled in this batch')
      }
    } catch (err: any) {
      console.error('Error loading batch:', err)
      setError(err.message || 'Failed to load batch')
    } finally {
      setLoading(false)
    }
  }

  const markAttendance = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, attendance_status: status }
          : s
      )
    )
  }

  const saveAttendance = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (!user?.id) {
        setError('User not authenticated')
        return
      }

      const attendanceRecords = students
        .filter((s) => s.attendance_status)
        .map((s) => ({
          student_id: s.student_id,  // Use student_id string like "STU26268836"
          status: s.attendance_status,
        }))

      if (attendanceRecords.length === 0) {
        setError('Please mark at least one student')
        return
      }

      // Submit via backend API with security validation
      const response = await fetch(
        `${API_URL}/api/staff/batches/${batchId}/attendance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            class_date: today,
            attendance: attendanceRecords,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save attendance' }))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const result = await response.json()
      
      setSuccess(
        result.message || 
        `Attendance saved successfully! ${result.marked_count} student${result.marked_count !== 1 ? 's' : ''} marked.`
      )
      
      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.warn('Attendance errors:', result.errors)
      }
      
      // Refresh data
      setTimeout(() => {
        loadBatchAndStudents()
        setSuccess('')
      }, 2000)

    } catch (err: any) {
      console.error('Error saving attendance:', err)
      setError(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const markedCount = students.filter((s) => s.attendance_status).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <button
            onClick={() => navigate('/staff')}
            className="flex items-center gap-2 text-gray-600 mb-3 active:text-art-indigo"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Today</span>
          </button>
          
          <h1 className="text-xl font-bold text-gray-900">{batch?.name || 'Batch'}</h1>
          <p className="text-sm text-gray-600">
            {batch?.start_time} - {batch?.end_time} • {batch?.programmes?.name}
          </p>
          <p className="text-xs text-gray-500 mt-1">{format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Students List - with padding for fixed button and bottom nav */}
      <div className="p-4 pb-64">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No students found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div
                key={student.student_id}
                className={`bg-white rounded-lg border-2 p-4 ${
                  student.attendance_status === 'PRESENT'
                    ? 'border-green-300 bg-green-50'
                    : student.attendance_status === 'ABSENT'
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                {/* Student Info */}
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {student.first_name} {student.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{student.student_id}</p>
                  {(student.weekly_classes_count || 0) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {student.weekly_classes_count}/2 classes this week
                    </p>
                  )}
                </div>

                {/* Attendance Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => markAttendance(student.student_id, 'PRESENT')}
                    disabled={(student.weekly_classes_count || 0) >= 2 && student.attendance_status !== 'PRESENT'}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all active:scale-95 ${
                      student.attendance_status === 'PRESENT'
                        ? 'bg-green-600 text-white'
                        : 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Present
                  </button>

                  <button
                    onClick={() => markAttendance(student.student_id, 'ABSENT')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all active:scale-95 ${
                      student.attendance_status === 'ABSENT'
                        ? 'bg-red-600 text-white'
                        : 'bg-white border-2 border-red-600 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                    Absent
                  </button>
                </div>

                {(student.weekly_classes_count || 0) >= 2 && student.attendance_status !== 'PRESENT' && (
                  <p className="text-xs text-orange-600 mt-2 text-center">
                    Weekly limit reached (2/2 classes)
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button - Fixed above bottom navigation */}
      {students.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t-2 border-art-indigo shadow-2xl z-40">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Marked:</span>
                <span className="text-xl font-bold text-art-indigo">{markedCount}</span>
                <span className="text-sm text-gray-500">of {students.length}</span>
              </div>
              {markedCount > 0 ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Mark students</span>
                </div>
              )}
            </div>
            <button
              onClick={saveAttendance}
              disabled={saving || markedCount === 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                markedCount > 0 && !saving
                  ? 'bg-art-indigo hover:bg-art-indigo/90 text-white active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-6 h-6" />
              {saving ? 'Saving...' : markedCount === 0 ? 'Mark Students First' : `Save Attendance (${markedCount})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
