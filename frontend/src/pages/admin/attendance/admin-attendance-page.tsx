import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { Calendar, UserCheck, AlertCircle, CheckCircle, XCircle, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface Batch {
  id: string
  name: string
  start_time: string
  end_time: string
}

interface Student {
  student_id: string
  student_name: string
  student_ref_id: string
  batch_id: string
  batch_name: string
  attendance_status?: 'PRESENT' | 'ABSENT' | null
  existing_attendance_id?: string
}

export default function AdminAttendancePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadBatches()
  }, [])

  useEffect(() => {
    if (batches.length > 0) {
      loadStudentsAndAttendance()
    }
  }, [selectedBatch, selectedDate, batches])

  const loadBatches = async () => {
    try {
      const { data: batchesData, error: batchError } = await db
        .from('batches')
        .select('id, name, start_time, end_time')
        .eq('is_active', true)
        .order('name')

      if (batchError) throw batchError

      setBatches(batchesData || [])
    } catch (err: any) {
      console.error('Error loading batches:', err)
      setError('Failed to load batches')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentsAndAttendance = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Use the dedicated backend endpoint that handles batch_ids array properly
      const batchParam = selectedBatch !== 'all' ? `?batch_id=${selectedBatch}` : ''
      const studentsResponse = await fetch(
        `${API_URL}/api/attendance/admin/students-for-attendance${batchParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!studentsResponse.ok) {
        const errorData = await studentsResponse.json().catch(() => ({ detail: 'Failed to load' }))
        throw new Error(errorData.detail || `Server error: ${studentsResponse.status}`)
      }

      const studentsData = await studentsResponse.json()

      // Get existing attendance for the selected date
      const attendanceFilters: any = {
        class_date: selectedDate
      }

      if (selectedBatch !== 'all') {
        attendanceFilters.batch_id = selectedBatch
      }

      const attendanceResponse = await fetch(
        `${API_URL}/api/db/attendance?select=id,student_id,batch_id,status&filters=${encodeURIComponent(JSON.stringify(attendanceFilters))}&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : []

      // Create a map of existing attendance - only PRESENT and ABSENT
      const attendanceMap = new Map()
      attendanceData
        ?.filter((att: any) => ['PRESENT', 'ABSENT'].includes(att.status))
        .forEach((att: any) => {
          const key = `${att.student_id}-${att.batch_id}`
          attendanceMap.set(key, {
            id: att.id,
            status: att.status
          })
        })

      // Map students with attendance status
      const studentsWithAttendance = studentsData.map((student: any) => {
        const key = `${student.student_id}-${student.batch_id}`
        const existing = attendanceMap.get(key)

        return {
          student_id: student.student_id,
          student_name: student.student_name,
          student_ref_id: student.student_ref_id,
          batch_id: student.batch_id,
          batch_name: student.batch_name,
          attendance_status: existing?.status || null,
          existing_attendance_id: existing?.id
        }
      })

      setStudents(studentsWithAttendance)
    } catch (err: any) {
      console.error('Error loading students:', err)
      setError(`Failed to load students: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const markAttendance = (studentId: string, batchId: string, status: 'PRESENT' | 'ABSENT' | null) => {
    setStudents(prev =>
      prev.map(s =>
        s.student_id === studentId && s.batch_id === batchId
          ? { ...s, attendance_status: status }
          : s
      )
    )
  }

  const saveAllAttendance = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('zendbx_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Group attendance by batch
      const batchGroups = new Map<string, typeof students>()
      students.forEach(student => {
        if (student.attendance_status) {
          if (!batchGroups.has(student.batch_id)) {
            batchGroups.set(student.batch_id, [])
          }
          batchGroups.get(student.batch_id)!.push(student)
        }
      })

      if (batchGroups.size === 0) {
        setError('Please mark at least one student')
        return
      }

      // Submit attendance for each batch
      let totalMarked = 0
      const errors = []

      for (const [batchId, batchStudents] of batchGroups) {
        const attendanceRecords = batchStudents.map(s => ({
          student_id: s.student_id,
          status: s.attendance_status!
        }))

        try {
          const response = await fetch(
            `${API_URL}/api/attendance/admin/batches/${batchId}/attendance`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                class_date: selectedDate,
                attendance: attendanceRecords,
                marked_by: 'admin'
              })
            }
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to save' }))
            throw new Error(errorData.detail || `Server error: ${response.status}`)
          }

          const result = await response.json()
          totalMarked += result.marked_count || attendanceRecords.length
        } catch (err: any) {
          errors.push(`Batch ${batchStudents[0].batch_name}: ${err.message}`)
        }
      }

      if (errors.length > 0) {
        setError(`Some batches failed: ${errors.join('; ')}`)
      }

      if (totalMarked > 0) {
        setSuccess(`Attendance saved successfully! ${totalMarked} student${totalMarked !== 1 ? 's' : ''} marked.`)
        // Reload to show updated attendance
        await loadStudentsAndAttendance()
      }

    } catch (err: any) {
      console.error('Error saving attendance:', err)
      setError(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_ref_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.batch_name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Sort by student_id (ART1001, ART1002, etc.)
    return a.student_id.localeCompare(b.student_id, undefined, { numeric: true })
  })

  const stats = {
    total: filteredStudents.length,
    present: filteredStudents.filter(s => s.attendance_status === 'PRESENT').length,
    absent: filteredStudents.filter(s => s.attendance_status === 'ABSENT').length,
    unmarked: filteredStudents.filter(s => !s.attendance_status).length
  }

  if (loading && batches.length === 0) {
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
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-art-indigo" />
          Mark Attendance
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Manually mark attendance for students
        </p>
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
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Class Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

          {/* Batch Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Students</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-sm text-green-700 mb-1">Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-sm text-red-700 mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <p className="text-sm text-yellow-700 mb-1">Unmarked</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.unmarked}</p>
        </div>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-600">No students found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery ? 'Try adjusting your search' : 'No students enrolled in selected batch(es)'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr
                      key={`${student.student_id}-${student.batch_id}`}
                      className={`hover:bg-gray-50 ${
                        student.attendance_status === 'PRESENT'
                          ? 'bg-green-50'
                          : student.attendance_status === 'ABSENT'
                          ? 'bg-red-50'
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                          <div className="text-xs text-gray-500">{student.student_ref_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.batch_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => markAttendance(student.student_id, student.batch_id, 'PRESENT')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              student.attendance_status === 'PRESENT'
                                ? 'bg-green-600 text-white'
                                : 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Present
                          </button>
                          <button
                            onClick={() => markAttendance(student.student_id, student.batch_id, 'ABSENT')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              student.attendance_status === 'ABSENT'
                                ? 'bg-red-600 text-white'
                                : 'bg-white border-2 border-red-600 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <XCircle className="w-4 h-4 inline mr-1" />
                            Absent
                          </button>
                          {student.attendance_status && (
                            <button
                              onClick={() => markAttendance(student.student_id, student.batch_id, null)}
                              className="px-3 py-2 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                              title="Clear"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveAllAttendance}
              disabled={saving || stats.present + stats.absent === 0}
              className="bg-art-indigo hover:bg-art-indigo/90 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save Attendance ({stats.present + stats.absent})
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
