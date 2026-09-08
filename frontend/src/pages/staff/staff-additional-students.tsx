import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Users, CheckCircle, XCircle, AlertCircle, Save, Loader2, X, ChevronRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface StudentBatch {
  student_id: string
  batch_id: string
  batch_name: string
  is_additional_class: boolean
}

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  batches: StudentBatch[]
}

interface SelectedBatchAttendance {
  student_id: string
  batch_id: string
  batch_name: string
  status: 'PRESENT' | 'ABSENT' | null
}

export default function StaffAdditionalStudents() {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<Student[]>([])
  const [allBatches, setAllBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalAttendance, setModalAttendance] = useState<SelectedBatchAttendance[]>([])

  useEffect(() => {
    loadAdditionalStudents()
  }, [])

  const loadAdditionalStudents = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (!user?.id) {
        setError('User not authenticated')
        return
      }

      // Load all students with their batches
      const studentsResponse = await fetch(
        `${API_URL}/api/staff/additional-students?user_id=${user.id}`
      )

      if (!studentsResponse.ok) {
        throw new Error('Failed to load students')
      }

      const studentsData = await studentsResponse.json()
      const rawStudents = studentsData.students || []

      // Load ALL available batches
      const batchesResponse = await fetch(
        `${API_URL}/api/staff/my-batches?user_id=${user.id}`
      )

      if (batchesResponse.ok) {
        const batchesData = await batchesResponse.json()
        setAllBatches(batchesData.batches || [])
      }

      // Group students by student_id
      const studentMap = new Map<string, Student>()

      rawStudents.forEach((s: any) => {
        if (!studentMap.has(s.student_id)) {
          studentMap.set(s.student_id, {
            id: s.id,
            student_id: s.student_id,
            first_name: s.first_name,
            last_name: s.last_name,
            batches: []
          })
        }

        const student = studentMap.get(s.student_id)!
        student.batches.push({
          student_id: s.student_id,
          batch_id: s.batch_id,
          batch_name: s.batch_name,
          is_additional_class: s.is_additional_class
        })
      })

      // Show ALL students (both those with and without additional classes)
      // Frontend will highlight which batches are additional
      const groupedStudents = Array.from(studentMap.values())
      setStudents(groupedStudents)

      if (groupedStudents.length === 0) {
        setError('No students found')
      }

    } catch (err: any) {
      console.error('Error loading students:', err)
      setError(err.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student)
    setShowModal(true)
    // Initialize attendance state for ALL available batches (not just student's current batches)
    setModalAttendance(
      allBatches.map(batch => ({
        student_id: student.student_id,
        batch_id: batch.id,
        batch_name: batch.name,
        status: null
      }))
    )
  }

  const handleCloseModal = () => {
    setSelectedStudent(null)
    setShowModal(false)
    setModalAttendance([])
  }

  const markBatchAttendance = (batchId: string, status: 'PRESENT' | 'ABSENT' | null) => {
    setModalAttendance(prev =>
      prev.map(a =>
        a.batch_id === batchId ? { ...a, status } : a
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

      const attendanceRecords = modalAttendance.filter(a => a.status !== null)

      console.log('=== SAVING ATTENDANCE ===')
      console.log('User ID:', user.id)
      console.log('Records to save:', attendanceRecords)

      if (attendanceRecords.length === 0) {
        setError('Please mark at least one batch')
        return
      }

      // Submit attendance
      const response = await fetch(
        `${API_URL}/api/staff/additional-students/attendance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            attendance: attendanceRecords,
          }),
        }
      )

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.detail || 'Failed to save attendance')
      }

      const result = await response.json()
      console.log('Success response:', result)

      // Check if there are errors
      if (result.errors && result.errors.length > 0) {
        console.error('Backend errors:', result.errors)
        setError(`Errors: ${result.errors.join(', ')}`)
        setSaving(false)
        return
      }

      if (result.saved === 0) {
        setError('No attendance records were saved. Check console for details.')
        setSaving(false)
        return
      }

      setSuccess(`Attendance saved for ${result.saved} batch(es)`)
      
      // Close modal and reload
      handleCloseModal()
      setTimeout(() => {
        setSuccess('')
        loadAdditionalStudents()
      }, 2000)

    } catch (err: any) {
      console.error('Error saving attendance:', err)
      setError(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const getTotalAdditionalBatches = () => {
    return students.reduce((total, student) => {
      return total + student.batches.filter(b => b.is_additional_class).length
    }, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-7 w-7 text-art-indigo" />
          All Students - Additional Classes
        </h1>
        <p className="text-muted-foreground mt-1">
          Click on any student to view their batches and mark attendance
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-art-indigo" />
        </div>
      )}

      {/* Stats */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold text-foreground">{students.length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <p className="text-sm text-purple-700">Additional Class Batches</p>
            <p className="text-2xl font-bold text-purple-900">{getTotalAdditionalBatches()}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-700">Click to Mark Attendance</p>
            <p className="text-2xl font-bold text-blue-900">→</p>
          </div>
        </div>
      )}

      {/* Students List */}
      {!loading && students.length > 0 && (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.student_id}
              className="bg-white rounded-lg border border-border p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleStudentClick(student)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-lg">
                      {student.first_name} {student.last_name}
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-300">
                      {student.student_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm text-muted-foreground">
                      {student.batches.length} batch{student.batches.length !== 1 ? 'es' : ''}
                    </p>
                    {student.batches.some(b => b.is_additional_class) && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full border border-purple-200">
                        {student.batches.filter(b => b.is_additional_class).length} Additional
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && students.length === 0 && !error && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No students found in your batches
          </p>
        </div>
      )}

      {/* Student Detail Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedStudent.student_id}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg mb-4">
                All Available Batches - Mark Attendance
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select any batch to mark attendance for this student
              </p>

              {allBatches.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No batches available
                  </p>
                </div>
              ) : (
                allBatches.map((batch) => {
                  const attendance = modalAttendance.find(a => a.batch_id === batch.id)
                  
                  // Check if this batch is assigned to the student
                  const isAssignedBatch = selectedStudent.batches.some(b => b.batch_id === batch.id)
                  const isAdditionalClass = selectedStudent.batches.find(b => b.batch_id === batch.id)?.is_additional_class
                  
                  return (
                    <div
                      key={batch.id}
                      className={`border-2 rounded-lg p-4 ${
                        isAdditionalClass
                          ? 'border-purple-200 bg-purple-50' 
                          : isAssignedBatch
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">
                              {batch.name}
                            </h4>
                            {isAdditionalClass ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full border border-purple-200">
                                Additional Class
                              </span>
                            ) : isAssignedBatch ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">
                                Regular Batch
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-300">
                                Available
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {batch.day_of_week} • {batch.start_time} - {batch.end_time}
                          </p>
                        </div>
                      </div>

                      {/* Attendance Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => markBatchAttendance(batch.id, 'PRESENT')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            attendance?.status === 'PRESENT'
                              ? 'bg-green-500 border-green-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                          }`}
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Present</span>
                        </button>

                        <button
                          onClick={() => markBatchAttendance(batch.id, 'ABSENT')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            attendance?.status === 'ABSENT'
                              ? 'bg-red-500 border-red-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                          }`}
                        >
                          <XCircle className="h-5 w-5" />
                          <span className="font-medium">Absent</span>
                        </button>

                        {attendance?.status && (
                          <button
                            onClick={() => markBatchAttendance(batch.id, null)}
                            className="px-4 py-3 rounded-lg border-2 bg-white border-gray-300 text-gray-700 hover:border-gray-400 transition-all"
                          >
                            <span className="font-medium">Clear</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border sticky bottom-0 bg-white">
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAttendance}
                disabled={saving || modalAttendance.every(a => a.status === null)}
                className="px-6 py-3 rounded-lg bg-art-indigo text-white hover:bg-art-indigo/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
